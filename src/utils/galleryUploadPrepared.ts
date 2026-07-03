import type { GalleryUploadItemUploadStatus } from '@/api/galleryUpload'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'

export interface PreparedGalleryUploadItemLike {
  itemIndex: number
  clientItemId?: string | null
  submissionId?: number | null
  objectKey?: string | null
  status?: string | null
  uploadStatus?: GalleryUploadItemUploadStatus | null
  errorMessage?: string | null
}

export interface ApplyPreparedGalleryUploadItemsOptions {
  isExpiredStatus: (status?: string | null) => boolean
  expiredErrorMessage: string
  failedErrorMessage: string
}

export function applyPreparedGalleryUploadItems(
  localItems: LocalUploadItem[],
  preparedItems: PreparedGalleryUploadItemLike[],
  options: ApplyPreparedGalleryUploadItemsOptions,
) {
  const byClientItemId = new Map(
    preparedItems
      .filter(item => item.clientItemId)
      .map(item => [item.clientItemId!, item]),
  )
  const byIndex = new Map(preparedItems.map(item => [item.itemIndex, item]))

  return localItems.map((localItem, index) => {
    const preparedItem = byClientItemId.get(localItem.clientItemId) || byIndex.get(index)
    if (!preparedItem)
      return localItem

    const uploadStatus = preparedItem.uploadStatus || localItem.uploadStatus
    const isUploaded = uploadStatus === 'UPLOADED'
    const isFailed = uploadStatus === 'FAILED'
    const isExpired = options.isExpiredStatus(preparedItem.status)

    return {
      ...localItem,
      submissionId: preparedItem.submissionId || localItem.submissionId,
      objectKey: preparedItem.objectKey || localItem.objectKey,
      uploadStatus: uploadStatus || undefined,
      status: isExpired ? 'error' as const : isUploaded ? 'finished' as const : isFailed ? 'error' as const : localItem.status,
      progress: isUploaded ? 100 : localItem.progress,
      error: isExpired
        ? options.expiredErrorMessage
        : isFailed ? (preparedItem.errorMessage || localItem.error || options.failedErrorMessage) : localItem.error,
    }
  })
}
