import type { AxiosRequestConfig } from 'axios'
import http from '@/api/http'

export type AiGenerationStatus = 'QUEUED' | 'CLAIMED' | 'RUNNING' | 'UPLOADING' | 'COMPLETED' | 'FAILED'
export type AiPromptTranslationStatus = AiGenerationStatus
export type AiReviewStatus = 'NOT_SUBMITTED' | 'WAITING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED'
export type AiPublicCategory = 'GENERAL' | 'R18'
export type AiDeleteStatus = 'NONE' | 'WAITING' | 'APPROVED' | 'REJECTED'
export type AiGenerationMode = 'SINGLE' | 'DUAL'
export type AiPrivateOssStatus = 'NONE' | 'AVAILABLE' | 'EXPIRED' | 'EXPLICITLY_DELETED' | 'DELETE_FAILED'
export type AiLocalStorageStatus = 'NONE' | 'AVAILABLE' | 'DELETE_PENDING' | 'DELETED' | 'DELETE_FAILED'

export interface PageResult<T> {
  total: number
  page: number
  pageSize: number
  list: T[]
}

export interface AiGenerationCreateRequest {
  promptCn: string
  promptPositive?: string | null
  promptNegative?: string | null
  styleNotes?: string | null
  width?: number
  height?: number
  steps?: number
  cfg?: number
  seed?: number | null
  checkpoint?: string | null
  generationMode?: AiGenerationMode
  loraName?: string | null
  loraStrength?: number
  characterId?: string | null
  secondLoraName?: string | null
  secondLoraStrength?: number
  secondCharacterId?: string | null
  triggerWords?: string
  styleTags?: string
  characterMaskJson?: string | null
  nsfwMode?: boolean
}

export interface AiPromptTranslateRequest {
  promptCn: string
  styleTags?: string
  negativePrompt?: string
  nsfwMode?: boolean
}

export interface AiPromptTranslateResponse {
  id?: number
  userId?: number
  apiKeyId?: number | null
  source?: string
  promptCn?: string
  styleTags?: string | null
  negativePrompt?: string | null
  nsfwMode?: boolean
  status?: AiPromptTranslationStatus
  positive?: string | null
  negative?: string | null
  styleNotes?: string | null
  workerId?: string | null
  errorMessage?: string | null
  createdAt?: string
  updatedAt?: string
  completedAt?: string | null
  failedAt?: string | null
}

export interface AiGenerationJob {
  id: number
  userId?: number
  apiKeyId?: number | null
  source?: string
  promptCn: string
  promptPositive?: string | null
  promptNegative?: string | null
  styleNotes?: string | null
  width: number
  height: number
  steps: number
  cfg: number
  seed?: number | null
  checkpoint?: string | null
  generationMode?: AiGenerationMode
  loraName?: string | null
  loraStrength?: number | null
  characterId?: string | null
  secondLoraName?: string | null
  secondLoraStrength?: number | null
  secondCharacterId?: string | null
  characterMaskJson?: string | null
  nsfwMode?: boolean
  status: AiGenerationStatus
  workerId?: string | null
  localJobId?: string | null
  comfyPromptId?: string | null
  workerStage?: string | null
  workerDetail?: string | null
  localRelativePath?: string | null
  localAbsolutePath?: string | null
  localStorageStatus?: AiLocalStorageStatus | null
  localImageRecordedAt?: string | null
  localImageDeletedAt?: string | null
  privateOssStatus?: AiPrivateOssStatus | null
  privateOssExpiresAt?: string | null
  privateOssDeletedAt?: string | null
  privateOssDeleteError?: string | null
  reviewStatus: AiReviewStatus
  publicCategory?: AiPublicCategory | null
  publicVisible?: boolean
  deleted?: boolean
  deleteStatus?: AiDeleteStatus | null
  deleteRequestId?: number | null
  deletedAt?: string | null
  imageUrl?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  sizeBytes?: number | null
  sha256?: string | null
  pointsCost?: number
  pointsCharged?: boolean
  pointsRefunded?: boolean
  adminFree?: boolean
  errorMessage?: string | null
  userErrorMessage?: string | null
  createdAt?: string
  updatedAt?: string
  completedAt?: string | null
  failedAt?: string | null
}

