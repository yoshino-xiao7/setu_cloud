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

function createForm(overrides: Record<string, unknown> = {}) {
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
    disabledStylePresetIds: [] as string[],
    ...overrides,
  })
}

function createPromptTags(form: ReturnType<typeof createForm>, capabilities = createCapabilities()) {
  return useAiDrawPromptTags({
    capabilities: ref(capabilities),
    defaultNegative: 'default negative',
    dualCharacterPromptGuard: computed(() => form.generationMode === 'DUAL' ? 'two distinct characters' : ''),
    form,
    isDualMode: computed(() => form.generationMode === 'DUAL'),
    restoringDraft: ref(false),
    selectedCharacterMetadata: computed(() => ({})),
    selectedLoraAsset: computed(() => null),
    selectedSecondCharacterMetadata: computed(() => ({})),
    selectedSecondLoraAsset: computed(() => null),
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

  it('does not keep an unchecked style in the prompt used for generation', () => {
    const form = createForm({
      generationMode: 'SINGLE',
      promptPositive: '',
      promptNegative: '',
      triggerWords: '',
      stylePresetIds: ['cinematic'],
    })
    const promptTags = createPromptTags(form)

    promptTags.syncPresetPrompts()
    expect(form.promptPositive).toContain('cinematic lighting')
    expect(promptTags.mergedStyleTags()).toContain('cinematic lighting')

    form.stylePresetIds = []
    promptTags.syncPresetPrompts()

    expect(form.promptPositive).not.toContain('cinematic lighting')
    expect(form.promptNegative).not.toContain('flat color')
    expect(promptTags.mergedStyleTags()).not.toContain('cinematic lighting')
  })

  it('treats a disabled style as unchecked even if it stays in the selected list', () => {
    const form = createForm({
      generationMode: 'SINGLE',
      promptPositive: '',
      promptNegative: '',
      triggerWords: '',
      stylePresetIds: ['cinematic'],
    })
    const promptTags = createPromptTags(form)

    promptTags.syncPresetPrompts()
    form.disabledStylePresetIds = ['cinematic']
    promptTags.syncPresetPrompts()

    expect(form.promptPositive).not.toContain('cinematic lighting')
    expect(promptTags.selectedStylePresetNames.value).toBe('不使用风格预设')
    expect(promptTags.mergedStyleTags()).not.toContain('cinematic lighting')
  })

  it('strips leftover style-preset tags after translation even when the style was never checked this session', () => {
    const form = createForm({
      generationMode: 'SINGLE',
      promptPositive: 'silver hair, cinematic lighting, masterpiece',
      promptNegative: 'bad hands, flat color',
      triggerWords: '',
      stylePresetIds: [],
      disabledStylePresetIds: [],
    })
    const promptTags = createPromptTags(form)

    promptTags.syncPresetPrompts()

    expect(form.promptPositive).not.toContain('cinematic lighting')
    expect(form.promptPositive).toContain('silver hair')
    expect(form.promptPositive).toContain('masterpiece')
    expect(form.promptNegative).not.toContain('flat color')
    expect(promptTags.mergedStyleTags()).not.toContain('cinematic lighting')
  })
})
