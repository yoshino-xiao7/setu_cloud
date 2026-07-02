import type { GalleryPidMode, GalleryUploadItemUploadStatus } from '@/api/galleryUpload'

export type LocalUploadStatus = 'pending' | 'hashing' | 'uploading' | 'finished' | 'error'

export interface GalleryUploadDraftSourceItem {
  clientItemId?: string
  fileKey: string
  filename: string
  contentType: string
  sizeBytes: number
  lastModified: number
  pageIndex: number
  title: string
  author: string
  tagsText: string
  status?: LocalUploadStatus
  uploadStatus?: GalleryUploadItemUploadStatus
  sha256?: string
  submissionId?: number
  objectKey?: string
  etag?: string
}

export interface GalleryUploadDraftItem extends GalleryUploadDraftSourceItem {}

export interface GalleryUploadDraftForm {
  pidMode: GalleryPidMode
  title: string
  author: string
  r18: boolean
  aiType: number
  tagsText: string
}

export interface GalleryUploadDraft {
  version: 2
  updatedAt: number
  uploadIntentKey: string
  batchId?: number
  createBatchAttempted: boolean
  includeSha256: boolean
  form: GalleryUploadDraftForm
  items: GalleryUploadDraftItem[]
}

export interface CreateGalleryUploadDraftInput {
  uploadIntentKey: string
  batchId?: number | null
  createBatchAttempted: boolean
  includeSha256: boolean
  form: GalleryUploadDraftForm
  items: GalleryUploadDraftSourceItem[]
}

export function createGalleryUploadDraftItem(item: GalleryUploadDraftSourceItem): GalleryUploadDraftItem {
  return {
    clientItemId: item.clientItemId,
    fileKey: item.fileKey,
    filename: item.filename,
    contentType: item.contentType,
    sizeBytes: item.sizeBytes,
    lastModified: item.lastModified,
    pageIndex: item.pageIndex,
    title: item.title,
    author: item.author,
    tagsText: item.tagsText,
    status: item.status,
    uploadStatus: item.uploadStatus,
    sha256: item.sha256,
    submissionId: item.submissionId,
    objectKey: item.objectKey,
    etag: item.etag,
  }
}

export function createGalleryUploadDraft(input: CreateGalleryUploadDraftInput): GalleryUploadDraft {
  return {
    version: 2,
    updatedAt: Date.now(),
    uploadIntentKey: input.uploadIntentKey,
    batchId: input.batchId || undefined,
    createBatchAttempted: input.createBatchAttempted,
    includeSha256: input.includeSha256,
    form: { ...input.form },
    items: input.items.map(createGalleryUploadDraftItem),
  }
}

export function hasMeaningfulGalleryUploadDraft(draft: GalleryUploadDraft) {
  return draft.items.length > 0
    || !!draft.form.title
    || !!draft.form.author
    || !!draft.form.r18
    || draft.form.aiType !== 0
    || !!draft.form.tagsText
    || draft.form.pidMode !== 'MULTI_PID_P0'
}

export function parseGalleryUploadDraft(rawDraft: string) {
  const draft = JSON.parse(rawDraft) as Partial<GalleryUploadDraft>
  if ((draft.version !== 1 && draft.version !== 2) || !draft.form)
    return null
  return draft
}

export function createGalleryUploadDraftWatchSource(
  form: GalleryUploadDraftForm,
  includeSha256: boolean,
  items: GalleryUploadDraftSourceItem[],
) {
  return [
    form.pidMode,
    form.title,
    form.author,
    form.r18,
    form.aiType,
    form.tagsText,
    includeSha256,
    ...items.map(item => [
      item.fileKey,
      item.filename,
      item.contentType,
      item.sizeBytes,
      item.lastModified,
      item.pageIndex,
      item.title,
      item.author,
      item.tagsText,
      item.sha256,
    ].join(':')),
  ]
}
