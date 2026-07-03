import type { UploadFileInfo } from 'naive-ui'
import {
  GALLERY_UPLOAD_ACCEPT_TYPES,
  GALLERY_UPLOAD_MAX_BATCH_SIZE,
  GALLERY_UPLOAD_MAX_FILE_SIZE,
} from '@/constants/galleryUpload'

export interface SelectGalleryUploadFilesInput {
  rawFiles: File[]
  availableSlots: number
  currentTotalSize: number
  createFileInfo: (rawFile: File, contentType: string) => UploadFileInfo
}

export interface SelectGalleryUploadFilesResult {
  files: UploadFileInfo[]
  invalidTypeCount: number
  oversizedCount: number
  batchSizeRejectedCount: number
  skippedBySlotCount: number
}

export function getAcceptedGalleryUploadContentType(rawFile: File) {
  if (GALLERY_UPLOAD_ACCEPT_TYPES.includes(rawFile.type))
    return rawFile.type

  if (rawFile.type === 'image/jpg')
    return 'image/jpeg'

  const lowerName = rawFile.name.toLowerCase()
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'))
    return 'image/jpeg'
  if (lowerName.endsWith('.png'))
    return 'image/png'

  return ''
}

export function selectGalleryUploadFiles(input: SelectGalleryUploadFilesInput): SelectGalleryUploadFilesResult {
  const acceptedFiles = input.rawFiles.slice(0, input.availableSlots)
  let invalidTypeCount = 0
  let oversizedCount = 0
  let batchSizeRejectedCount = 0
  let runningTotalSize = input.currentTotalSize

  const files = acceptedFiles.reduce<UploadFileInfo[]>((result, rawFile) => {
    const contentType = getAcceptedGalleryUploadContentType(rawFile)
    if (!contentType) {
      invalidTypeCount += 1
      return result
    }

    if (rawFile.size > GALLERY_UPLOAD_MAX_FILE_SIZE) {
      oversizedCount += 1
      return result
    }

    if (runningTotalSize + rawFile.size > GALLERY_UPLOAD_MAX_BATCH_SIZE) {
      batchSizeRejectedCount += 1
      return result
    }

    runningTotalSize += rawFile.size
    result.push(input.createFileInfo(rawFile, contentType))
    return result
  }, [])

  return {
    files,
    invalidTypeCount,
    oversizedCount,
    batchSizeRejectedCount,
    skippedBySlotCount: Math.max(0, input.rawFiles.length - input.availableSlots),
  }
}
