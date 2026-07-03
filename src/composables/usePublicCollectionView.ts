import type { CollectionInfoDTO, CollectionItemDTO, CollectionItemPageDTO, SquareCollectionDTO } from '@/api/collections'
import { useMessage } from 'naive-ui'
import { computed, nextTick, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildPublicCollectionUrl, getCollectionInfo, getCollectionItems } from '@/api/collections'
import { IMAGE_CDN_URL, SITE_URL } from '@/api/env'
import { unwrapApiData } from '@/api/response'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { useCollectionSeo } from '@/composables/useSeo'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

interface CollectionImageView {
  pid: number
  p: number
  title: string
  author: string
  url: string
  originalUrl: string
  aspectRatio: number
}

export function usePublicCollectionView() {
  const route = useRoute()
  const router = useRouter()
  const message = useMessage()
  const auth = useAuthStore()
  const infoGuard = useRequestGuard()
  const itemsGuard = useRequestGuard()

  const siteHost = computed(() => {
    try {
      return new URL(SITE_URL).host
    }
    catch {
      return SITE_URL
    }
  })

  const isLoggedIn = computed(() => !!auth.user)
  const id = computed(() => Number(route.params.id))
  const loadingInfo = ref(true)
  const info = ref<CollectionInfoDTO | null>(null)
  const loading = ref(true)
  const list = shallowRef<CollectionImageView[]>([])
  const pagination = reactive({ page: 1, size: 24, total: 0 })

  const isPublic = computed(() => Number(info.value?.visibility ?? 0) === 1)
  const similarCollections = computed(() => (
    info.value?.similarCollections?.filter(item => item.id !== id.value).slice(0, 3) || []
  ))

  const ownerName = computed(() => {
    const nick = info.value?.ownerNickname?.trim()
    if (nick)
      return nick
    const uid = info.value?.userId
    return uid ? `用户#${uid}` : '用户'
  })

  const ownerAvatar = computed(() => {
    const url = info.value?.ownerAvatarUrl
    if (!url)
      return ''
    if (url.startsWith('http'))
      return url
    return `${location.origin}${url}`
  })

  const collectionName = computed(() => info.value?.name || '公开收藏夹')
  const imageCount = computed(() => info.value?.itemCount ?? 0)
  useCollectionSeo(collectionName, imageCount)

  const showExportModal = ref(false)
  const exportLoading = ref(false)
  const exportPreview = ref('')
  const shareCardRef = ref<HTMLElement | null>(null)
  const qrCodeUrl = ref('')

  function goLogin() {
    void safePush(router, '/login')
  }

  function goRegister() {
    void safePush(router, '/register')
  }

  function goSquare() {
    if (isLoggedIn.value) {
      void safePush(router, '/dashboard/square')
      return
    }

    void safePush(router, {
      path: '/login',
      query: { redirect: '/dashboard/square' },
    })
  }

  function goPublicCollection(collectionId: number) {
    void safePush(router, `/c/${collectionId}`)
  }

  function getSimilarCoverUrl(item: SquareCollectionDTO) {
    if (item.coverUrl)
      return item.coverUrl

    if (item.coverPid)
      return `${IMAGE_CDN_URL}/c/600x600_90/img-master/img/${item.coverPid}_p${item.coverP || 0}_master1200.jpg`

    return ''
  }

  function getSimilarTags(item: SquareCollectionDTO) {
    const tags = [...(item.tags || []), ...(item.themeTags || [])]
      .map(tag => String(tag || '').trim())
      .filter(Boolean)
    return Array.from(new Set(tags)).slice(0, 3)
  }

  async function fetchInfo() {
    const requestId = infoGuard.next()
    loadingInfo.value = true
    try {
      const res = await getCollectionInfo(id.value)
      if (!infoGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<CollectionInfoDTO | null>(res, null)
      info.value = data || null
    }
    catch {
      if (!infoGuard.isCurrent(requestId))
        return
      info.value = null
      message.error('收藏夹不可访问（可能是私有或不存在）')
    }
    finally {
      if (infoGuard.isCurrent(requestId))
        loadingInfo.value = false
    }
  }

  async function fetchItems() {
    const requestId = itemsGuard.next()
    loading.value = true
    try {
      const res = await getCollectionItems(id.value, {
        page: pagination.page,
        size: pagination.size,
      })
      if (!itemsGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<CollectionItemPageDTO>(res, { page: 1, size: 24, total: 0, items: [] })
      const items = data.items || []
      pagination.total = data.total || 0

      list.value = items.map((it: CollectionItemDTO) => {
        const img = it.image || {}
        const width = img.width || 1
        const height = img.height || 1
        const aspectRatio = height / width

        return {
          pid: it.pid ?? img.pid,
          p: it.p ?? img.p ?? 0,
          title: img.title || '无标题',
          author: img.author || '未知画师',
          url: img.urlRegular || img.urlSmall || img.urlOriginal || '',
          originalUrl: img.urlOriginal || '',
          aspectRatio,
        }
      })
    }
    catch {
      if (!itemsGuard.isCurrent(requestId))
        return
      list.value = []
      pagination.total = 0
      message.error('加载收藏夹内容失败（可能是私有）')
    }
    finally {
      if (itemsGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  async function handlePageChange(page: number) {
    pagination.page = page
    await fetchItems()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCopyShare() {
    if (!info.value)
      return
    if (!isPublic.value) {
      message.warning('私有收藏夹无法分享，请先设置公开')
      return
    }
    const shareUrl = buildPublicCollectionUrl(id.value)
    await navigator.clipboard.writeText(shareUrl)
    message.success('分享链接已复制')
  }

  function handleViewOriginal(url: string) {
    if (url)
      window.open(url, '_blank')
    else message.warning('原图链接无效')
  }

  async function handleExportImage() {
    if (!info.value)
      return
    if (!isPublic.value) {
      message.warning('私有收藏夹无法导出')
      return
    }

    showExportModal.value = true
    exportLoading.value = true
    exportPreview.value = ''

    try {
      const shareUrl = buildPublicCollectionUrl(id.value)
      const [{ default: QRCode }, htmlToImage] = await Promise.all([
        import('qrcode'),
        import('html-to-image'),
      ])

      qrCodeUrl.value = await QRCode.toDataURL(shareUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#1f2937', light: '#ffffff' },
      })

      await nextTick()

      setTimeout(async () => {
        if (!shareCardRef.value)
          return

        try {
          exportPreview.value = await htmlToImage.toPng(shareCardRef.value, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
          })
        }
        catch {
          message.error('导出失败，请重试')
        }
        finally {
          exportLoading.value = false
        }
      }, 500)
    }
    catch {
      exportLoading.value = false
      message.error('生成二维码失败')
    }
  }

  function downloadExportImage() {
    if (!exportPreview.value)
      return
    const link = document.createElement('a')
    link.download = `收藏夹-${info.value?.name || id.value}.png`
    link.href = exportPreview.value
    link.click()
    message.success('图片已下载')
  }

  function getRowSpan(aspectRatio: number) {
    if (!aspectRatio || aspectRatio <= 0)
      return 20
    if (aspectRatio < 0.75)
      return 15
    if (aspectRatio < 1.2)
      return 20
    if (aspectRatio < 1.5)
      return 25
    if (aspectRatio < 2)
      return 30
    return Math.min(Math.ceil(aspectRatio * 20), 50)
  }

  async function reload() {
    pagination.page = 1
    await fetchInfo()
    if (info.value)
      await fetchItems()
  }

  onMounted(reload)
  watch(id, reload)

  return {
    downloadExportImage,
    exportLoading,
    exportPreview,
    getRowSpan,
    getSimilarCoverUrl,
    getSimilarTags,
    goLogin,
    goPublicCollection,
    goRegister,
    goSquare,
    handleCopyShare,
    handleExportImage,
    handlePageChange,
    handleViewOriginal,
    id,
    info,
    isLoggedIn,
    isPublic,
    list,
    loading,
    loadingInfo,
    ownerAvatar,
    ownerName,
    pagination,
    qrCodeUrl,
    shareCardRef,
    showExportModal,
    similarCollections,
    siteHost,
  }
}
