import { describe, expect, it } from 'vitest'
import { clampAiDrawImg2imgDenoise } from '@/composables/useAiDrawDefaults'
import { isAiDrawSourceImageFile } from '@/composables/useAiDrawSourceImage'

describe('ai draw img2img helpers', () => {
  it('clamps denoise into the cloud range', () => {
    expect(clampAiDrawImg2imgDenoise(undefined)).toBe(0.45)
    expect(clampAiDrawImg2imgDenoise(0.1)).toBe(0.25)
    expect(clampAiDrawImg2imgDenoise(0.9)).toBe(0.7)
    expect(clampAiDrawImg2imgDenoise(0.55)).toBe(0.55)
  })

  it('accepts png jpeg and webp source files', () => {
    expect(isAiDrawSourceImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true)
    expect(isAiDrawSourceImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(isAiDrawSourceImageFile(new File(['x'], 'a.webp', { type: 'image/webp' }))).toBe(true)
    expect(isAiDrawSourceImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe(false)
  })
})
