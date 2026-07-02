import type { AiGenerationJob, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import { describe, expect, it } from 'vitest'
import {
  applyAiDrawDraftRestore,
  applyAiDrawHistoryJobToForm,
  readAiDrawPrefillJob,
} from '@/composables/useAiDrawHistoryRestore'

function createForm() {
  return {
    generationMode: 'SINGLE' as const,
    nsfwMode: false,
    nsfwVisibilityLevel: 'STANDARD' as AiNsfwVisibilityLevel,
    promptCn: '',
    promptPositive: '',
    promptNegative: '',
    styleNotes: '',
    width: 832,
    height: 1216,
    steps: 35,
    cfg: 4.5,
    seed: 123,
    checkpoint: '',
    loraName: '',
    loraStrength: 1,
    characterId: '',
    secondLoraName: '',
    secondLoraStrength: 0.65,
    secondCharacterId: '',
    triggerWords: 'manual trigger',
    styleTags: 'manual style',
    stylePresetIds: ['cinematic'],
  }
}

function createJob(): AiGenerationJob {
  return {
    cfg: 6,
    characterId: 'main-character',
    characterMaskJson: '{"version":1}',
    checkpoint: 'checkpoint',
    generationMode: 'DUAL',
    height: 832,
    id: 1,
    loraName: 'main-lora',
    loraStrength: 0.9,
    nsfwMode: true,
    nsfwVisibilityLevel: 'STRONG',
    promptCn: '历史任务',
    promptNegative: '',
    promptPositive: 'positive',
    reviewStatus: 'NOT_SUBMITTED',
    secondCharacterId: 'second-character',
    secondLoraName: 'second-lora',
    secondLoraStrength: 0.7,
    status: 'COMPLETED',
    steps: 28,
    styleNotes: 'notes',
    width: 1216,
  }
}

describe('ai draw history restore helpers', () => {
  it('restores a history job and clears transient manual state', () => {
    const form = createForm()
    let restoredMask = ''

    const selectedSize = applyAiDrawHistoryJobToForm(form, createJob(), {
      defaultNegative: 'default negative',
      restoreCharacterMask: maskJson => restoredMask = maskJson,
    })

    expect(selectedSize).toBe('landscape')
    expect(form.seed).toBeNull()
    expect(form.promptNegative).toBe('default negative')
    expect(form.triggerWords).toBe('')
    expect(form.styleTags).toBe('')
    expect(form.stylePresetIds).toEqual([])
    expect(form.secondCharacterId).toBe('second-character')
    expect(restoredMask).toBe('{"version":1}')
  })

  it('restores a draft and maps dimensions back to a size preset', () => {
    const form = createForm()
    const selectedSize = applyAiDrawDraftRestore(form, {
      cfg: 4.5,
      characterId: '',
      checkpoint: '',
      generationMode: 'SINGLE',
      height: 1024,
      loraName: '',
      loraStrength: 1,
      nsfwMode: false,
      nsfwVisibilityLevel: 'STANDARD',
      promptCn: 'draft',
      promptNegative: '',
      promptPositive: '',
      secondCharacterId: '',
      secondLoraName: '',
      secondLoraStrength: 0.65,
      seed: null,
      steps: 35,
      styleNotes: '',
      stylePresetIds: [],
      styleTags: '',
      triggerWords: '',
      width: 1024,
    }, 'default negative')

    expect(selectedSize).toBe('headshot')
    expect(form.promptNegative).toBe('default negative')
    expect(form.width).toBe(1024)
  })

  it('reads prefill jobs once and clears seed when requested', () => {
    const removed: string[] = []
    const storage = {
      getItem: () => JSON.stringify({ ...createJob(), clearSeed: true, seed: 999 }),
      removeItem: (key: string) => removed.push(key),
    }

    const job = readAiDrawPrefillJob(storage)

    expect(job?.seed).toBeNull()
    expect(job?.clearSeed).toBe(true)
    expect(removed).toEqual(['ai-draw-prefill'])
  })
})
