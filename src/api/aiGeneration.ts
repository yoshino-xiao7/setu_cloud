import type { AxiosRequestConfig } from 'axios'
import http from '@/api/http'

export type AiGenerationStatus = 'QUEUED' | 'CLAIMED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
export type AiReviewStatus = 'NOT_SUBMITTED' | 'WAITING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED'
export type AiPublicCategory = 'GENERAL' | 'R18'

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
  loraName?: string | null
  loraStrength?: number
  characterId?: string | null
  triggerWords?: string
  styleTags?: string
}

export interface AiPromptTranslateRequest {
  promptCn: string
  styleTags?: string
  negativePrompt?: string
}

export interface AiPromptTranslateResponse {
  positive: string
  negative: string
  styleNotes?: string | null
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
  loraName?: string | null
  loraStrength?: number | null
  characterId?: string | null
  status: AiGenerationStatus
  workerId?: string | null
  localJobId?: string | null
  reviewStatus: AiReviewStatus
  publicCategory?: AiPublicCategory | null
  publicVisible?: boolean
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

export interface AiImageUrl {
  jobId: number
  url: string
  expiresInSeconds: number
}

export function createAiGeneration(data: AiGenerationCreateRequest) {
  return http.post<AiGenerationJob>('/ai/generations', data)
}

export function translateAiPrompt(data: AiPromptTranslateRequest) {
  return http.post<AiPromptTranslateResponse>('/ai/prompt/translate', data)
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

export function submitAiGenerationReview(id: number, data: { category: AiPublicCategory, note?: string }) {
  return http.post<AiGenerationReview>(`/ai/generations/${id}/review`, data)
}

export function fetchAiCapabilities() {
  return http.get<AiCapabilityResponse>('/ai/capabilities')
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

export function fetchAiApiGeneration(id: number, config?: AxiosRequestConfig) {
  return http.get<AiGenerationJob>(`/ai-api/generations/${id}`, config)
}

export function fetchAiApiGenerationImageUrl(id: number, config?: AxiosRequestConfig) {
  return http.get<AiImageUrl>(`/ai-api/generations/${id}/image-url`, config)
}

export function fetchAdminAiGenerations(params: {
  userId?: number | null
  status?: string
  reviewStatus?: string
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
