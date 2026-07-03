import type { MessageApi } from 'naive-ui'
import type { SquareCollectionDTO, SquarePageResult } from '@/api/collections'
import { computed, reactive, ref, shallowRef } from 'vue'
import {
  favoriteSquareCollection,
  getSquareCollections,
  likeSquareCollection,
  unfavoriteSquareCollection,
  unlikeSquareCollection,
} from '@/api/collections'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import {
  normalizePreviewImages,
  normalizeTags,
} from '@/composables/useCollectionSquareViewHelpers'
import { useRequestGuard } from '@/composables/useRequestGuard'

type CollectionSquareSort = 'hot' | 'new' | 'like'

interface CollectionSquareDataOptions {
  message: MessageApi
}

export function useCollectionSquareData(options: CollectionSquareDataOptions) {
  const collectionsGuard = useRequestGuard()
  const keyword = ref('')
  const sortType = ref<CollectionSquareSort>('hot')
  const loading = ref(false)
  const collections = shallowRef<SquareCollectionDTO[]>([])
  const pagination = reactive({
    page: 1,
    size: 20,
    total: 0,
  })

  const featuredCollections = computed(() => collections.value.slice(0, 3))
  const heroCollection = computed(() => featuredCollections.value[0] || null)
  const totalImageCount = computed(() => collections.value.reduce((sum, item) => sum + (item.itemCount || 0), 0))
  const totalInteractionCount = computed(() => collections.value.reduce(
    (sum, item) => sum + (item.likeCount || 0) + (item.favoriteCount || 0),
    0,
  ))

  async function fetchCollections() {
    const requestId = collectionsGuard.next()
    loading.value = true
    try {
      const res = await getSquareCollections({
        page: pagination.page,
        size: pagination.size,
        sort: sortType.value,
        keyword: keyword.value.trim() || undefined,
      })
      if (!collectionsGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<SquarePageResult>(res, { page: 1, size: 24, total: 0, items: [] })
      const listData = data.list || data.items || data.records || []

      collections.value = listData.map(normalizeSquareCollection)
      pagination.total = data.total || 0
    }
    catch (error: unknown) {
      if (!collectionsGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '加载广场失败')
    }
    finally {
      if (collectionsGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  function handleSearch() {
    pagination.page = 1
    fetchCollections()
  }

  function handleSortChange() {
    pagination.page = 1
    fetchCollections()
  }

  function handlePageChange(page: number) {
    pagination.page = page
    fetchCollections()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleLike(item: SquareCollectionDTO) {
    try {
      if (item.isLiked) {
        await unlikeSquareCollection(item.id)
        patchCollection(item.id, {
          isLiked: false,
          likeCount: Math.max(0, item.likeCount - 1),
        })
        options.message.success('已取消点赞')
        return
      }

      await likeSquareCollection(item.id)
      patchCollection(item.id, {
        isLiked: true,
        likeCount: item.likeCount + 1,
      })
      options.message.success('点赞成功')
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '操作失败', { messagePrefix: '点赞失败: ' })
    }
  }

  async function handleFavorite(item: SquareCollectionDTO) {
    try {
      if (item.isFavorited) {
        await unfavoriteSquareCollection(item.id)
        patchCollection(item.id, {
          isFavorited: false,
          favoriteCount: Math.max(0, item.favoriteCount - 1),
        })
        options.message.success('已取消收藏')
        return
      }

      await favoriteSquareCollection(item.id)
      patchCollection(item.id, {
        isFavorited: true,
        favoriteCount: item.favoriteCount + 1,
      })
      options.message.success('收藏成功')
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '操作失败', { messagePrefix: '收藏失败: ' })
    }
  }

  return {
    collections,
    featuredCollections,
    fetchCollections,
    handleFavorite,
    handleLike,
    handlePageChange,
    handleSearch,
    handleSortChange,
    heroCollection,
    keyword,
    loading,
    pagination,
    sortType,
    totalImageCount,
    totalInteractionCount,
  }

  function patchCollection(id: number, patch: Partial<SquareCollectionDTO>) {
    collections.value = collections.value.map(item => (
      item.id === id ? { ...item, ...patch } : item
    ))
  }
}

function normalizeSquareCollection(item: SquareCollectionDTO): SquareCollectionDTO {
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    coverPid: item.coverPid,
    coverP: item.coverP || 0,
    coverUrl: item.coverUrl,
    userId: item.userId || item.ownerId,
    ownerNickname: item.ownerNickname || '匿名用户',
    ownerAvatarUrl: item.ownerAvatarUrl || null,
    itemCount: item.itemCount ?? 0,
    shareViewCount: item.shareViewCount ?? 0,
    likeCount: item.shareLikeCount ?? item.likeCount ?? 0,
    favoriteCount: item.shareFavCount ?? item.favoriteCount ?? 0,
    isLiked: !!item.likedByMe,
    isFavorited: !!item.favoritedByMe,
    previewImages: normalizePreviewImages(item),
    tags: normalizeTags(item),
    themeTags: item.themeTags,
    curatorNote: item.curatorNote,
    scoreReason: item.scoreReason,
    recentItemCount: item.recentItemCount,
    ownerCollectionCount: item.ownerCollectionCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    shareCreatedAt: item.shareCreatedAt,
  }
}
