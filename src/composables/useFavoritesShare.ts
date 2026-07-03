import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type { Router } from 'vue-router'
import type { FavoriteCollection } from '@/composables/useFavoritesCollections'
import { computed, ref } from 'vue'
import {
  shareToSquare,
  unshareFromSquare,
} from '@/api/collections'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { safePush } from '@/utils/navigation'

interface FavoritesShareOptions {
  message: MessageApi
  patchCollection: (id: number, patch: Partial<FavoriteCollection>) => void
  router: Router
  selectedCollection: ComputedRef<FavoriteCollection | null>
}

export function useFavoritesShare(options: FavoritesShareOptions) {
  const showShare = ref(false)
  const shareToSquareLoading = ref(false)
  const isSharedToSquare = ref(false)

  const shareUrl = computed(() => {
    const collection = options.selectedCollection.value
    if (!collection?.id)
      return ''

    const href = options.router.resolve({
      name: 'PublicCollection',
      params: { id: collection.id },
    }).href

    return new URL(href, window.location.origin).toString()
  })

  const canShare = computed(() => {
    const collection = options.selectedCollection.value
    return !!collection && !collection.isDefault && Number(collection.visibility) === 1
  })

  function openShare() {
    if (!canShare.value) {
      options.message.warning('只能分享“公开”的非默认收藏夹（先在编辑里改为公开）')
      return
    }
    showShare.value = true
  }

  async function copyShare() {
    if (!shareUrl.value)
      return
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      options.message.success('分享链接已复制')
    }
    catch {
      options.message.error('复制失败，请手动复制链接')
    }
  }

  function openShareLink() {
    if (!shareUrl.value)
      return
    window.open(shareUrl.value, '_blank')
  }

  function updateSharedStatus() {
    const collection = options.selectedCollection.value
    isSharedToSquare.value = collection?.isShared ?? false
  }

  async function handleShareToSquare() {
    const collection = options.selectedCollection.value
    if (!collection)
      return
    if (!canShare.value) {
      options.message.warning('只有公开的非默认收藏夹才能分享到广场')
      return
    }

    shareToSquareLoading.value = true
    try {
      if (isSharedToSquare.value) {
        await unshareFromSquare(collection.id)
        isSharedToSquare.value = false
        options.patchCollection(collection.id, { isShared: false })
        options.message.success('已取消分享到广场')
        return
      }

      await shareToSquare(collection.id)
      isSharedToSquare.value = true
      options.patchCollection(collection.id, { isShared: true })
      options.message.success('已分享到广场，其他用户现在可以发现你的收藏夹了！')
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '操作失败')
    }
    finally {
      shareToSquareLoading.value = false
    }
  }

  function viewSquare() {
    void safePush(options.router, '/dashboard/square')
  }

  return {
    canShare,
    copyShare,
    handleShareToSquare,
    isSharedToSquare,
    openShare,
    openShareLink,
    shareToSquareLoading,
    shareUrl,
    showShare,
    updateSharedStatus,
    viewSquare,
  }
}
