import type { MessageApi } from 'naive-ui'
import type { Ref } from 'vue'
import type { GalleryUploadIncompleteItem, LocalUploadItem } from '@/types/galleryUploadLocal'
import { getApiErrorMessage, showApiError } from '@/composables/useApiError'
import {
  getErrorResponseData,
  getGalleryUploadIncompletePayload,
  markGalleryUploadIncompleteItems,
} from '@/utils/galleryUploadIncomplete'

interface UseGalleryUploadErrorHandlingOptions {
  message: MessageApi
  saveUploadDraft: () => void
  submitError: Ref<string>
  uploadItems: Ref<LocalUploadItem[]>
}

export function useGalleryUploadErrorHandling(options: UseGalleryUploadErrorHandlingOptions) {
  function getIncompleteItemError(item: GalleryUploadIncompleteItem) {
    return item.message
      || item.errorMessage
      || (item.status === 'FAILED' || item.uploadStatus === 'FAILED' ? '上传失败' : '后端未确认该图片上传完成')
  }

  function summarizeMarkedFilenames(filenames: string[]) {
    if (filenames.length === 0)
      return ''

    const visibleNames = filenames.slice(0, 3).join('、')
    return filenames.length > 3
      ? `${visibleNames} 等 ${filenames.length} 张`
      : visibleNames
  }

  function handleGalleryUploadIncomplete(error: unknown) {
    const payload = getGalleryUploadIncompletePayload(getErrorResponseData(error))
      || getGalleryUploadIncompletePayload(error)

    if (!payload)
      return false

    const markedResult = markGalleryUploadIncompleteItems(options.uploadItems.value, payload.items, {
      getItemError: getIncompleteItemError,
    })
    options.uploadItems.value = markedResult.items
    const markedFilenames = markedResult.markedFilenames
    const markedLabel = summarizeMarkedFilenames(markedFilenames)
    const baseMessage = getApiErrorMessage(error, payload.message || '仍有图片未上传完成')
    options.submitError.value = markedFilenames.length > 0
      ? `${baseMessage}。已标记需要重传的图片：${markedLabel}；再次提交只会重传失败项，已成功的图片不会重复上传。`
      : `${baseMessage}。后端没有返回可定位的图片 ID，请刷新后重试或重新选择失败图片。`
    options.saveUploadDraft()

    showApiError(options.message, error, '上传未完成', {
      messageOverride: markedFilenames.length > 0
        ? '仍有图片未上传完成，已标出需要重试的图片'
        : '仍有图片未上传完成，但没有可定位的图片 ID',
    })

    return true
  }

  function handleFailedUpload(error: unknown) {
    const messageText = getApiErrorMessage(error, '上传失败')
    const activeItem = options.uploadItems.value.find(item => item.status === 'hashing' || item.status === 'uploading')
      || options.uploadItems.value.find(item => item.status === 'error')
    if (activeItem) {
      activeItem.status = 'error'
      activeItem.error = messageText
    }
    options.submitError.value = `${messageText}。已保留已选图片和填写内容，可直接重新提交；已上传成功的图片不会重复上传。`
  }

  function isExpiredUploadError(error: unknown) {
    const text = getApiErrorMessage(error, '').toLowerCase()
    return text.includes('上传窗口已过期') || text.includes('上传已过期') || text.includes('expired')
  }

  return {
    handleFailedUpload,
    handleGalleryUploadIncomplete,
    isExpiredUploadError,
  }
}
