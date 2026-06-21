import http from '@/api/http'

export type GalleryPidMode = 'MULTI_PID_P0' | 'SINGLE_PID_MULTI_PAGE'

export type GalleryUploadStatus
  = | 'UPLOADING'
    | 'WAITING_MANUAL_REVIEW'
    | 'APPROVED'
    | 'PUBLISHING'
    | 'PUBLISHED'
    | 'REJECTED'
    | 'REJECT_DELETE_FAILED'
    | 'CANCELED'
    | 'PUBLISH_FAILED'
    | 'ALL'

export type GalleryUploadItemUploadStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED'

export interface PageResult<T> {
  total: number
  page: number
  pageSize: number
  list: T[]
}

export interface GalleryUploadDefaults {
  title?: string
  author?: string
  r18?: boolean
  aiType?: number
  tags?: string[]
}

export interface GalleryUploadInitItem {
  clientItemId: string
  filename: string
  contentType: string
  sizeBytes: number
  sha256?: string
  pageIndex?: number
  title?: string
  author?: string
  r18?: boolean
  aiType?: number
  tags?: string[]
}

export interface GalleryUploadInitRequest {
  clientRequestId?: string
  pidMode: GalleryPidMode
  defaults?: GalleryUploadDefaults
  items: GalleryUploadInitItem[]
}

export interface GalleryUploadPolicy {
  provider: string
  region: string
  bucket: string
  endpoint: string
  prefix: string
  expiresAt: string
  maxSizeBytes: number
  allowedContentTypes: string[]
}

export interface GalleryUploadCredentials {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
}

export interface GalleryUploadPreparedItem {
  submissionId: number
  itemIndex: number
  clientItemId?: string | null
  filename?: string | null
  pageIndex?: number | null
  objectKey: string
  status: GalleryUploadStatus
  uploadStatus?: GalleryUploadItemUploadStatus | null
  errorCode?: string | null
  errorMessage?: string | null
}

export interface GalleryUploadInitResponse {
  batchId: number
  clientRequestId?: string | null
  pidMode: GalleryPidMode
  status: GalleryUploadStatus
  uploadPolicy: GalleryUploadPolicy
  items: GalleryUploadPreparedItem[]
  credentials: GalleryUploadCredentials
}

export interface GalleryUploadCompleteItem {
  submissionId: number
  objectKey: string
  etag?: string
  sha256?: string
}

export interface GalleryUploadCompleteRequest {
  items?: GalleryUploadCompleteItem[]
}

export interface GalleryUploadCompleteResponse {
  batchId: number
  status: GalleryUploadStatus
  items: GalleryUploadPreparedItem[]
  message?: string
}

export interface GallerySubmissionBatchSummary {
  batchId: number
  userId: number
  pidMode: GalleryPidMode
  status: GalleryUploadStatus
  title?: string | null
  author?: string | null
  r18?: boolean | null
  itemCount: number
  uploadedCount: number
  approvedCount: number
  rejectedCount: number
  publishedCount: number
  sharedPublicPid?: number | null
  tags?: string[] | null
  createdAt: string
  reviewedAt?: string | null
  publishedAt?: string | null
}

export interface GallerySubmissionItemDetail extends GalleryUploadPreparedItem {
  title?: string | null
  author?: string | null
  r18?: boolean | null
  aiType?: number | null
  tags?: string[] | null
  width?: number | null
  height?: number | null
  sizeBytes?: number | null
  contentType?: string | null
  sha256?: string | null
  phash?: string | null
  rejectReason?: string | null
  publicPid?: number | null
  publicP?: number | null
  previewUrl?: string | null
  previewExpiresAt?: string | null
}

export interface GallerySubmissionBatchDetail extends GallerySubmissionBatchSummary {
  aiType?: number | null
  items: GallerySubmissionItemDetail[]
}

export interface GalleryBatchQuery {
  status?: GalleryUploadStatus
  page?: number
  pageSize?: number
}

export interface GalleryAdminApproveRequest {
  remark?: string
  publishNow?: boolean
  r18?: boolean
  aiType?: number
  normalizedTags?: string[]
}

