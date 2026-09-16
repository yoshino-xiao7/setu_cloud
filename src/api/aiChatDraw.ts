import type { AiGenerationJob } from '@/api/aiGeneration'
import http from '@/api/http'

export interface AiChatDrawUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
  reasoningTokens: number
}

export interface AiChatDrawSession {
  id: number
  title?: string | null
  status?: string
  usage?: AiChatDrawUsage | null
  createdAt?: string
  updatedAt?: string
}

export interface AiChatDrawMessage {
  id: number
  role: 'user' | 'assistant' | string
  content?: string | null
  reasoningContent?: string | null
  usage?: AiChatDrawUsage | null
  generationJobId?: number | null
  generationJob?: AiGenerationJob | null
  pointsCost?: number
  pointsCharged?: boolean
  pointsRefunded?: boolean
  adminFree?: boolean
  status?: string
  errorMessage?: string | null
  createdAt?: string
}

export interface AiChatDrawSessionDetail {
  session: AiChatDrawSession
  messages: AiChatDrawMessage[]
  cost: number
  rateLimitSeconds: number
  retryAfterSeconds: number
  adminFree?: boolean
}

export interface AiChatDrawSendRequest {
  sessionId?: number | null
  content: string
  nsfwMode?: boolean
}

export function createAiChatDrawSession() {
  return http.post<AiChatDrawSession>('/ai/chat-draw/sessions')
}

export function fetchAiChatDrawSessions(params?: { page?: number, pageSize?: number }) {
  return http.get('/ai/chat-draw/sessions', { params })
}

export function fetchAiChatDrawSession(id: number) {
  return http.get<AiChatDrawSessionDetail>(`/ai/chat-draw/sessions/${id}`)
}

export function sendAiChatDrawMessage(data: AiChatDrawSendRequest) {
  return http.post<AiChatDrawSessionDetail>('/ai/chat-draw/messages', data, { timeout: 180000 })
}
