import { describe, expect, it } from 'vitest'
import {
  applyAiDrawJobSize,
  applyAiDrawSizePreset,
  getAiDrawSizePresetValue,
} from '@/composables/useAiDrawSizePresets'

describe('ai draw size preset helpers', () => {
  it('applies known presets to the form dimensions', () => {
    const form = { width: 0, height: 0 }

    expect(applyAiDrawSizePreset(form, 'landscape')).toBe('landscape')
    expect(form).toEqual({ width: 1216, height: 832 })
  })

  it('falls back to portrait for unknown preset values', () => {
    const form = { width: 0, height: 0 }

    expect(applyAiDrawSizePreset(form, 'unknown')).toBe('portrait')
    expect(form).toEqual({ width: 832, height: 1216 })
  })

  it('matches restored dimensions back to a preset value', () => {
    expect(getAiDrawSizePresetValue(1024, 1024)).toBe('headshot')
    expect(getAiDrawSizePresetValue(900, 900)).toBe('portrait')
  })

  it('keeps custom job dimensions while selecting the fallback preset marker', () => {
    const form = { width: 0, height: 0 }

    expect(applyAiDrawJobSize(form, 900, 900)).toBe('portrait')
    expect(form).toEqual({ width: 900, height: 900 })
  })

  it('uses default dimensions when a job has no dimensions', () => {
    const form = { width: 0, height: 0 }

    expect(applyAiDrawJobSize(form, null, undefined)).toBe('portrait')
    expect(form).toEqual({ width: 832, height: 1216 })
  })
})
