import { describe, expect, it } from 'vitest'
import {
  formatAiChatDrawPricing,
  formatAiChatDrawUsage,
  hasAiChatDrawUsage,
  isTransientChatDrawSendError,
  nextAiChatDrawCooldownSeconds,
  parseAiChatDrawRetrySeconds,
  pointsFromAiChatDrawTokens,
} from '@/composables/ai-chat-draw/aiChatDrawUsage'

describe('ai chat draw usage helpers', () => {
  it('formats input output and cache tokens', () => {
    expect(formatAiChatDrawUsage({
      promptTokens: 120,
      completionTokens: 40,
      cacheHitTokens: 80,
      cacheMissTokens: 40,
    })).toBe('输入 120 · 输出 40 · 命中缓存 80 · 未命中缓存 40')
  })

  it('detects empty usage', () => {
    expect(hasAiChatDrawUsage({ promptTokens: 0, completionTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0 })).toBe(false)
    expect(hasAiChatDrawUsage({ promptTokens: 1, completionTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0 })).toBe(true)
  })

  it('charges one point per thousand tokens rounded up', () => {
    expect(pointsFromAiChatDrawTokens(0)).toBe(0)
    expect(pointsFromAiChatDrawTokens(1)).toBe(1)
    expect(pointsFromAiChatDrawTokens(1000)).toBe(1)
    expect(pointsFromAiChatDrawTokens(1001)).toBe(2)
    expect(formatAiChatDrawPricing(1000)).toBe('每 1000 Token = 1 积分')
  })

  it('parses retry seconds from rate limit errors', () => {
    expect(parseAiChatDrawRetrySeconds({
      response: { data: { message: '对话太频繁，请 21 秒后再试' } },
    })).toBe(21)
    expect(nextAiChatDrawCooldownSeconds(18.2)).toBe(19)
    expect(nextAiChatDrawCooldownSeconds(0)).toBe(0)
  })

  it('treats browser stream drops as recoverable', () => {
    expect(isTransientChatDrawSendError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isTransientChatDrawSendError(new Error('流式连接中断'))).toBe(true)
    expect(isTransientChatDrawSendError({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe(true)
    expect(isTransientChatDrawSendError({ response: { status: 400, data: { message: '缺少画面描述' } } })).toBe(false)
  })
})
