import type { MessageApi } from 'naive-ui'
import type { Router } from 'vue-router'
import type { SquareCollectionDTO } from '@/api/collections'
import { computed, onMounted, onServerPrefetch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSquareCollections } from '@/api/collections'
import { IMAGE_CDN_URL } from '@/api/env'
import { unwrapApiData } from '@/api/response'
import { useUserProfileSeo } from '@/composables/useSeo'
import { usePublicShareStore } from '@/stores/publicShare'
import { safePush } from '@/utils/navigation'

export interface UseUserProfileViewOptions {
  message: MessageApi
  router: Router
}

interface SquareCollectionListPayload {
  list?: SquareCollectionDTO[]
  items?: SquareCollectionDTO[]
  records?: SquareCollectionDTO[]
}

export function useUserProfileView(options: UseUserProfileViewOptions) {
  const route = useRoute()
  const userId = computed(() => Number(route.params.userId))
  const shareStore = usePublicShareStore()
  // SSG 预渲染的数据经 initialState 在客户端 hydration 时还原，
  // setup 同步阶段就以它初始化，保证预渲染 HTML 与客户端首渲一致
  const prefetched = shareStore.userProfiles[userId.value]
  const loading = ref(!prefetched)
  const collections = ref<SquareCollectionDTO[]>(prefetched?.collections || [])
  const userInfo = ref({
    nickname: prefetched?.nickname || '',
    avatar: prefetched?.avatar || '',
  })
  const pagination = ref({ page: 1, size: 12, total: prefetched?.total ?? 0 })
  const nicknameForSeo = computed(() => userInfo.value.nickname || '用户')
  useUserProfileSeo(nicknameForSeo)

  async function fetchUserCollections() {
    if (!userId.value)
      return

    loading.value = true
    try {
      const res = await getSquareCollections({
        page: pagination.value.page,
        size: pagination.value.size,
        keyword: undefined,
      })

      const data = unwrapApiData<SquareCollectionListPayload>(res, {})
      const listData = data.list || data.items || data.records || []
      collections.value = listData.filter(item => item.userId === userId.value)

      const firstItem = collections.value[0] || listData.find(item => item.userId === userId.value) || listData[0]
      if (firstItem) {
        userInfo.value = {
          nickname: firstItem.ownerNickname || `用户#${userId.value}`,
          avatar: firstItem.ownerAvatarUrl || '',
        }
      }

      pagination.value.total = collections.value.length

      // 写入预取存根：SSG 时随 initialState 序列化，客户端 hydration 后复用
      shareStore.userProfiles[userId.value] = {
        nickname: userInfo.value.nickname,
        avatar: userInfo.value.avatar,
        collections: collections.value,
        total: pagination.value.total,
      }
    }
    catch {
      options.message.error('加载用户收藏夹失败')
    }
    finally {
      loading.value = false
    }
  }

  function goBack() {
    options.router.back()
  }

  function viewDetail(item: SquareCollectionDTO) {
    void safePush(options.router, `/dashboard/collection/${item.id}`)
  }

  function getCoverUrl(item: SquareCollectionDTO) {
    if (item.coverUrl)
      return item.coverUrl

    if (item.coverPid) {
      const p = item.coverP || 0
      return `${IMAGE_CDN_URL}/c/600x600_90/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
    }

    return ''
  }

  // SSG 构建期间预取数据，renderToString 会等待其完成，产出含真实内容的 HTML
  onServerPrefetch(fetchUserCollections)

  onMounted(() => {
    // 客户端 hydration 已有预取数据时跳过首次拉取，避免重复请求与内容闪烁
    if (prefetched)
      return
    void fetchUserCollections()
  })

  return {
    collections,
    getCoverUrl,
    goBack,
    loading,
    pagination,
    userInfo,
    viewDetail,
  }
}
