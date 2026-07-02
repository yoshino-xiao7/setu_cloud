import type { ComputedRef, Ref } from 'vue'
import type { AiCapabilityResponse } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import { computed, ref } from 'vue'
import {
  firstText,
  mergeUniqueTags,
  normalizeAssetFileName,
  normalizeTagKey,
  parseMetadata,
} from '@/composables/useAiAssets'

const DUAL_CHARACTER_BLOCKED_TAGS = new Set([
  '1girl',
  '1boy',
  'solo',
  'solo focus',
  'single girl',
  'single boy',
  'one girl',
  'one boy',
])

export interface AiDrawPromptTagsOptions {
  capabilities: Ref<AiCapabilityResponse>
  defaultNegative: string
  dualCharacterPromptGuard: ComputedRef<string>
  form: AiDrawDraftForm
  isDualMode: ComputedRef<boolean>
  restoringDraft: Ref<boolean>
  selectedCharacterMetadata: ComputedRef<Record<string, unknown>>
  selectedLoraAsset: ComputedRef<AssetOption | null>
  selectedSecondCharacterMetadata: ComputedRef<Record<string, unknown>>
  selectedSecondLoraAsset: ComputedRef<AssetOption | null>
}

export function filterAiDrawDualCharacterTags(prompt: string) {
  if (!prompt)
    return ''
  return prompt
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag && !DUAL_CHARACTER_BLOCKED_TAGS.has(normalizeTagKey(tag)))
    .join(', ')
}

export function subtractAiDrawInjectedTags(prompt: string, injected: string) {
  if (!prompt || !injected)
    return prompt
  const injectedKeys = new Set(injected
    .split(',')
    .map(tag => normalizeTagKey(tag))
    .filter(Boolean))
  if (!injectedKeys.size)
    return prompt
  return prompt
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag && !injectedKeys.has(normalizeTagKey(tag)))
    .join(', ')
}

export function getAiDrawAssetPromptTags(asset: AssetOption | null) {
  if (!asset)
    return ''
  return firstText(asset.triggerWords, normalizeAssetFileName(asset.fileName), asset.displayName)
}

export function getAiDrawCharacterInjectedTags(metadata: Record<string, unknown>) {
  return [
    firstText(metadata.trigger_words, metadata.triggerWords),
    firstText(metadata.default_positive, metadata.defaultPositive),
    firstText(metadata.style_tags, metadata.styleTags),
  ].filter(Boolean).join(', ')
}

