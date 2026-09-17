import type { AiGenerationJob } from '@/api/aiGeneration'
import { API_BASE_URL } from '@/api/env'
import http from '@/api/http'
import { buildSignedFetchHeaders, ensureSignedFetchReady } from '@/api/signedFetch'

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
  followUps?: string[] | null
  createdAt?: string
}

export interface AiChatDrawSessionDetail {
  session: AiChatDrawSession
  messages: AiChatDrawMessage[]
  /** @deprecated Fixed cost removed; use tokensPerPoint. */
  cost?: number
  tokensPerPoint?: number
  rateLimitSeconds: number
  retryAfterSeconds: number
  adminFree?: boolean
}

export interface AiChatDrawSendRequest {
  sessionId?: number | null
  content: string
  nsfwMode?: boolean
}

export interface AiChatDrawStreamEvent {
  type: 'status' | 'delta' | 'reasoning' | 'job' | 'follow_ups' | 'done' | 'error'
  message?: string
  content?: string
  job?: AiGenerationJob
  followUps?: string[]
  detail?: AiChatDrawSessionDetail
}

export function createAiChatDrawSession() {
  return http.post<AiChatDrawSession>('/ai/chat-draw/sessions')
}

export function fetchAiChatDrawSessions(params?: {
  page?: number
  pageSize?: number
  status?: 'ACTIVE' | 'ARCHIVED' | 'ALL' | string
}) {
  return http.get('/ai/chat-draw/sessions', { params })
}

export function fetchAiChatDrawSession(id: number) {
  return http.get<AiChatDrawSessionDetail>(`/ai/chat-draw/sessions/${id}`)
}

export function archiveAiChatDrawSession(id: number) {
  return http.post<AiChatDrawSession>(`/ai/chat-draw/sessions/${id}/archive`)
}

export function unarchiveAiChatDrawSession(id: number) {
  return http.post<AiChatDrawSession>(`/ai/chat-draw/sessions/${id}/unarchive`)
}

export function sendAiChatDrawMessage(data: AiChatDrawSendRequest) {
  // Multi-round tool calls + slower providers can exceed 3 minutes even when the turn succeeds server-side.
  return http.post<AiChatDrawSessionDetail>('/ai/chat-draw/messages', data, { timeout: 600000 })
}

export async function streamAiChatDrawMessage(
  data: AiChatDrawSendRequest,
  onEvent: (event: AiChatDrawStreamEvent) => void,
  signal?: AbortSignal,
) {
  const path = '/ai/chat-draw/messages/stream'
  if (!await ensureSignedFetchReady())
    throw new Error('会话签名缺失，请重新登录')
  const headers = await buildSignedFetchHeaders(path, 'POST')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(data),
    signal,
  })
  if (!response.ok) {
    let message = `对话失败（HTTP ${response.status}）`
    try {
      const payload = await response.json() as { message?: string, msg?: string }
      message = payload.message || payload.msg || message
    }
    catch {
      // Ignore malformed error bodies.
    }
    throw new Error(message)
  }
  if (!response.body)
    throw new Error('流式响应不可用')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sawTerminalEvent = false
  const emit = (flush: boolean) => {
    buffer = emitSseChunks(buffer, (event) => {
      if (event.type === 'done' || event.type === 'error')
        sawTerminalEvent = true
      onEvent(event)
    }, flush)
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      emit(true)
      break
    }
    buffer += decoder.decode(value, { stream: true })
    emit(false)
  }
  if (!sawTerminalEvent)
    throw new Error('AI_CHAT_DRAW_STREAM_CLOSED')
}

function emitSseChunks(
  buffer: string,
  onEvent: (event: AiChatDrawStreamEvent) => void,
  flush: boolean,
) {
  const chunks = buffer.split('\n\n')
  const rest = flush ? '' : (chunks.pop() || '')
  for (const chunk of chunks) {
    const dataLine = chunk.split('\n').find(line => line.startsWith('data:'))
    if (!dataLine)
      continue
    const payload = dataLine.slice(5).trim()
    if (!payload)
      continue
    try {
      onEvent(JSON.parse(payload) as AiChatDrawStreamEvent)
    }
    catch {
      throw new Error('流式连接中断')
    }
  }
  return rest
}
