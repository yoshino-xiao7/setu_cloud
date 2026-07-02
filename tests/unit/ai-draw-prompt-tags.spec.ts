import type { AiCapabilityResponse } from '@/api/aiGeneration'
import { describe, expect, it } from 'vitest'
import { computed, reactive, ref } from 'vue'
import {
  filterAiDrawDualCharacterTags,
  getAiDrawAssetPromptTags,
  getAiDrawCharacterInjectedTags,
  subtractAiDrawInjectedTags,
  useAiDrawPromptTags,
} from '@/composables/useAiDrawPromptTags'

function createCapabilities(): AiCapabilityResponse {
  return {
    checkpoints: [],
    loras: [],
    vaes: [],
    characters: [],
    workers: [],
    promptPresets: [
      {
        name: 'cinematic',
        displayName: '电影感',
        metadataJson: JSON.stringify({
          trigger_words: 'cinematic lighting, solo',
          default_negative: 'flat color',
        }),
      },
    ],
  }
}

function createForm() {
  return reactive({
    generationMode: 'DUAL' as const,
    nsfwMode: false,
    nsfwVisibilityLevel: 'STANDARD' as const,
    promptCn: '',
    promptPositive: 'hand written, old injected',
    promptNegative: 'bad hands',
    styleNotes: '',
    width: 832,
    height: 1216,
    steps: 35,
    cfg: 4.5,
    seed: null,
    checkpoint: '',
    loraName: '',
    loraStrength: 1,
    characterId: '',
    secondLoraName: '',
    secondLoraStrength: 0.65,
    secondCharacterId: '',
    triggerWords: '1girl, detailed eyes',
    styleTags: '',
    stylePresetIds: ['cinematic'],
  })
}

describe('ai draw prompt tag helpers', () => {
  it('filters single-character tags in dual mode', () => {
    expect(filterAiDrawDualCharacterTags('1girl, solo, blue hair, SOLO FOCUS, red dress'))
      .toBe('blue hair, red dress')
  })

  it('subtracts injected tags without removing manual text', () => {
    expect(subtractAiDrawInjectedTags('manual, old injected, Old_Injected', 'old injected'))
      .toBe('manual')
  })

  it('derives prompt tags from assets and character metadata', () => {
    expect(getAiDrawAssetPromptTags({
      name: 'asset',
      displayName: 'Pretty Asset',
      category: '',
      categoryType: '',
      triggerWords: '',
      recommendedStrength: null,
      recommendedCheckpoint: '',
      previewImage: '',
      notes: '',
      fileName: 'pretty_asset.safetensors',
      metadata: {},
    })).toBe('pretty asset')

    expect(getAiDrawCharacterInjectedTags({
      trigger_words: 'blue hair',
      default_positive: 'school uniform',
      style_tags: 'soft light',
    })).toBe('blue hair, school uniform, soft light')
  })

  it('syncs preset prompts while preserving manual prompt text', () => {
    const form = createForm()
    const promptTags = useAiDrawPromptTags({
      capabilities: ref(createCapabilities()),
      defaultNegative: 'default negative',
      dualCharacterPromptGuard: computed(() => 'two distinct characters'),
      form,
      isDualMode: computed(() => form.generationMode === 'DUAL'),
      restoringDraft: ref(false),
      selectedCharacterMetadata: computed(() => ({ trigger_words: '1girl, blue hair' })),
      selectedLoraAsset: computed(() => null),
      selectedSecondCharacterMetadata: computed(() => ({ trigger_words: 'red dress' })),
      selectedSecondLoraAsset: computed(() => null),
    })

    promptTags.syncPresetPrompts()

    expect(form.promptPositive).toContain('hand written')
    expect(form.promptPositive).toContain('blue hair')
    expect(form.promptPositive).toContain('red dress')
    expect(form.promptPositive).toContain('two distinct characters')
    expect(form.promptPositive).not.toContain('1girl')
    expect(form.promptPositive).not.toContain('solo')
    expect(form.promptNegative).toBe('bad hands, flat color')
    expect(promptTags.getDraftPromptPatch()).toEqual({
      promptPositive: 'hand written, old injected',
      promptNegative: 'bad hands',
      defaultNegative: 'default negative',
    })
  })
})
