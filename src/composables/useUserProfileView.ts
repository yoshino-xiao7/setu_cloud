import type { MessageApi } from 'naive-ui'
import type { Router } from 'vue-router'
import type { SquareCollectionDTO } from '@/api/collections'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSquareCollections } from '@/api/collections'
import { IMAGE_CDN_URL } from '@/api/env'
import { unwrapApiData } from '@/api/response'
import { useUserProfileSeo } from '@/composables/useSeo'
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
  const loading = ref(false)
  const collections = ref<SquareCollectionDTO[]>([])
  const userInfo = ref({
    nickname: '',
    avatar: '',
  })
  const pagination = ref({ page: 1, size: 12, total: 0 })
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

  onMounted(() => {
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
