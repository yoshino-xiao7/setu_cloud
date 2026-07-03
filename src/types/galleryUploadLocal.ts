import type {
  GalleryUploadItemUploadStatus,
} from '@/api/galleryUpload'
import type { LocalUploadStatus } from '@/composables/useGalleryUploadDraft'

export interface LocalUploadItem {
  id: string
  clientItemId: string
  fileKey: string
  file: File
  filename: string
  contentType: string
  sizeBytes: number
  lastModified: number
  previewUrl: string
  pageIndex: number
  title: string
  author: string
  tagsText: string
  progress: number
  status: LocalUploadStatus
  uploadStatus?: GalleryUploadItemUploadStatus
  sha256?: string
  submissionId?: number
  objectKey?: string
  etag?: string
  error?: string
}

export interface GalleryUploadIncompleteItem {
  submissionId?: number
  clientItemId?: string
  filename?: string
  status?: string
  uploadStatus?: string
  message?: string
  errorMessage?: string
  errorCode?: string
}

export interface GalleryUploadIncompletePayload {
  code?: string
  message?: string
  items: GalleryUploadIncompleteItem[]
}