export interface AiGenerationReview {
  id: number
  jobId: number
  userId: number
  category: AiPublicCategory
  status: AiReviewStatus
  submitNote?: string | null
  rejectReason?: string | null
  adminId?: number | null
  job?: AiGenerationJob | null
  createdAt?: string
  reviewedAt?: string | null
}

export interface AiGenerationDeleteRequest {
  id: number
  jobId: number
  userId: number
  reason?: string | null
  status: AiDeleteStatus
  rejectReason?: string | null
  adminId?: number | null
  job?: AiGenerationJob | null
  createdAt?: string
  reviewedAt?: string | null
}

export interface AiCapabilityItem {
  workerId?: string
  type?: string
  name: string
  displayName?: string
  sizeBytes?: number
  metadataJson?: string
}

export interface AiWorkerNode {
  workerId: string
  nodeName?: string | null
  version?: string | null
  status?: string | null
  message?: string | null
  lastSeenAt?: string | null
}

export interface AiCapabilityResponse {
  checkpoints: AiCapabilityItem[]
  loras: AiCapabilityItem[]
  vaes: AiCapabilityItem[]
  characters: AiCapabilityItem[]
  workers: AiWorkerNode[]
}

export interface AiServiceStatusResponse {
  status: 'ONLINE' | 'OFFLINE' | 'CLOSED' | string
  online: boolean
  openNow: boolean
  available: boolean
  message?: string | null
  timezone?: string | null
  openStartTime?: string | null
  openEndTime?: string | null
  workerCount?: number
  activeWorkerCount?: number
  queuedCount?: number
  claimedCount?: number
  runningCount?: number
  uploadingCount?: number
  estimatedWaitSeconds?: number
  nextOpenTime?: string | null
  serverTime?: string | null
  lastSeenAt?: string | null
  workers?: AiWorkerNode[]
}

export interface AiImageUrl {
  jobId: number
  url: string
  expiresInSeconds: number
}

export interface AiImageDownload {
  jobId: number
  downloadUrl: string
  expires?: number | null
}

export interface AiLocalImageDeleteCommand {
  id: number
  jobId: number
  workerId: string
  requestedByAdminId: number
  reason?: string | null
  status: 'PENDING' | 'CLAIMED' | 'SUCCEEDED' | 'FAILED'
  attemptCount?: number
  errorMessage?: string | null
  localRelativePath?: string | null
}

export function createAiGeneration(data: AiGenerationCreateRequest) {
  return http.post<AiGenerationJob>('/ai/generations', data)
}

export function translateAiPrompt(data: AiPromptTranslateRequest) {
  return http.post<AiPromptTranslateResponse>('/ai/prompt/translate', data)
}

export function fetchAiPromptTranslation(id: number) {
  return http.get<AiPromptTranslateResponse>(`/ai/prompt/translations/${id}`)
}

export function fetchMyAiGenerations(params: { status?: string, page?: number, pageSize?: number }) {
  return http.get<PageResult<AiGenerationJob>>('/ai/generations', { params })
}

export function fetchAiGeneration(id: number) {
  return http.get<AiGenerationJob>(`/ai/generations/${id}`)
}

export function fetchAiGenerationImageUrl(id: number) {
  return http.get<AiImageUrl>(`/ai/generations/${id}/image-url`)
}

export function downloadAiGeneration(id: number) {
  return http.post<AiImageDownload>(`/ai/generations/${id}/download`)
}

export function submitAiGenerationReview(id: number, data: { category: AiPublicCategory, note?: string }) {
  return http.post<AiGenerationReview>(`/ai/generations/${id}/review`, data)
}