export interface GalleryAdminRejectRequest {
  reason: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface GalleryAdminReviewResponse {
  batchId: number
  status: GalleryUploadStatus
  ossDeleted?: boolean | null
  rejectedCount?: number
  items: Array<{
    submissionId: number
    imageId?: number
    pid?: number
    p?: number
  }>
}

export interface OssUploadResult {
  submissionId: number
  objectKey: string
  etag?: string
}

export interface UploadGalleryFileOptions {
  initResponse: GalleryUploadInitResponse
  uploadItem: GalleryUploadPreparedItem
  file: File
  contentType?: string
  onProgress?: (percent: number) => void
}

export interface CreateGalleryUploadBatchOptions {
  idempotencyKey?: string
}

export interface CompleteGalleryUploadBatchOptions {
  timeout?: number
}

export function createGalleryUploadBatch(data: GalleryUploadInitRequest, options?: CreateGalleryUploadBatchOptions) {
  const clientRequestId = options?.idempotencyKey || data.clientRequestId

  return http.post<GalleryUploadInitResponse>('/gallery/uploads/batches', {
    ...data,
    clientRequestId,
  }, {
    headers: clientRequestId
      ? { 'Idempotency-Key': clientRequestId }
      : undefined,
  })
}

export function updateGalleryUploadItemStatus(
  batchId: number,
  clientItemId: string,
  data: {
    uploadStatus: GalleryUploadItemUploadStatus
    errorCode?: string
    errorMessage?: string
  },
) {
  return http.post<GalleryUploadPreparedItem>(
    `/gallery/uploads/batches/${batchId}/items/${encodeURIComponent(clientItemId)}/status`,
    data,
  )
}

export function completeGalleryUploadBatch(
  batchId: number,
  data: GalleryUploadCompleteRequest,
  options?: CompleteGalleryUploadBatchOptions,
) {
  return http.post<GalleryUploadCompleteResponse>(`/gallery/uploads/batches/${batchId}/complete`, data, {
    timeout: options?.timeout ?? 180_000,
  })
}

export function fetchMyGalleryUploadBatches(params: GalleryBatchQuery) {
  return http.get<PageResult<GallerySubmissionBatchSummary>>('/gallery/uploads/batches', {
    params,
  })
}

export function fetchMyGalleryUploadBatchDetail(batchId: number) {
  return http.get<GallerySubmissionBatchDetail>(`/gallery/uploads/batches/${batchId}`)
}

export function cancelGalleryUploadBatch(batchId: number) {
  return http.post<string>(`/gallery/uploads/batches/${batchId}/cancel`)
}

export function fetchAdminGallerySubmissionBatches(params: GalleryBatchQuery) {
  return http.get<PageResult<GallerySubmissionBatchSummary>>('/admin/gallery-submission-batches', {
    params,
  })
}

export function fetchAdminGallerySubmissionBatchDetail(batchId: number) {
  return http.get<GallerySubmissionBatchDetail>(`/admin/gallery-submission-batches/${batchId}`)
}

export function approveAdminGallerySubmissionBatch(batchId: number, data: GalleryAdminApproveRequest) {
  return http.post<GalleryAdminReviewResponse>(`/admin/gallery-submission-batches/${batchId}/approve`, data)
}

export function rejectAdminGallerySubmissionBatch(batchId: number, data: GalleryAdminRejectRequest) {
  return http.post<GalleryAdminReviewResponse>(`/admin/gallery-submission-batches/${batchId}/reject`, data)
}

function arrayBufferToWordArray(CryptoJS: typeof import('crypto-js/core'), buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const words: number[] = []
  for (let index = 0; index < bytes.length; index += 1)
    words[index >>> 2] = (words[index >>> 2] || 0) | (bytes[index] << (24 - (index % 4) * 8))

  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

export async function calculateFileSha256(file: File) {
  const cryptoModule = await import('crypto-js/core')
  await import('crypto-js/sha256')
  const CryptoJS = cryptoModule.default
  const hasher = CryptoJS.algo.SHA256.create()
  const chunkSize = 1024 * 1024

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size))
    const buffer = await chunk.arrayBuffer()
    hasher.update(arrayBufferToWordArray(CryptoJS, buffer))
    await waitForNextFrame()
  }

  return hasher.finalize().toString(CryptoJS.enc.Hex)
}

export async function uploadGalleryFileToOss(options: UploadGalleryFileOptions): Promise<OssUploadResult> {
  const { initResponse, uploadItem, file, contentType, onProgress } = options
  const ossModule = await import('ali-oss')
  const OSS = ossModule.default
  const client = new OSS({
    endpoint: initResponse.uploadPolicy.endpoint,
    bucket: initResponse.uploadPolicy.bucket,
    accessKeyId: initResponse.credentials.accessKeyId,
    accessKeySecret: initResponse.credentials.accessKeySecret,
    stsToken: initResponse.credentials.securityToken,
    secure: true,
  })

  const result = await client.put(uploadItem.objectKey, file, {
    headers: {
      'Content-Type': contentType || file.type || 'application/octet-stream',
    },
    progress: (percentage: number) => {
      onProgress?.(Math.round(percentage * 100))
    },
  })

  const etag = result.res?.headers?.etag?.replaceAll('"', '')
  return {
    submissionId: uploadItem.submissionId,
    objectKey: uploadItem.objectKey,
    etag,
  }
}
