export const AI_CHAT_DRAW_COST = 500
export const AI_CHAT_DRAW_RATE_LIMIT_SECONDS = 30
export const AI_CHAT_DRAW_POLL_MS = 2500

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
