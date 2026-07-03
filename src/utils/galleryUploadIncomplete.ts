import type { GalleryUploadIncompleteItem, GalleryUploadIncompletePayload, LocalUploadItem } from '@/types/galleryUploadLocal'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined

  if (typeof value !== 'string' || !value.trim())
    return undefined

  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

export function getErrorResponseData(error: unknown) {
  if (!isRecord(error) || !isRecord(error.response))
    return undefined

  return error.response.data
}

function normalizeIncompleteItem(value: unknown): GalleryUploadIncompleteItem | null {
  if (!isRecord(value))
    return null

  return {
    submissionId: optionalNumber(value.submissionId),
    clientItemId: optionalString(value.clientItemId),
    filename: optionalString(value.filename),
    status: optionalString(value.status),
    uploadStatus: optionalString(value.uploadStatus),
    message: optionalString(value.message),
    errorMessage: optionalString(value.errorMessage),
    errorCode: optionalString(value.errorCode),
  }
}

export function getGalleryUploadIncompletePayload(value: unknown): GalleryUploadIncompletePayload | null {
  if (!isRecord(value))
    return null

  if (value.code === 'GALLERY_UPLOAD_INCOMPLETE') {
    return {
      code: 'GALLERY_UPLOAD_INCOMPLETE',
      message: optionalString(value.message),
      items: Array.isArray(value.items)
        ? value.items.map(normalizeIncompleteItem).filter((item): item is GalleryUploadIncompleteItem => !!item)
        : [],
    }
  }

  return getGalleryUploadIncompletePayload(value.data)
}

export interface MarkGalleryUploadIncompleteItemsOptions {
  getItemError: (item: GalleryUploadIncompleteItem) => string
}

export function markGalleryUploadIncompleteItems(
  localItems: LocalUploadItem[],
  incompleteItems: GalleryUploadIncompleteItem[],
  options: MarkGalleryUploadIncompleteItemsOptions,
) {
  const byClientItemId = new Map(
    incompleteItems
      .filter(item => item.clientItemId)
      .map(item => [item.clientItemId!, item]),
  )
  const bySubmissionId = new Map(
    incompleteItems
      .filter(item => item.submissionId)
      .map(item => [item.submissionId!, item]),
  )
  const byFilename = new Map(
    incompleteItems
      .filter(item => item.filename)
      .map(item => [item.filename!, item]),
  )
  const markedFilenames: string[] = []

  const items = localItems.map((localItem) => {
    const incompleteItem = byClientItemId.get(localItem.clientItemId)
      || (localItem.submissionId ? bySubmissionId.get(localItem.submissionId) : undefined)
      || byFilename.get(localItem.filename)

    if (!incompleteItem) {
      if (localItem.status === 'finished' && localItem.submissionId && localItem.objectKey) {
        return {
          ...localItem,
          uploadStatus: 'UPLOADED' as const,
          progress: 100,
          error: undefined,
        }
      }

      return localItem
    }

    markedFilenames.push(localItem.filename)
    return {
      ...localItem,
      status: 'error' as const,
      uploadStatus: 'FAILED' as const,
      progress: 0,
      etag: undefined,
      error: options.getItemError(incompleteItem),
    }
  })

  return { items, markedFilenames }
}
