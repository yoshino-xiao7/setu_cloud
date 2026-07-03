import type { Ref } from 'vue'
import type {
  GalleryUploadInitRequest,
  GalleryUploadInitResponse,
  GalleryUploadPreparedItem,
} from '@/api/galleryUpload'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { ref } from 'vue'
import {
  createGalleryUploadBatch,
  fetchMyGalleryUploadBatchDetail,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { applyPreparedGalleryUploadItems } from '@/utils/galleryUploadPrepared'
import { createClientItemId, createUploadIntentKey } from '@/utils/uploadIntentKey'

export interface UseGalleryUploadSessionOptions {
  createInitRequest: () => GalleryUploadInitRequest
  onRecoverDraftBatchError: (message: string) => void
  onResetExpiredUploadDraft: (message: string) => void
  saveUploadDraft: () => void
  uploadItems: Ref<LocalUploadItem[]>
}

export function useGalleryUploadSession(options: UseGalleryUploadSessionOptions) {
  const activeInitResponse = ref<GalleryUploadInitResponse | null>(null)
  const activeBatchId = ref<number | null>(null)
  const uploadIntentKey = ref(createUploadIntentKey())
  const createBatchAttempted = ref(false)

  function resetUploadIntentKey() {
    uploadIntentKey.value = createUploadIntentKey()
    createBatchAttempted.value = false
    activeInitResponse.value = null
    activeBatchId.value = null
  }

  function clearItemUploadSession(item: LocalUploadItem, renewClientItem = false): LocalUploadItem {
    return {
      ...item,
      clientItemId: renewClientItem ? createClientItemId() : item.clientItemId,
      progress: 0,
      status: 'pending',
      uploadStatus: undefined,
      submissionId: undefined,
      objectKey: undefined,
      etag: undefined,
      error: undefined,
    }
  }

  function isExpiredUploadStatus(status?: string | null) {
    return status === 'EXPIRED'
  }

  function resetExpiredUploadDraft(messageText = '上传已过期，请重新投稿') {
    options.uploadItems.value = options.uploadItems.value.map(item => clearItemUploadSession(item, true))
    resetUploadIntentKey()
    options.onResetExpiredUploadDraft(`${messageText}。已保留已选图片和填写内容，并已生成新的投稿批次标识，可直接重新提交。`)
    options.saveUploadDraft()
  }

  function renewUploadIntentAfterEdit(canRenew: boolean) {
    if (!canRenew || !createBatchAttempted.value)
      return

    options.uploadItems.value = options.uploadItems.value.map(item => clearItemUploadSession(item, true))
    resetUploadIntentKey()
  }

  function isInitResponseExpiring(initResponse: GalleryUploadInitResponse) {
    const expirationTimes = [
      Date.parse(initResponse.credentials.expiration),
      Date.parse(initResponse.uploadPolicy.expiresAt),
    ].filter(Number.isFinite)

    if (expirationTimes.length === 0)
      return false

    return Math.min(...expirationTimes) - Date.now() < 60_000
  }

  function assertInitResponseNotExpired(initResponse: GalleryUploadInitResponse) {
    if (!isExpiredUploadStatus(initResponse.status))
      return

    const messageText = '上传窗口已过期，请重新投稿'
    resetExpiredUploadDraft(messageText)
    throw new Error(messageText)
  }

  function applyPreparedItemsToLocal(items: GalleryUploadInitResponse['items']) {
    options.uploadItems.value = applyPreparedGalleryUploadItems(options.uploadItems.value, items, {
      isExpiredStatus: isExpiredUploadStatus,
      expiredErrorMessage: '上传已过期，请重新投稿',
      failedErrorMessage: '上传失败',
    })
  }

  async function ensureInitResponse() {
    if (activeInitResponse.value && !isInitResponseExpiring(activeInitResponse.value)) {
      assertInitResponseNotExpired(activeInitResponse.value)
      return activeInitResponse.value
    }

    createBatchAttempted.value = true
    const initResponse = unwrapApiData(await createGalleryUploadBatch(options.createInitRequest(), {
      idempotencyKey: uploadIntentKey.value,
    }))
    assertInitResponseNotExpired(initResponse)
    activeInitResponse.value = initResponse
    activeBatchId.value = initResponse.batchId
    applyPreparedItemsToLocal(initResponse.items)
    options.saveUploadDraft()
    return initResponse
  }

  async function refreshInitResponseForUploadRetry() {
    activeInitResponse.value = null
    return ensureInitResponse()
  }

  async function recoverDraftBatch() {
    if (!activeBatchId.value || options.uploadItems.value.length === 0)
      return

    try {
      const detail = unwrapApiData(await fetchMyGalleryUploadBatchDetail(activeBatchId.value), null)
      if (!detail)
        return

      applyPreparedItemsToLocal(detail.items)
      options.saveUploadDraft()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        options.onRecoverDraftBatchError(getApiErrorMessage(error, '恢复失败'))
    }
  }

  function getPreparedUploadItem(initResponse: GalleryUploadInitResponse, item: LocalUploadItem, index: number): GalleryUploadPreparedItem | undefined {
    return initResponse.items.find(entry => entry.clientItemId === item.clientItemId)
      || initResponse.items.find(entry => entry.itemIndex === index)
      || initResponse.items[index]
  }

  return {
    activeBatchId,
    activeInitResponse,
    applyPreparedItemsToLocal,
    createBatchAttempted,
    ensureInitResponse,
    getPreparedUploadItem,
    isExpiredUploadStatus,
    isInitResponseExpiring,
    recoverDraftBatch,
    refreshInitResponseForUploadRetry,
    renewUploadIntentAfterEdit,
    resetExpiredUploadDraft,
    resetUploadIntentKey,
    uploadIntentKey,
  }
}
