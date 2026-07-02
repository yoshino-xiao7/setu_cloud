import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import type { AiDrawDraftState } from '@/stores/aiDrawDraft'
import { describe, expect, it } from 'vitest'
import { applyAiDrawDraftToForm, createAiDrawDraftPatch } from '@/composables/useAiDrawDraftForm'

function createForm(): AiDrawDraftForm {
  return {
    generationMode: 'DUAL',
    nsfwMode: true,
    nsfwVisibilityLevel: 'STRICT',
    promptCn: '中文提示',
    promptPositive: 'old injected, manual',
    promptNegative: 'bad anatomy',
    styleNotes: 'notes',
    width: 1216,
    height: 832,
    steps: 28,
    cfg: 5,
    seed: 123,
    checkpoint: 'ckpt',
    loraName: 'lora-a',
    loraStrength: 0.8,
    characterId: 'char-a',
    secondLoraName: 'lora-b',
    secondLoraStrength: 0.6,
    secondCharacterId: 'char-b',
    triggerWords: 'tw',
    styleTags: 'tag',
    stylePresetIds: ['preset-a'],
  }
}

function createDraft(): AiDrawDraftState {
  return {
    ...createForm(),
    hasDraft: true,
    promptPositive: 'restored positive',
    promptNegative: '',
    stylePresetIds: ['restored'],
  }
}

describe('ai draw draft form helpers', () => {
  it('creates a draft patch without sharing style preset arrays', () => {
    const form = createForm()
    const patch = createAiDrawDraftPatch(form, {
      promptPositive: 'manual positive',
      promptNegative: '',
      defaultNegative: 'default negative',
    })

    form.stylePresetIds.push('mutated')

    expect(patch.promptPositive).toBe('manual positive')
    expect(patch.promptNegative).toBe('default negative')
    expect(patch.stylePresetIds).toEqual(['preset-a'])
  })

  it('applies a draft to the reactive form shape', () => {
    const form = createForm()

    applyAiDrawDraftToForm(form, createDraft(), 'default negative')

    expect(form.promptPositive).toBe('restored positive')
    expect(form.promptNegative).toBe('default negative')
    expect(form.stylePresetIds).toEqual(['restored'])
  })
})
