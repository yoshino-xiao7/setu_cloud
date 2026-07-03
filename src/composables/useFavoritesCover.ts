import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type {
  FavoriteCollection,
  FavoriteImageItem,
} from '@/composables/useFavoritesCollections'
import { ref } from 'vue'
import { setCover } from '@/api/collections'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface FavoritesCoverOptions {
  message: MessageApi
  selectedCollection: ComputedRef<FavoriteCollection | null>
}

export function useFavoritesCover(options: FavoritesCoverOptions) {
  const settingCover = ref(false)

  async function handleSetCover(item: FavoriteImageItem) {
    const collection = options.selectedCollection.value
    if (!collection)
      return
    if (collection.isDefault) {
      options.message.warning('默认收藏夹不支持设置封面')
      return
    }

    settingCover.value = true
    try {
      await setCover(collection.id, item.pid, item.p)
      options.message.success(`已设置「${item.title}」为封面`)
      if (collection.isShared)
        options.message.info('广场页面封面已同步更新')
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '设置封面失败')
    }
    finally {
      settingCover.value = false
    }
  }

  return {
    handleSetCover,
    settingCover,
  }
}