export function useAiDrawPromptTags(options: AiDrawPromptTagsOptions) {
  const syncingPresetPrompts = ref(false)
  const lastInjectedPositivePrompt = ref('')
  const lastInjectedNegativePrompt = ref('')

  const characterInjectedTags = computed(() => getAiDrawCharacterInjectedTags(options.selectedCharacterMetadata.value))
  const secondCharacterInjectedTags = computed(() => getAiDrawCharacterInjectedTags(options.selectedSecondCharacterMetadata.value))

  const availableStylePromptPresets = computed(() => {
    return (options.capabilities.value.promptPresets || [])
      .map((item) => {
        const metadata = parseMetadata(item.metadataJson)
        return {
          label: firstText(metadata.name, item.displayName, item.name),
          value: item.name,
          category: firstText(metadata.category, '风格预设'),
          categoryType: firstText(metadata.category_type, metadata.categoryType, '风格'),
          tags: mergeUniqueTags(
            firstText(metadata.trigger_words, metadata.triggerWords),
            firstText(metadata.default_positive, metadata.defaultPositive),
            firstText(metadata.style_tags, metadata.styleTags),
          ),
          negativeTags: firstText(metadata.default_negative, metadata.defaultNegative),
          notes: firstText(metadata.notes, metadata.description, ''),
        }
      })
      .filter(preset => preset.value && (preset.tags || preset.negativeTags))
  })

  const selectedStylePresetTags = computed(() => {
    const selected = new Set(options.form.stylePresetIds)
    return mergeUniqueTags(...availableStylePromptPresets.value
      .filter(preset => selected.has(preset.value))
      .map(preset => preset.tags))
  })

  const selectedStylePresetNegativeTags = computed(() => {
    const selected = new Set(options.form.stylePresetIds)
    return mergeUniqueTags(...availableStylePromptPresets.value
      .filter(preset => selected.has(preset.value))
      .map(preset => preset.negativeTags))
  })

  const selectedStylePresetSummary = computed(() => {
    if (!availableStylePromptPresets.value.length)
      return '本地 worker 未上报风格预设'
    const selected = availableStylePromptPresets.value.filter(preset => options.form.stylePresetIds.includes(preset.value))
    if (!selected.length)
      return '未选择风格预设'
    return `已选择 ${selected.length} 个：${selected.map(preset => preset.label).join('、')}`
  })

  const selectedStylePresetNames = computed(() => {
    const selected = new Set(options.form.stylePresetIds)
    const names = availableStylePromptPresets.value
      .filter(preset => selected.has(preset.value))
      .map(preset => preset.label)
    return names.length ? names.join('、') : '不使用风格预设'
  })

  const presetPositivePrompt = computed(() => mergeUniqueTags(
    options.isDualMode.value ? filterAiDrawDualCharacterTags(characterInjectedTags.value) : characterInjectedTags.value,
    options.isDualMode.value ? filterAiDrawDualCharacterTags(secondCharacterInjectedTags.value) : '',
    getAiDrawAssetPromptTags(options.selectedLoraAsset.value),
    options.isDualMode.value ? getAiDrawAssetPromptTags(options.selectedSecondLoraAsset.value) : '',
    options.dualCharacterPromptGuard.value,
    selectedStylePresetTags.value,
    options.form.triggerWords,
    options.form.styleTags,
  ))

  const effectivePositivePrompt = computed(() => {
    const prompt = options.form.promptPositive.trim()
    return options.isDualMode.value ? filterAiDrawDualCharacterTags(prompt) : prompt
  })
  const effectiveNegativePrompt = computed(() => options.form.promptNegative.trim())

  const editableInjectedTagList = computed(() => {
    return presetPositivePrompt.value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
  })

  const editableInjectedTagsPreview = computed(() => {
    const tags = editableInjectedTagList.value
    if (!tags.length)
      return selectedStylePresetNegativeTags.value ? '已注入风格反向提示词' : ''
    const preview = tags.slice(0, 8).join(', ')
    return tags.length > 8 ? `${preview} ...` : preview
  })

  function mergedStyleTags() {
    return mergeUniqueTags(
      selectedStylePresetTags.value,
      options.form.triggerWords,
      options.form.styleTags,
      options.isDualMode.value ? filterAiDrawDualCharacterTags(characterInjectedTags.value) : characterInjectedTags.value,
      options.isDualMode.value ? filterAiDrawDualCharacterTags(secondCharacterInjectedTags.value) : '',
      options.dualCharacterPromptGuard.value,
    )
  }

  function syncPresetPrompts() {
    if (options.restoringDraft.value)
      return
    syncingPresetPrompts.value = true
    try {
      const nextPositive = options.isDualMode.value ? filterAiDrawDualCharacterTags(presetPositivePrompt.value) : presetPositivePrompt.value
      const nextNegative = selectedStylePresetNegativeTags.value
      const manualPositive = subtractAiDrawInjectedTags(options.form.promptPositive, lastInjectedPositivePrompt.value)
      const manualNegative = subtractAiDrawInjectedTags(options.form.promptNegative, lastInjectedNegativePrompt.value)
      options.form.promptPositive = options.isDualMode.value
        ? filterAiDrawDualCharacterTags(mergeUniqueTags(manualPositive, nextPositive))
        : mergeUniqueTags(manualPositive, nextPositive)
      options.form.promptNegative = mergeUniqueTags(manualNegative || options.defaultNegative, nextNegative)
      lastInjectedPositivePrompt.value = nextPositive
      lastInjectedNegativePrompt.value = nextNegative
    }
    finally {
      syncingPresetPrompts.value = false
    }
  }

  function getDraftPromptPatch() {
    const manualPositive = subtractAiDrawInjectedTags(options.form.promptPositive, lastInjectedPositivePrompt.value)
    const manualNegative = subtractAiDrawInjectedTags(options.form.promptNegative, lastInjectedNegativePrompt.value)
    return {
      promptPositive: options.isDualMode.value ? filterAiDrawDualCharacterTags(manualPositive) : manualPositive,
      promptNegative: manualNegative,
      defaultNegative: options.defaultNegative,
    }
  }

  return {
    availableStylePromptPresets,
    characterInjectedTags,
    editableInjectedTagList,
    editableInjectedTagsPreview,
    effectiveNegativePrompt,
    effectivePositivePrompt,
    getDraftPromptPatch,
    mergedStyleTags,
    presetPositivePrompt,
    secondCharacterInjectedTags,
    selectedStylePresetNames,
    selectedStylePresetNegativeTags,
    selectedStylePresetSummary,
    selectedStylePresetTags,
    syncingPresetPrompts,
    syncPresetPrompts,
  }
}
