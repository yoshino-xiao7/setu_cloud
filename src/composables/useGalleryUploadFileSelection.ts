import type { UploadFileInfo } from 'naive-ui'
import type { ComputedRef, Ref } from 'vue'
import type { GalleryUploadDraftItem } from '@/composables/useGalleryUploadDraft'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { ref } from 'vue'
import { GALLERY_UPLOAD_MAX_FILES } from '@/constants/galleryUpload'
import { selectGalleryUploadFiles } from '@/utils/galleryUploadFiles'

interface UseGalleryUploadFileSelectionOptions {
  canPickFiles: ComputedRef<boolean>
  createUploadFileInfo: (rawFile: File, contentType: string) => UploadFileInfo
  deletePersistedUploadFile: (fileKey: string) => void
  draftItemMap: Ref<Map<string, GalleryUploadDraftItem>>
  draftRestoredNotice: Ref<boolean>
  fileList: Ref<UploadFileInfo[]>
  findDraftItem: (rawFile: File) => GalleryUploadDraftItem | undefined
  persistUploadFiles: (infos: UploadFileInfo[]) => Promise<void>
  renewUploadIntentAfterEdit: () => void
  restoringDraftFiles: Ref<boolean>
  revokePreviewUrl: (url?: string) => void
  syncUploadItems: (nextFileList: UploadFileInfo[]) => void
  totalSize: ComputedRef<number>
  uploadItems: Ref<LocalUploadItem[]>
  warning: (content: string) => void
}

export function useGalleryUploadFileSelection(options: UseGalleryUploadFileSelectionOptions) {
  const nativeFileInputRef = ref<HTMLInputElement | null>(null)

  function addNativeFiles(rawFiles: File[]) {
    if (!options.canPickFiles.value || rawFiles.length === 0)
      return

    const availableSlots = GALLERY_UPLOAD_MAX_FILES - options.uploadItems.value.length
    const selected = selectGalleryUploadFiles({
      rawFiles,
      availableSlots,
      currentTotalSize: options.totalSize.value,
      createFileInfo: options.createUploadFileInfo,
    })
    const nextFiles = selected.files

    if (selected.skippedBySlotCount > 0)
      options.warning(`单批次最多 ${GALLERY_UPLOAD_MAX_FILES} 张图片，已跳过超出部分`)
    if (selected.invalidTypeCount > 0)
      options.warning('已跳过不支持的文件，仅支持 JPG 和 PNG 图片')
    if (selected.oversizedCount > 0)
      options.warning('已跳过超过 10MB 的图片')
    if (selected.batchSizeRejectedCount > 0)
      options.warning('已跳过会导致批次超过 100MB 的图片')

    if (nextFiles.length === 0)
      return

    const selectedFilesMatchDraft = nextFiles.length === options.draftItemMap.value.size
      && nextFiles.every(info => info.file && !!options.findDraftItem(info.file))
    const isRestoringDraftFiles = options.draftRestoredNotice.value
      && options.uploadItems.value.length === 0
      && selectedFilesMatchDraft

    if (!isRestoringDraftFiles)
      options.renewUploadIntentAfterEdit()

    options.fileList.value = [...options.fileList.value, ...nextFiles]
    options.restoringDraftFiles.value = isRestoringDraftFiles
    try {
      options.syncUploadItems(options.fileList.value)
    }
    finally {
      options.restoringDraftFiles.value = false
    }

    void options.persistUploadFiles(nextFiles)
  }

  function removeUploadItem(item: LocalUploadItem) {
    options.revokePreviewUrl(item.previewUrl)
    options.uploadItems.value = options.uploadItems.value.filter(entry => entry.id !== item.id)
    options.fileList.value = options.fileList.value.filter(file => file.id !== item.id)
    options.deletePersistedUploadFile(item.fileKey)
    options.renewUploadIntentAfterEdit()
  }

  function openNativeFilePicker() {
    if (!options.canPickFiles.value)
      return
    nativeFileInputRef.value?.click()
  }

  function handleNativeFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    addNativeFiles(Array.from(input.files || []))
    input.value = ''
  }

  return {
    addNativeFiles,
    handleNativeFileChange,
    nativeFileInputRef,
    openNativeFilePicker,
    removeUploadItem,
  }
}
