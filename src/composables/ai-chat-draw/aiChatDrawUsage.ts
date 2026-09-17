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

export const AI_CHAT_DRAW_RECOVER_POLL_DELAYS_MS = [
  0,
  500,
  1000,
  2000,
  3000,
  5000,
  8000,
  12000,
  20000,
  20000,
  30000,
  30000,
  30000,
]

/** True once the matching user message is already persisted (turn may still be running). */
export function chatDrawUserTurnPersisted(
  content: string,
  next: { messages?: Array<{ role?: string, content?: string | null }> } | null,
) {
  const normalized = content.trim()
  if (!normalized)
    return false
  return (next?.messages || []).some(item => item.role === 'user' && (item.content || '').trim() === normalized)
}

/** Recover only when the matching user turn already has a visible assistant reply. */
export function chatDrawTurnLikelySucceeded(
  content: string,
  previousMessageCount: number,
  next: {
    messages?: Array<{
      role?: string
      content?: string | null
      generationJobId?: number | null
      generationJob?: unknown
    }>
  } | null,
) {
  const messages = next?.messages || []
  if (messages.length <= previousMessageCount)
    return false

  const normalized = content.trim()
  if (!normalized)
    return false

  let userIndex = -1
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i]
    if (item?.role === 'user' && (item.content || '').trim() === normalized) {
      userIndex = i
      break
    }
  }
  if (userIndex < 0)
    return false

  return messages.slice(userIndex + 1).some((item) => {
    if (!item || item.role === 'user')
      return false
    const hasText = Boolean((item.content || '').trim())
    const hasJob = item.generationJobId != null || item.generationJob != null
    return hasText || hasJob
  })
}

export function aiChatDrawFollowUpSuggestions(
  messages: Array<{
    role?: string
    content?: string | null
    generationJobId?: number | null
    generationJob?: unknown
  }>,
) {
  const lastAssistant = [...messages].reverse().find(item => item.role !== 'user')
  if (!lastAssistant)
    return [] as string[]
  const lastUser = [...messages].reverse().find(item => item.role === 'user')?.content?.trim() || ''
  const hasJob = lastAssistant.generationJobId != null || lastAssistant.generationJob != null
  const subject = lastUser.length <= 12 ? lastUser : `${lastUser.slice(0, 12)}…`
  if (hasJob) {
    return [
      subject ? `保持${subject}，换个构图再画一版` : '换个构图再画一版',
      subject ? `${subject}再细腻一点，光影更强` : '加强光影和细节再出一张',
    ]
  }
  return [
    subject ? `按「${subject}」直接出一张图` : '按这个想法直接出图',
    '改成竖构图插画风格',
  ]
}
