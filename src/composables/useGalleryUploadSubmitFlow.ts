import type { MessageApi, UploadFileInfo } from 'naive-ui'
import type { Ref } from 'vue'
import type { GalleryUploadCompleteResponse } from '@/api/galleryUpload'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export interface UseGalleryUploadSubmitFlowOptions {
  activeTab: Ref<'upload' | 'records'>
  clearUploadDraft: () => void
  fileList: Ref<UploadFileInfo[]>
  handleFailedUpload: (error: unknown) => void
  handleGalleryUploadIncomplete: (error: unknown) => boolean
  isExpiredUploadError: (error: unknown) => boolean
  isExpiredUploadStatus: (status?: string | null) => boolean
  loadRecords: () => Promise<void>
  message: MessageApi
  resetExpiredUploadDraft: (messageText?: string) => void
  resetRecordsFilter: () => void
  resetUploadIntentKey: () => void
  revokePreviewUrl: (url?: string) => void
  runUpload: () => Promise<GalleryUploadCompleteResponse>
  saveUploadDraft: () => void
  submitError: Ref<string>
  uploading: Ref<boolean>
  uploadItems: Ref<LocalUploadItem[]>
  validateBeforeSubmit: () => boolean
}

export function useGalleryUploadSubmitFlow(options: UseGalleryUploadSubmitFlowOptions) {
  function resetUploadForm() {
    options.uploadItems.value.forEach(item => options.revokePreviewUrl(item.previewUrl))
    options.fileList.value = []
    options.uploadItems.value = []
    options.submitError.value = ''
    options.resetUploadIntentKey()
    options.clearUploadDraft()
  }

  async function handleStartUpload() {
    if (options.uploading.value)
      return

    if (!options.validateBeforeSubmit())
      return

    options.uploading.value = true
    options.submitError.value = ''

    try {
      const completed = await options.runUpload()
      if (options.isExpiredUploadStatus(completed.status)) {
        options.resetExpiredUploadDraft('上传窗口已过期，请重新投稿')
        options.message.error('上传已过期，请重新投稿')
        return
      }

      options.message.success(completed.message || '上传完成，等待管理员审核')
      resetUploadForm()
      options.activeTab.value = 'records'
      options.resetRecordsFilter()
      await options.loadRecords()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error)) {
        if (options.handleGalleryUploadIncomplete(error))
          return
        if (options.isExpiredUploadError(error)) {
          options.message.error('上传已过期，请重新投稿')
          return
        }

        options.handleFailedUpload(error)
        showApiError(options.message, error, '上传失败')
      }
    }
    finally {
      options.uploading.value = false
      options.saveUploadDraft()
    }
  }

  return {
    handleStartUpload,
    resetUploadForm,
  }
}
