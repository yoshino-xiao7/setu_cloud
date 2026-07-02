import type { AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import { describe, expect, it } from 'vitest'
import {
  applyAiDrawCharacterMetadata,
  applyAiDrawGenerationModeChange,
  applyAiDrawNsfwModeChange,
  applyAiDrawNsfwVisibilityChange,
  clearAiDrawCharacter,
  clearAiDrawLora,
  getAiDrawCharacterLoraStrength,
} from '@/composables/useAiDrawFormRules'

function createForm() {
  return {
    generationMode: 'SINGLE' as AiGenerationMode,
    nsfwMode: false,
    nsfwVisibilityLevel: 'STANDARD' as AiNsfwVisibilityLevel,
    loraName: 'main-lora',
    loraStrength: 0.9,
    characterId: 'main-character',
    secondLoraName: 'second-lora',
    secondLoraStrength: 0.7,
    secondCharacterId: 'second-character',
    triggerWords: 'old trigger',
    styleTags: 'old style',
  }
}

describe('ai draw form rules', () => {
  it('applies and restores NSFW lora strengths without losing normal values', () => {
    const form = createForm()
    let saved = { primary: 1, secondary: 0.65 }

    saved = applyAiDrawNsfwModeChange(form, true, saved)
    expect(saved).toEqual({ primary: 0.9, secondary: 0.7 })
    expect(form.loraStrength).toBe(0.6)
    expect(form.secondLoraStrength).toBe(0.6)

    applyAiDrawNsfwVisibilityChange(form, 'STRONG')
    expect(form.loraStrength).toBe(0.55)
    expect(form.secondLoraStrength).toBe(0.55)

    saved = applyAiDrawNsfwModeChange(form, false, saved)
    expect(saved).toEqual({ primary: 0.9, secondary: 0.7 })
    expect(form.loraStrength).toBe(0.9)
    expect(form.secondLoraStrength).toBe(0.7)
  })

  it('uses metadata lora strength unless NSFW mode is enabled', () => {
    const metadata = {
      lora_name: 'char-lora',
      trigger_words: 'char trigger',
      style_tags: 'char style',
      recommended_strength: 0.82,
    }
    const form = createForm()
    form.loraName = ''

    expect(getAiDrawCharacterLoraStrength(metadata, false, 'STANDARD', 1)).toBe(0.82)
    applyAiDrawCharacterMetadata(form, metadata)
    expect(form.loraName).toBe('char-lora')
    expect(form.loraStrength).toBe(0.82)
    expect(form.triggerWords).toBe('char trigger')
    expect(form.styleTags).toBe('char style')

    form.nsfwMode = true
    applyAiDrawCharacterMetadata(form, metadata, 'secondary')
    expect(form.secondLoraName).toBe('char-lora')
    expect(form.secondLoraStrength).toBe(0.6)
  })

  it('clears primary and secondary assets with the existing defaults', () => {
    const form = createForm()

    clearAiDrawLora(form)
    expect(form.loraName).toBe('')
    expect(form.loraStrength).toBe(1)
    expect(form.triggerWords).toBe('')

    clearAiDrawCharacter(form, 'secondary')
    expect(form.secondCharacterId).toBe('')
    expect(form.secondLoraName).toBe('')
    expect(form.secondLoraStrength).toBe(0.65)
  })

  it('clears secondary character state in single mode and requests landscape for dual portrait mode', () => {
    const form = createForm()

    expect(applyAiDrawGenerationModeChange(form, 'portrait')).toBeNull()
    expect(form.secondCharacterId).toBe('')
    expect(form.secondLoraName).toBe('')
    expect(form.secondLoraStrength).toBe(0.65)

    form.generationMode = 'DUAL'
    expect(applyAiDrawGenerationModeChange(form, 'portrait')).toBe('landscape')
    expect(applyAiDrawGenerationModeChange(form, 'landscape')).toBeNull()
  })
})
