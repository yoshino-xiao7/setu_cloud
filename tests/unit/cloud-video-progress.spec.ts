import { describe, expect, it } from 'vitest'
import { shouldSaveCloudVideoProgress } from '@/utils/cloudVideoProgress'

describe('cloud video progress save throttle', () => {
  it('does not save until the player has applied resume', () => {
    expect(shouldSaveCloudVideoProgress({
      allowSave: false,
      lastSavedAt: 0,
      now: 20_000,
      force: true,
    })).toBe(false)
  })

  it('saves at most once per 10 seconds unless forced', () => {
    expect(shouldSaveCloudVideoProgress({
      allowSave: true,
      lastSavedAt: 1_000,
      now: 10_000,
    })).toBe(false)
    expect(shouldSaveCloudVideoProgress({
      allowSave: true,
      lastSavedAt: 1_000,
      now: 11_000,
    })).toBe(true)
    expect(shouldSaveCloudVideoProgress({
      allowSave: true,
      lastSavedAt: 1_000,
      now: 2_000,
      force: true,
    })).toBe(true)
  })
})
