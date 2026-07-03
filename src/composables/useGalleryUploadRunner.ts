import type { Ref } from 'vue'
import type {
  GalleryUploadCompleteItem,
  GalleryUploadCompleteResponse,
  GalleryUploadInitResponse,
  GalleryUploadItemUploadStatus,
  GalleryUploadPreparedItem,
} from '@/api/galleryUpload'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import {
  calculateFileSha256,
  completeGalleryUploadBatch,
  updateGalleryUploadItemStatus,
  uploadGalleryFileToOss,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { GALLERY_UPLOAD_COMPLETE_TIMEOUT } from '@/constants/galleryUpload'

export interface UseGalleryUploadRunnerOptions {
  ensureInitResponse: () => Promise<GalleryUploadInitResponse>
  getPreparedUploadItem: (
    initResponse: GalleryUploadInitResponse,
    item: LocalUploadItem,
    index: number,
  ) => GalleryUploadPreparedItem | undefined
  includeSha256: Ref<boolean>
  isExpiredUploadStatus: (status?: string | null) => boolean
  isInitResponseExpiring: (initResponse: GalleryUploadInitResponse) => boolean
  onShaCalculationWarning: () => void
  refreshInitResponseForUploadRetry: () => Promise<GalleryUploadInitResponse>
  resetExpiredUploadDraft: (messageText?: string) => void
  saveUploadDraft: () => void
  uploadItems: Ref<LocalUploadItem[]>
}

export function useGalleryUploadRunner(options: UseGalleryUploadRunnerOptions) {
  let shaWarningShown = false

  function resetShaWarning() {
    shaWarningShown = false
  }

  function markRetryableItemsPending() {
    options.uploadItems.value = options.uploadItems.value.map((item) => {
      if (item.status === 'finished' && item.submissionId && item.objectKey) {
        return {
          ...item,
          uploadStatus: 'UPLOADED',
          error: undefined,
        }
      }

      return {
        ...item,
        status: 'pending',
        uploadStatus: 'PENDING',
        progress: 0,
        error: undefined,
      }
    })
  }

  function getUploadErrorCode(error: unknown) {
    if (!error || typeof error !== 'object')
      return ''

    const anyError = error as {
      code?: unknown
      name?: unknown
      status?: unknown
      statusCode?: unknown
      res?: { status?: unknown }
    }

    const code = typeof anyError.code === 'string'
      ? anyError.code
      : typeof anyError.name === 'string' ? anyError.name : ''
    if (code)
      return code

    const status = Number(anyError.status ?? anyError.statusCode ?? anyError.res?.status)
    return Number.isFinite(status) ? String(status) : ''
  }

  function isRefreshableOssUploadError(error: unknown) {
    const code = getUploadErrorCode(error)
    if (code === 'SecurityTokenExpired' || code === 'InvalidAccessKeyId' || code === 'AccessDenied' || code === '403')
      return true

    const text = getApiErrorMessage(error, '').toLowerCase()
    return text.includes('securitytokenexpired')
      || text.includes('invalidaccesskeyid')
      || text.includes('accessdenied')
  }

  async function tryCalculateSha256(item: LocalUploadItem) {
    if (!options.includeSha256.value || item.sha256)
      return

    try {
      item.status = 'hashing'
      item.sha256 = await calculateFileSha256(item.file)
    }
    catch {
      item.sha256 = undefined
      if (!shaWarningShown) {
        shaWarningShown = true
        options.onShaCalculationWarning()
      }
    }
  }

  async function reportItemUploadStatus(
    batchId: number,
    item: LocalUploadItem,
    uploadStatus: GalleryUploadItemUploadStatus,
    errorMessage?: string,
  ) {
    item.uploadStatus = uploadStatus
    options.saveUploadDraft()

    try {
      await updateGalleryUploadItemStatus(batchId, item.clientItemId, {
        uploadStatus,
        objectKey: item.objectKey,
        sha256: uploadStatus === 'UPLOADED' ? item.sha256 : undefined,
        errorCode: uploadStatus === 'FAILED' ? 'CLIENT_UPLOAD_FAILED' : undefined,
        errorMessage,
      })
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        console.warn('[GalleryUpload] 同步单图上传状态失败', error)
    }
  }

  function getCompletedUploadItem(item: LocalUploadItem): GalleryUploadCompleteItem | null {
    if (!item.submissionId || !item.objectKey)
      return null

    return {
      submissionId: item.submissionId,
      objectKey: item.objectKey,
      etag: item.etag,
      sha256: item.sha256,
    }
  }

  async function uploadPendingItem(
    initResponse: GalleryUploadInitResponse,
    localItem: LocalUploadItem,
    index: number,
  ) {
    let currentInitResponse = initResponse
    let currentLocalItem = localItem
    let credentialRefreshAttempted = false

    while (true) {
      if (options.isInitResponseExpiring(currentInitResponse)) {
        currentInitResponse = await options.refreshInitResponseForUploadRetry()
        currentLocalItem = options.uploadItems.value[index] || currentLocalItem
      }

      const preparedItem = options.getPreparedUploadItem(currentInitResponse, currentLocalItem, index)
      if (!preparedItem)
        throw new Error('初始化响应缺少上传项')
      if (options.isExpiredUploadStatus(preparedItem.status)) {
        options.resetExpiredUploadDraft('上传窗口已过期，请重新投稿')
        throw new Error('上传窗口已过期，请重新投稿')
      }

      try {
        await tryCalculateSha256(currentLocalItem)

        currentLocalItem.status = 'uploading'
        currentLocalItem.progress = 0
        currentLocalItem.submissionId = preparedItem.submissionId
        currentLocalItem.objectKey = preparedItem.objectKey
        await reportItemUploadStatus(currentInitResponse.batchId, currentLocalItem, 'UPLOADING')

        const result = await uploadGalleryFileToOss({
          initResponse: currentInitResponse,
          uploadItem: preparedItem,
          file: currentLocalItem.file,
          contentType: currentLocalItem.contentType,
          onProgress: percent => (currentLocalItem.progress = percent),
        })

        currentLocalItem.status = 'finished'
        currentLocalItem.progress = 100
        currentLocalItem.etag = result.etag
        await reportItemUploadStatus(currentInitResponse.batchId, currentLocalItem, 'UPLOADED')
        return {
          completedItem: {
            submissionId: result.submissionId,
            objectKey: result.objectKey,
            etag: result.etag,
            sha256: currentLocalItem.sha256,
          },
          initResponse: currentInitResponse,
        }
      }
      catch (itemError) {
        if (!credentialRefreshAttempted && isRefreshableOssUploadError(itemError) && currentLocalItem.objectKey === preparedItem.objectKey) {
          credentialRefreshAttempted = true
          currentLocalItem.error = '上传凭证已刷新，正在重试'
          currentInitResponse = await options.refreshInitResponseForUploadRetry()
          currentLocalItem = options.uploadItems.value[index] || currentLocalItem
          continue
        }

        currentLocalItem.status = 'error'
        currentLocalItem.error = getApiErrorMessage(itemError, '上传失败')
        await reportItemUploadStatus(currentInitResponse.batchId, currentLocalItem, 'FAILED', currentLocalItem.error)
        throw itemError
      }
    }
  }

  async function runUpload(): Promise<GalleryUploadCompleteResponse> {
    resetShaWarning()
    markRetryableItemsPending()

    let initResponse = await options.ensureInitResponse()
    const completedItems: GalleryUploadCompleteItem[] = []

    for (let index = 0; index < options.uploadItems.value.length; index += 1) {
      const localItem = options.uploadItems.value[index]
      if (!localItem)
        throw new Error('本地上传项丢失')

      const completedItem = getCompletedUploadItem(localItem)
      if (localItem.status === 'finished' && completedItem) {
        completedItems.push(completedItem)
        continue
      }

      const result = await uploadPendingItem(initResponse, localItem, index)
      initResponse = result.initResponse
      completedItems.push(result.completedItem)
    }

    return unwrapApiData(await completeGalleryUploadBatch(initResponse.batchId, {
      items: completedItems,
    }, {
      timeout: GALLERY_UPLOAD_COMPLETE_TIMEOUT,
    }))
  }

  return {
    runUpload,
  }
}
