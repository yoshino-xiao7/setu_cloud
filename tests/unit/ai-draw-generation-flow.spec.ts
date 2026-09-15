import type { AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import { describe, expect, it } from 'vitest'
import {
  canSubmitAiDrawGeneration,
  createAiDrawGenerationPayload,
} from '@/composables/useAiDrawGenerationPayload'

function createForm(mode: AiGenerationMode = 'SINGLE') {
  return {
    generationMode: mode,
    nsfwMode: false,
    nsfwVisibilityLevel: 'STANDARD' as AiNsfwVisibilityLevel,
    lightHires: false,
    jobType: 'TEXT2IMG' as const,
    denoise: 0.45,
    promptCn: '',
    promptPositive: '',
    promptNegative: 'bad anatomy',
    styleNotes: '',
    width: 832,
    height: 1216,
    steps: 35,
    cfg: 4.5,
    seed: null,
    checkpoint: '',
    loraName: 'main-lora',
    loraStrength: 0.8,
    characterId: 'main-character',
    secondLoraName: 'second-lora',
    secondLoraStrength: 0.65,
    secondCharacterId: 'second-character',
    triggerWords: '',
    styleTags: '',
    stylePresetIds: [],
    disabledStylePresetIds: [],
  }
}

describe('ai draw generation flow helpers', () => {
  it('builds single-character payload without dual-only fields', () => {
    const payload = createAiDrawGenerationPayload({
      effectiveNegativePrompt: 'bad anatomy',
      effectivePositivePrompt: 'blue hair',
      form: createForm('SINGLE'),
      isDualMode: false,
      selectedCharacterAsset: { displayName: 'Character A' } as any,
      selectedLoraAsset: null,
      selectedSecondCharacterAsset: { displayName: 'Character B' } as any,
      selectedSecondLoraAsset: null,
    })

    expect(payload.promptCn).toBe('Character A')
    expect(payload.promptPositive).toBe('blue hair')
    expect(payload.secondLoraName).toBeUndefined()
    expect(payload.secondLoraStrength).toBe(0)
    expect(payload.secondCharacterId).toBeUndefined()
  })

  it('builds dual-character payload with mask and secondary assets', () => {
    const payload = createAiDrawGenerationPayload({
      characterMaskJson: '{"version":1}',
      effectiveNegativePrompt: 'bad anatomy',
      effectivePositivePrompt: 'two girls',
      form: createForm('DUAL'),
      isDualMode: true,
      selectedCharacterAsset: null,
      selectedLoraAsset: { displayName: 'Main LoRA' } as any,
      selectedSecondCharacterAsset: null,
      selectedSecondLoraAsset: { displayName: 'Second LoRA' } as any,
    })

    expect(payload.promptCn).toBe('Main LoRA')
    expect(payload.secondLoraName).toBe('second-lora')
    expect(payload.secondLoraStrength).toBe(0.65)
    expect(payload.secondCharacterId).toBe('second-character')
    expect(payload.characterMaskJson).toBe('{"version":1}')
  })

  it('checks submit eligibility with points and admin bypass', () => {
    expect(canSubmitAiDrawGeneration(true, true, false, 49, 50)).toBe(false)
    expect(canSubmitAiDrawGeneration(true, true, false, 50, 50)).toBe(true)
    expect(canSubmitAiDrawGeneration(true, true, true, 0, 50)).toBe(true)
    expect(canSubmitAiDrawGeneration(false, true, true, 0, 50)).toBe(false)
  })

  it('falls back to the positive prompt when natural language is empty', () => {
    const form = createForm('SINGLE')
    form.promptCn = ''
    form.characterId = ''
    const payload = createAiDrawGenerationPayload({
      effectiveNegativePrompt: 'bad anatomy',
      effectivePositivePrompt: 'cinematic lighting, silver hair',
      form,
      isDualMode: false,
      selectedCharacterAsset: null,
      selectedLoraAsset: null,
      selectedSecondCharacterAsset: null,
      selectedSecondLoraAsset: null,
    })

    expect(payload.promptCn).toBe('cinematic lighting, silver hair')
    expect(payload.promptPositive).toBe('cinematic lighting, silver hair')
  })

  it('sends light hires only for classic checkpoints', () => {
    const classicForm = createForm('SINGLE')
    classicForm.lightHires = true
    classicForm.checkpoint = 'waiIllustriousSDXL_v170.safetensors'
    const classicPayload = createAiDrawGenerationPayload({
      effectiveNegativePrompt: 'bad anatomy',
      effectivePositivePrompt: 'blue hair',
      form: classicForm,
      isDualMode: false,
      selectedCharacterAsset: null,
      selectedLoraAsset: null,
      selectedSecondCharacterAsset: null,
      selectedSecondLoraAsset: null,
    })
    expect(classicPayload.lightHires).toBe(true)

    const animaForm = createForm('SINGLE')
    animaForm.lightHires = true
    animaForm.checkpoint = 'anima-base-v1.0.safetensors'
    const animaPayload = createAiDrawGenerationPayload({
      effectiveNegativePrompt: 'bad anatomy',
      effectivePositivePrompt: 'blue hair',
      form: animaForm,
      isDualMode: false,
      selectedCharacterAsset: null,
      selectedLoraAsset: null,
      selectedSecondCharacterAsset: null,
      selectedSecondLoraAsset: null,
    })
    expect(animaPayload.lightHires).toBe(false)
  })

  it('builds img2img payload with source id, denoise, and dual-only fields stripped', () => {
    const form = createForm('DUAL')
    form.jobType = 'IMG2IMG'
    form.denoise = 0.55
    form.lightHires = true
    const payload = createAiDrawGenerationPayload({
      characterMaskJson: '{"version":1}',
      effectiveNegativePrompt: 'bad anatomy',
      effectivePositivePrompt: 'silver hair, rain',
      form,
      isDualMode: true,
      selectedCharacterAsset: null,
      selectedLoraAsset: null,
      selectedSecondCharacterAsset: null,
      selectedSecondLoraAsset: null,
      sourceImageId: 42,
    })

    expect(payload.jobType).toBe('IMG2IMG')
    expect(payload.sourceImageId).toBe(42)
    expect(payload.denoise).toBe(0.55)
    expect(payload.lightHires).toBe(false)
    expect(payload.generationMode).toBe('SINGLE')
    expect(payload.secondLoraName).toBeUndefined()
    expect(payload.secondCharacterId).toBeUndefined()
    expect(payload.characterMaskJson).toBeUndefined()
  })
})
