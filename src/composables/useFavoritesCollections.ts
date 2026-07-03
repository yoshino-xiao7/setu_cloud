import type { MessageApi } from 'naive-ui'
import type { CollectionInfoDTO, CollectionItemDTO, CollectionItemPageDTO } from '@/api/collections'
import type { FavoriteItemDTO, FavoritePageDTO } from '@/api/favorite'
import { computed, reactive, ref, shallowRef } from 'vue'
import {
  getCollectionItems,
  listMyCollections,
  removeFromCollection,
} from '@/api/collections'
import { getFavoriteList, removeFavorite } from '@/api/favorite'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { useRequestGuard } from '@/composables/useRequestGuard'

export type FavoriteCollectionVisibility = 0 | 1

export interface FavoriteCollection {
  id: number
  name: string
  description?: string
  visibility: FavoriteCollectionVisibility
  isDefault: boolean
  isShared?: boolean
}

export interface FavoriteImageItem {
  favId: number
  pid: number
  p: number
  title: string
  author: string
  url: string
  originalUrl: string
  width: number
  height: number
  r18: boolean
}

interface FavoritesCollectionsOptions {
  message: MessageApi
  onCollectionSelectionSynced?: () => void
}

export function useFavoritesCollections(options: FavoritesCollectionsOptions) {
  const collectionsGuard = useRequestGuard()
  const itemsGuard = useRequestGuard()

  const colLoading = ref(false)
  const collections = shallowRef<FavoriteCollection[]>([])
  const selectedCollectionId = ref<number | null>(null)

  const loading = ref(true)
  const list = shallowRef<FavoriteImageItem[]>([])
  const pagination = reactive({
    page: 1,
    size: 24,
    total: 0,
  })

  const selectedCollection = computed(() => {
    if (!selectedCollectionId.value)
      return null
    return collections.value.find(collection => collection.id === selectedCollectionId.value) || null
  })
  const selectedIsDefault = computed(() => !!selectedCollection.value?.isDefault)

  async function fetchCollections() {
    const requestId = collectionsGuard.next()
    colLoading.value = true
    try {
      const res = await listMyCollections()
      if (!collectionsGuard.isCurrent(requestId))
        return

      const arr = unwrapApiList<CollectionInfoDTO>(res)
      collections.value = arr.map(normalizeCollection)
      syncSelectedCollection()
      options.onCollectionSelectionSynced?.()
    }
    catch {
      if (!collectionsGuard.isCurrent(requestId))
        return
      options.message.error('加载收藏夹失败（请确认 /collections/mine 正常）')
    }
    finally {
      if (collectionsGuard.isCurrent(requestId))
        colLoading.value = false
    }
  }

  async function fetchItems() {
    if (!selectedCollectionId.value)
      return

    const requestId = itemsGuard.next()
    const collectionId = selectedCollectionId.value
    const isDefault = selectedIsDefault.value
    loading.value = true

    try {
      if (isDefault) {
        const res = await getFavoriteList({ page: pagination.page, size: pagination.size })
        if (!itemsGuard.isCurrent(requestId))
          return

        const data = unwrapApiData<FavoritePageDTO>(res, { page: 1, size: 24, total: 0, items: [] })
        const items = data.items || data.records || []
        pagination.total = data.total || 0
        list.value = mapRowsToItems(items)
        return
      }

      const res = await getCollectionItems(collectionId, {
        page: pagination.page,
        size: pagination.size,
      })
      if (!itemsGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<CollectionItemPageDTO>(res, { page: 1, size: 24, total: 0, items: [] })
      const items = data.items || data.records || []
      pagination.total = data.total || 0
      list.value = mapRowsToItems(items)
    }
    catch {
      if (!itemsGuard.isCurrent(requestId))
        return
      options.message.error('加载收藏内容失败')
    }
    finally {
      if (itemsGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  async function refreshAll() {
    await fetchCollections()
    pagination.page = 1
    await fetchItems()
  }

  function handlePageChange(page: number) {
    pagination.page = page
    fetchItems()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleViewOriginal(url: string) {
    if (url)
      window.open(url, '_blank')
    else options.message.warning('原图链接无效')
  }

  async function handleRemoveFromCurrent(item: FavoriteImageItem) {
    if (!selectedCollectionId.value)
      return

    try {
      if (selectedIsDefault.value)
        await removeFavorite(item.pid, item.p)
      else
        await removeFromCollection(selectedCollectionId.value, item.pid, item.p)

      options.message.success('已移除')
      removeItemFromCurrentList(item)
    }
    catch {
      options.message.error('操作失败')
    }
  }

  async function selectCollection(id: number) {
    if (selectedCollectionId.value === id)
      return

    selectedCollectionId.value = id
    pagination.page = 1
    options.onCollectionSelectionSynced?.()
    await fetchItems()
  }

  function removeItemFromCurrentList(item: FavoriteImageItem) {
    list.value = list.value.filter(current => !(current.pid === item.pid && current.p === item.p))

    if (list.value.length === 0 && pagination.page > 1) {
      handlePageChange(pagination.page - 1)
      return
    }

    pagination.total = Math.max(0, pagination.total - 1)
  }

  function patchCollection(id: number, patch: Partial<FavoriteCollection>) {
    collections.value = collections.value.map(collection => (
      collection.id === id ? { ...collection, ...patch } : collection
    ))
  }

  return {
    colLoading,
    collections,
    fetchCollections,
    fetchItems,
    handlePageChange,
    handleRemoveFromCurrent,
    handleViewOriginal,
    list,
    loading,
    pagination,
    patchCollection,
    refreshAll,
    removeItemFromCurrentList,
    selectCollection,
    selectedCollection,
    selectedCollectionId,
    selectedIsDefault,
  }

  function syncSelectedCollection() {
    if (!selectedCollectionId.value) {
      const defaultCollection = collections.value.find(collection => collection.isDefault)
      selectedCollectionId.value = defaultCollection?.id ?? (collections.value[0]?.id ?? null)
      return
    }

    const stillExists = collections.value.some(collection => collection.id === selectedCollectionId.value)
    if (!stillExists) {
      const defaultCollection = collections.value.find(collection => collection.isDefault)
      selectedCollectionId.value = defaultCollection?.id ?? (collections.value[0]?.id ?? null)
    }
  }
}

function normalizeCollection(collection: CollectionInfoDTO): FavoriteCollection {
  return {
    id: Number(collection.id),
    name: collection.name,
    description: collection.description || '',
    visibility: Number(collection.visibility ?? 0) as FavoriteCollectionVisibility,
    isDefault: !!collection.isDefault,
    isShared: !!collection.isShared,
  }
}

function mapRowsToItems(items: (FavoriteItemDTO | CollectionItemDTO)[]) {
  return items.map((row): FavoriteImageItem => {
    const image = row.image || {}
    return {
      favId: row.itemId ?? row.favoriteId ?? 0,
      pid: row.pid ?? image.pid,
      p: row.p ?? image.p ?? 0,
      title: image.title || '无标题',
      author: image.author || '未知画师',
      url: image.urlRegular || image.urlSmall || image.urlOriginal || '',
      originalUrl: image.urlOriginal || '',
      width: image.width || 0,
      height: image.height || 0,
      r18: Number(image.r18) === 1,
    }
  })
}
