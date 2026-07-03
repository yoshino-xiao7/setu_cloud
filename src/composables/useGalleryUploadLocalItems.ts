import type { UploadFileInfo } from 'naive-ui'
import type { Ref } from 'vue'
import type { GalleryPidMode } from '@/api/galleryUpload'
import type { GalleryUploadDraftItem } from '@/composables/useGalleryUploadDraft'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { ref } from 'vue'
import { getAcceptedGalleryUploadContentType } from '@/utils/galleryUploadFiles'
import { createClientItemId } from '@/utils/uploadIntentKey'

export interface RestoreGalleryUploadDraftFilesResult {
  restoredCount: number
  totalCount: number
}

export interface UseGalleryUploadLocalItemsOptions {
  draftItemMap: Ref<Map<string, GalleryUploadDraftItem>>
  getFileDraftKey: (rawFile: File) => string
  getPersistedUploadFile: (fileKey: string) => Promise<File | null>
  pidMode: Readonly<Ref<GalleryPidMode>>
}

export function useGalleryUploadLocalItems(options: UseGalleryUploadLocalItemsOptions) {
  const fileList = ref<UploadFileInfo[]>([])
  const uploadItems = ref<LocalUploadItem[]>([])
  const restoringDraftFiles = ref(false)

  let uploadFileIdSeed = 0

  function revokePreviewUrl(url?: string) {
    if (url)
      URL.revokeObjectURL(url)
  }

  function findDraftItem(rawFile: File) {
    const fileKey = options.getFileDraftKey(rawFile)
    return options.draftItemMap.value.get(fileKey)
      || Array.from(options.draftItemMap.value.values()).find((item) => {
        return item.filename === rawFile.name && item.sizeBytes === rawFile.size
      })
  }

  function createUploadFileInfo(rawFile: File, contentType: string): UploadFileInfo {
    uploadFileIdSeed += 1
    return {
      id: `gallery-upload-${Date.now()}-${uploadFileIdSeed}`,
      name: rawFile.name,
      status: 'pending',
      percentage: 0,
      file: rawFile,
      type: contentType,
    }
  }

  function makeLocalUploadItem(info: UploadFileInfo, index: number, existing?: LocalUploadItem): LocalUploadItem | null {
    const rawFile = info.file
    if (!rawFile)
      return null

    if (existing) {
      if (!existing.clientItemId)
        existing.clientItemId = createClientItemId()
      existing.pageIndex = Number.isFinite(existing.pageIndex) ? existing.pageIndex : index
      return existing
    }

    const draftItem = findDraftItem(rawFile)
    const clientItemId = draftItem?.clientItemId || createClientItemId()
    const restoredFinished = (draftItem?.status === 'finished' || draftItem?.uploadStatus === 'UPLOADED')
      && !!draftItem.submissionId
      && !!draftItem.objectKey
    const restoredFailed = !restoredFinished && (draftItem?.status === 'error' || draftItem?.uploadStatus === 'FAILED')

    return {
      id: info.id,
      clientItemId,
      fileKey: options.getFileDraftKey(rawFile),
      file: rawFile,
      filename: rawFile.name,
      contentType: info.type || rawFile.type,
      sizeBytes: rawFile.size,
      lastModified: rawFile.lastModified,
      previewUrl: URL.createObjectURL(rawFile),
      pageIndex: Number.isFinite(draftItem?.pageIndex) ? draftItem!.pageIndex : index,
      title: draftItem?.title || '',
      author: draftItem?.author || '',
      tagsText: draftItem?.tagsText || '',
      progress: restoredFinished ? 100 : 0,
      status: restoredFinished ? 'finished' : restoredFailed ? 'error' : 'pending',
      uploadStatus: restoredFinished ? 'UPLOADED' : restoredFailed ? 'FAILED' : draftItem?.uploadStatus,
      sha256: draftItem?.sha256,
      submissionId: draftItem?.submissionId,
      objectKey: draftItem?.objectKey,
      etag: draftItem?.etag,
    }
  }

  function syncUploadItems(nextFileList: UploadFileInfo[]) {
    const previous = new Map(uploadItems.value.map(item => [item.id, item]))
    const nextItems = nextFileList
      .map((info, index) => makeLocalUploadItem(info, index, previous.get(info.id)))
      .filter((item): item is LocalUploadItem => !!item)

    const nextIds = new Set(nextItems.map(item => item.id))
    uploadItems.value.forEach((item) => {
      if (!nextIds.has(item.id))
        revokePreviewUrl(item.previewUrl)
    })

    uploadItems.value = nextItems.map((item, index) => ({
      ...item,
      pageIndex: options.pidMode.value === 'SINGLE_PID_MULTI_PAGE' && item.pageIndex >= 0 ? item.pageIndex : index,
    }))
  }

  async function restoreDraftFiles(): Promise<RestoreGalleryUploadDraftFilesResult> {
    const draftItems = Array.from(options.draftItemMap.value.values())
    if (draftItems.length === 0)
      return { restoredCount: 0, totalCount: 0 }

    const restoredInfos: UploadFileInfo[] = []
    for (const item of draftItems) {
      const file = await options.getPersistedUploadFile(item.fileKey)
      if (!file)
        continue

      const contentType = getAcceptedGalleryUploadContentType(file) || item.contentType
      restoredInfos.push(createUploadFileInfo(file, contentType))
    }

    if (restoredInfos.length > 0) {
      restoringDraftFiles.value = true
      try {
        fileList.value = restoredInfos
        syncUploadItems(fileList.value)
      }
      finally {
        restoringDraftFiles.value = false
      }
    }

    return {
      restoredCount: restoredInfos.length,
      totalCount: draftItems.length,
    }
  }

  function revokeAllPreviewUrls() {
    uploadItems.value.forEach(item => revokePreviewUrl(item.previewUrl))
  }

  return {
    createUploadFileInfo,
    fileList,
    findDraftItem,
    restoreDraftFiles,
    restoringDraftFiles,
    revokeAllPreviewUrls,
    revokePreviewUrl,
    syncUploadItems,
    uploadItems,
  }
}
