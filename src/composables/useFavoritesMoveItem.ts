import type { MessageApi } from 'naive-ui'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type {
  FavoriteCollection,
  FavoriteImageItem,
} from '@/composables/useFavoritesCollections'
import { computed, ref } from 'vue'
import {
  addToCollection,
  removeFromCollection,
} from '@/api/collections'
import { removeFavorite } from '@/api/favorite'

interface FavoritesMoveItemOptions {
  collections: ShallowRef<FavoriteCollection[]>
  message: MessageApi
  removeItemFromCurrentList: (item: FavoriteImageItem) => void
  selectedCollectionId: Ref<number | null>
  selectedIsDefault: ComputedRef<boolean>
}

export function useFavoritesMoveItem(options: FavoritesMoveItemOptions) {
  const showMove = ref(false)
  const moving = ref(false)
  const moveMode = ref<'copy' | 'move'>('move')
  const moveTargetId = ref<number | null>(null)
  const movingItem = ref<FavoriteImageItem | null>(null)

  const moveTargetOptions = computed(() => {
    const curId = options.selectedCollectionId.value
    return options.collections.value
      .filter(collection => collection.id !== curId)
      .map(collection => ({
        label: collection.isDefault ? `⭐ ${collection.name}` : collection.name,
        value: collection.id,
      }))
  })

  function openMoveModal(item: FavoriteImageItem) {
    if (!options.selectedCollectionId.value)
      return
    if (moveTargetOptions.value.length === 0) {
      options.message.warning('你还没有其它收藏夹，先新建一个吧')
      return
    }

    movingItem.value = item
    moveMode.value = 'move'
    moveTargetId.value = moveTargetOptions.value[0]?.value ?? null
    showMove.value = true
  }

  async function submitMove() {
    const curId = options.selectedCollectionId.value
    const toId = moveTargetId.value
    const item = movingItem.value
    if (!curId || !toId || !item)
      return

    moving.value = true
    try {
      await addToCollection(toId, item.pid, item.p)

      if (moveMode.value === 'move') {
        if (options.selectedIsDefault.value)
          await removeFavorite(item.pid, item.p)
        else
          await removeFromCollection(curId, item.pid, item.p)

        options.removeItemFromCurrentList(item)
        options.message.success('已移动到目标收藏夹')
      }
      else {
        options.message.success('已复制到目标收藏夹')
      }

      showMove.value = false
    }
    catch {
      options.message.error('操作失败（请确认 /collections/{id}/items/{pid}/{p} 可用）')
    }
    finally {
      moving.value = false
    }
  }

  return {
    moveMode,
    moveTargetId,
    moveTargetOptions,
    moving,
    movingItem,
    openMoveModal,
    showMove,
    submitMove,
  }
}
