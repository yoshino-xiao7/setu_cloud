import type { MessageApi } from 'naive-ui'
import type { CollectionInfoDTO } from '@/api/collections'
import type { SetuImageItem } from '@/api/setu'
import { ref, shallowRef } from 'vue'
import { addToCollection, listMyCollections } from '@/api/collections'
import { addFavorite } from '@/api/favorite'
import { unwrapApiList } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useRequestGuard } from '@/composables/useRequestGuard'

export interface PointsCallFavoriteCollection {
  id: number
  name: string
  isDefault: boolean
  visibility: number
}

export interface UsePointsCallFavoritesOptions {
  message: MessageApi
}

export function usePointsCallFavorites(options: UsePointsCallFavoritesOptions) {
  const collectionsGuard = useRequestGuard()
  const favModal = ref(false)
  const favLoading = ref(false)
  const favCollections = shallowRef<PointsCallFavoriteCollection[]>([])
  const favSelectedId = ref<number | null>(null)
  const favTarget = ref<SetuImageItem | null>(null)

  async function loadCollectionsOnce() {
    if (favCollections.value.length)
      return

    const requestId = collectionsGuard.next()
    const res = await listMyCollections()
    if (!collectionsGuard.isCurrent(requestId))
      return

    const collections = unwrapApiList<CollectionInfoDTO>(res)
    favCollections.value = collections.map(collection => ({
      id: Number(collection.id),
      name: collection.name,
      isDefault: !!collection.isDefault,
      visibility: Number(collection.visibility ?? 0),
    }))
  }

  async function openFav(item: SetuImageItem) {
    favTarget.value = item
    favModal.value = true
    try {
      await loadCollectionsOnce()
      const defaultCollection = favCollections.value.find(collection => collection.isDefault)
      favSelectedId.value = defaultCollection?.id ?? (favCollections.value[0]?.id ?? null)
    }
    catch {
      options.message.error('加载收藏夹失败')
    }
  }

  async function submitFav() {
    const item = favTarget.value
    if (!item)
      return
    if (!favSelectedId.value)
      return options.message.warning('请选择一个收藏夹')

    favLoading.value = true
    try {
      const collection = favCollections.value.find(entry => entry.id === favSelectedId.value)
      if (!collection)
        return options.message.warning('收藏夹不存在')

      const pid = Number(item.pid)
      const page = Number(item.p ?? 0)

      if (collection.isDefault)
        await addFavorite(pid, page)
      else
        await addToCollection(collection.id, pid, page)

      options.message.success(`已收藏到「${collection.name}」`)
      favModal.value = false
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '收藏失败')
    }
    finally {
      favLoading.value = false
    }
  }

  return {
    favCollections,
    favLoading,
    favModal,
    favSelectedId,
    favTarget,
    openFav,
    submitFav,
  }
}
