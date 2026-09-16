export const AI_CHAT_DRAW_TOKENS_PER_POINT = 1000
export const AI_CHAT_DRAW_RATE_LIMIT_SECONDS = 30
export const AI_CHAT_DRAW_POLL_MS = 2500

/** @deprecated Fixed per-turn cost removed; billing is token-based. */
export const AI_CHAT_DRAW_COST = 0

export function pointsFromAiChatDrawTokens(
  tokens: number,
  tokensPerPoint = AI_CHAT_DRAW_TOKENS_PER_POINT,
) {
  const safeTokens = Math.max(0, Math.floor(Number(tokens) || 0))
  const safePerPoint = Math.max(1, Math.floor(Number(tokensPerPoint) || AI_CHAT_DRAW_TOKENS_PER_POINT))
  if (safeTokens <= 0)
    return 0
  return Math.ceil(safeTokens / safePerPoint)
}

export function formatAiChatDrawPricing(tokensPerPoint = AI_CHAT_DRAW_TOKENS_PER_POINT) {
  const value = Math.max(1, Math.floor(Number(tokensPerPoint) || AI_CHAT_DRAW_TOKENS_PER_POINT))
  return `每 ${value} Token = 1 积分`
}

export function formatAiChatDrawUsage(usage?: {
  promptTokens?: number
  completionTokens?: number
  cacheHitTokens?: number
  cacheMissTokens?: number
} | null) {
  if (!usage)
    return ''
  return [
    `输入 ${usage.promptTokens || 0}`,
    `输出 ${usage.completionTokens || 0}`,
    `命中缓存 ${usage.cacheHitTokens || 0}`,
    `未命中缓存 ${usage.cacheMissTokens || 0}`,
  ].join(' · ')
}

export function hasAiChatDrawUsage(usage?: {
  promptTokens?: number
  completionTokens?: number
  cacheHitTokens?: number
  cacheMissTokens?: number
} | null) {
  if (!usage)
    return false
  return (usage.promptTokens || 0)
    + (usage.completionTokens || 0)
    + (usage.cacheHitTokens || 0)
    + (usage.cacheMissTokens || 0) > 0
}

export function parseAiChatDrawRetrySeconds(error: unknown, fallback = AI_CHAT_DRAW_RATE_LIMIT_SECONDS) {
  const message = error && typeof error === 'object' && 'response' in error
    ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message || '')
    : ''
  const matched = message.match(/(\d+)\s*秒/)
  if (matched)
    return Math.max(1, Number(matched[1]) || fallback)
  return fallback
}

export function nextAiChatDrawCooldownSeconds(retryAfterSeconds?: number | null) {
  const value = Number(retryAfterSeconds)
  if (!Number.isFinite(value) || value <= 0)
    return 0
  return Math.ceil(value)
}

export function isTransientChatDrawSendError(error: unknown) {
  if (!error || typeof error !== 'object')
    return false

  const axiosErr = error as {
    code?: string
    message?: string
    response?: { status?: number, data?: { message?: string } }
  }
  const status = axiosErr.response?.status
  if (status === 408 || status === 429 || status === 502 || status === 503 || status === 504)
    return status !== 429

  if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ERR_NETWORK')
    return true

  const message = `${axiosErr.message || ''} ${axiosErr.response?.data?.message || ''}`
  if (message.includes('客户端已断开') || message.includes('AI_CHAT_DRAW_STREAM_CLOSED'))
    return true
  const lowered = message.toLowerCase()
  return lowered.includes('timeout') || lowered.includes('network error')
}

export function chatDrawTurnLikelySucceeded(
  content: string,
  previousMessageCount: number,
  next: { messages?: Array<{ role?: string, content?: string | null }> } | null,
) {
  const messages = next?.messages || []
  if (messages.length <= previousMessageCount)
    return false

  const normalized = content.trim()
  if (!normalized)
    return false

  return messages.some(item => item.role === 'user' && (item.content || '').trim() === normalized)
}
