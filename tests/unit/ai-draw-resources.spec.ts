import type { AiServiceStatusResponse } from '@/api/aiGeneration'
import { describe, expect, it } from 'vitest'
import {
  formatAiDrawWaitSeconds,
  getAiDrawQueueStatusText,
  getAiDrawServiceReady,
  getAiDrawServiceStatusLabel,
  getAiDrawServiceStatusMessage,
  getAiDrawServiceStatusType,
} from '@/composables/useAiDrawResourceStatus'

function createStatus(overrides: Partial<AiServiceStatusResponse> = {}): AiServiceStatusResponse {
  return {
    available: true,
    online: true,
    openNow: true,
    status: 'ONLINE',
    ...overrides,
  }
}

describe('ai draw resource helpers', () => {
  it('formats queue wait times and status text', () => {
    expect(formatAiDrawWaitSeconds(0)).toBe('较短')
    expect(formatAiDrawWaitSeconds(45)).toBe('45 秒')
    expect(formatAiDrawWaitSeconds(61)).toBe('2 分钟')

    expect(getAiDrawQueueStatusText(createStatus({
      claimedCount: 1,
      estimatedWaitSeconds: 61,
      queuedCount: 2,
      runningCount: 3,
      uploadingCount: 4,
    }))).toBe('排队 2 个，处理中 8 个，预计等待 2 分钟')
  })

  it('derives service readiness labels and messages', () => {
    expect(getAiDrawServiceReady(null)).toBe(true)
    expect(getAiDrawServiceStatusType(null)).toBe('info')
    expect(getAiDrawServiceStatusLabel(null, true)).toBe('服务检测中')

    const offline = createStatus({ online: false, status: 'OFFLINE' })
    expect(getAiDrawServiceReady(offline)).toBe(false)
    expect(getAiDrawServiceStatusType(offline)).toBe('error')
    expect(getAiDrawServiceStatusLabel(offline, false)).toBe('AI服务离线')
    expect(getAiDrawServiceStatusMessage(offline)).toContain('当前没有在线 Worker')
  })
})