export function submitAiGenerationDeleteRequest(id: number, data: { reason?: string }) {
  return http.post<AiGenerationDeleteRequest>(`/ai/generations/${id}/delete-request`, data)
}

export function fetchMyAiGenerationDeleteRequests(params: { page?: number, pageSize?: number }) {
  return http.get<PageResult<AiGenerationDeleteRequest>>('/ai/delete-requests', { params })
}

export function fetchAiCapabilities() {
  return http.get<AiCapabilityResponse>('/ai/capabilities')
}

export function fetchAiStatus() {
  return http.get<AiServiceStatusResponse>('/ai/status')
}

export function fetchAiSquare(params: { category?: string, page?: number, pageSize?: number }) {
  return http.get<PageResult<AiGenerationJob>>('/ai/square', { params })
}

export function createAiApiGeneration(data: AiGenerationCreateRequest, config?: AxiosRequestConfig) {
  return http.post<AiGenerationJob>('/ai-api/generations', data, config)
}

export function translateAiApiPrompt(data: AiPromptTranslateRequest, config?: AxiosRequestConfig) {
  return http.post<AiPromptTranslateResponse>('/ai-api/prompt/translate', data, config)
}

export function fetchAiApiPromptTranslation(id: number, config?: AxiosRequestConfig) {
  return http.get<AiPromptTranslateResponse>(`/ai-api/prompt/translations/${id}`, config)
}

export function fetchAiApiGeneration(id: number, config?: AxiosRequestConfig) {
  return http.get<AiGenerationJob>(`/ai-api/generations/${id}`, config)
}

export function fetchAiApiGenerationImageUrl(id: number, config?: AxiosRequestConfig) {
  return http.get<AiImageUrl>(`/ai-api/generations/${id}/image-url`, config)
}

export function fetchAdminAiGenerations(params: {
  jobId?: number | null
  userId?: number | null
  status?: string
  reviewStatus?: string
  deleteStatus?: string
  recordState?: string
  page?: number
  pageSize?: number
}) {
  return http.get<PageResult<AiGenerationJob>>('/admin/ai/generations', { params })
}

export function fetchAdminAiReviews(params: {
  status?: string
  category?: string
  page?: number
  pageSize?: number
}) {
  return http.get<PageResult<AiGenerationReview>>('/admin/ai/reviews', { params })
}

export function approveAdminAiReview(id: number) {
  return http.post<AiGenerationReview>(`/admin/ai/reviews/${id}/approve`)
}

export function rejectAdminAiReview(id: number, data: { reason: string }) {
  return http.post<AiGenerationReview>(`/admin/ai/reviews/${id}/reject`, data)
}

export function unpublishAdminAiGeneration(id: number) {
  return http.post<AiGenerationJob>(`/admin/ai/generations/${id}/unpublish`)
}

export function deleteAdminAiGeneration(id: number, data: { reason?: string }) {
  return http.post<AiGenerationJob>(`/admin/ai/generations/${id}/delete`, data)
}

export function deleteAdminAiLocalImage(id: number, data: { reason?: string }) {
  return http.post<AiLocalImageDeleteCommand>(`/admin/ai/generations/${id}/local-image/delete`, data)
}

export function fetchAdminAiDeleteRequests(params: {
  status?: string
  page?: number
  pageSize?: number
}) {
  return http.get<PageResult<AiGenerationDeleteRequest>>('/admin/ai/delete-requests', { params })
}

export function approveAdminAiDeleteRequest(id: number) {
  return http.post<AiGenerationDeleteRequest>(`/admin/ai/delete-requests/${id}/approve`)
}

export function rejectAdminAiDeleteRequest(id: number, data: { reason: string }) {
  return http.post<AiGenerationDeleteRequest>(`/admin/ai/delete-requests/${id}/reject`, data)
}
