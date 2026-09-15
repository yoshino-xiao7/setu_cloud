import type { ComputedRef, Ref } from 'vue'
import type { AiCapabilityResponse } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import { computed, ref, watch } from 'vue'
import {
  firstText,
  mergeUniqueTags,
  normalizeAssetFileName,
  normalizeTagKey,
  parseMetadata,
} from '@/composables/useAiAssets'

const CHARACTER_STYLE_DROP = new Set([
  'anime style',
  'detailed eyes',
  'high quality',
  'masterpiece',
  'best quality',
  'highres',
  'cute',
  'elegant',
  'ethereal',
  'idol',
  'dancer',
  'bare shoulders',
  'nontraditional miko',
  'traditional miko',
])

const CHARACTER_BODY_RE = /\b(breasts?|cleavage|thighs?|midriff|navel|hips)\b/i
const CHARACTER_OUTFIT_RE = /\b(clothes|clothing|outfit|uniform|dress|skirt|shirt|blouse|jacket|coat|kimono|sleeves?|gloves?|gauntlets?|pantyhose|stockings?|thighhighs?|socks?|shoes?|boots?|obi|robe|cape|cloak|armor|bodysuit|leotard|swimsuit|shorts|necktie|maid|suit|pants|jeans|bikini|underwear|vest|hoodie|sweater|apron)\b/i

const TRY_ON_KEYS = new Set(['trying on clothes', 'changing clothes', 'half undressed', 'half-dressed', 'putting on clothes', 'undressing'])
const MIRROR_KEYS = new Set(['mirror', 'full-length mirror', 'reflection', 'looking at reflection', 'looking at own reflection'])
const NUDE_KEYS = new Set(['nude', 'naked', 'completely nude', 'fully nude', 'standing in front of mirror nude'])
const OUTDOOR_KEYS = new Set(['beach', 'beach setting', 'ocean', 'pool', 'outdoor', 'summer'])
const SMILE_KEYS = new Set(['happy expression', 'playful pose', 'light smile', 'smile', 'smiling'])
const CALM_KEYS = new Set(['calm expression', 'closed mouth', 'relaxed expression'])
const STACK_JUNK_KEYS = new Set(['coverage', 'in adorable bikini', 'different clothes', 'currently half undressed', 'front of mirror trying'])
const COMPETING_IF_BIKINI = new Set([
  'dress', 'sundress', 'kimono', 'hanfu', 'china dress', 'school uniform',
  'casual clothes', 'clothing', 'outfit', 'coat', 'jacket', 'blouse', 'shirt',
  'sweater', 'nude', 'naked', 'fully nude', 'standing in front of mirror nude',
])

function promptTagKey(tag: string) {
  return tag.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

function hasPromptKey(keys: Set<string>, candidates: Set<string>) {
  for (const item of candidates) {
    for (const key of keys) {
      if (key === item || key.includes(item))
        return true
    }
  }
  return false
}

export function composeStackedPromptTags(positive: string) {
  const tags = positive.split(',').map(tag => tag.trim()).filter(Boolean)
  const keys = new Set(tags.map(promptTagKey))
  const hasBikini = [...keys].some(key => key.includes('bikini') || key === 'two piece swimsuit' || key === 'two-piece swimsuit')
  const hasTryOn = hasPromptKey(keys, TRY_ON_KEYS)
  const hasMirror = hasPromptKey(keys, MIRROR_KEYS)
  const hasGarment = hasBikini || hasPromptKey(keys, new Set(['dress', 'skirt', 'swimsuit', 'one piece swimsuit', 'school swimsuit']))
  const drop = new Set(STACK_JUNK_KEYS)
  const extras: string[] = []
  if (hasGarment && hasTryOn) {
    NUDE_KEYS.forEach(key => drop.add(key))
    drop.add('different clothes')
    drop.add('currently half undressed')
    if (hasBikini) {
      extras.push('trying on bikini', 'putting on bikini')
    }
  }
  if (hasMirror) {
    extras.push('matching reflection', 'same pose in reflection', 'same expression in reflection')
    if (hasGarment || hasTryOn) {
      NUDE_KEYS.forEach(key => drop.add(key))
      OUTDOOR_KEYS.forEach(key => drop.add(key))
    }
  }
  if ([...keys].some(key => SMILE_KEYS.has(key)) && [...keys].some(key => CALM_KEYS.has(key)))
    CALM_KEYS.forEach(key => drop.add(key))
  if (hasBikini)
    COMPETING_IF_BIKINI.forEach(key => drop.add(key))
  const kept = tags.filter((tag) => {
    const key = promptTagKey(tag)
    return !drop.has(key) && ![...drop].some(item => key.includes(item))
  })
  return mergeUniqueTags(kept.join(', '), extras.join(', '))
}

export function composeStackedNegativeTags(negative: string, positive: string) {
  const keys = new Set(positive.split(',').map(tag => promptTagKey(tag)).filter(Boolean))
  const drop = new Set<string>()
  if ([...keys].some(key => key.includes('bikini')) || hasPromptKey(keys, TRY_ON_KEYS)) {
    drop.add('clothed')
    drop.add('fully clothed')
  }
  if ([...keys].some(key => SMILE_KEYS.has(key))) {
    drop.add('smiling')
    drop.add('smile')
    drop.add('open mouth')
    drop.add('grin')
    drop.add('winking')
  }
  return negative
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag && !drop.has(promptTagKey(tag)))
    .join(', ')
}

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

export function shouldTreatRestoredAiDrawPositiveAsManual(promptCn: string, promptPositive: string) {
  return !promptCn.trim() && !!promptPositive.trim()
}

export function reconcileAiDrawPositivePromptAfterNaturalLanguageChange(options: {
  previousPromptCn: string
  nextPromptCn: string
  promptPositive: string
  presetPositivePrompt: string
  manuallyEdited: boolean
}) {
  const previous = options.previousPromptCn.trim()
  const next = options.nextPromptCn.trim()
  if (previous && !next && !options.manuallyEdited)
    return options.presetPositivePrompt.trim()
  return options.promptPositive
}

export function getAiDrawAssetPromptTags(asset: AssetOption | null) {
  if (!asset)
    return ''
  return firstText(asset.triggerWords, normalizeAssetFileName(asset.fileName), asset.displayName)
}

export function isAiDrawCharacterIdentityTag(tag: string) {
  const key = normalizeTagKey(tag)
  if (!key || CHARACTER_STYLE_DROP.has(key))
    return false
  if (CHARACTER_BODY_RE.test(key) || CHARACTER_OUTFIT_RE.test(key))
    return false
  return true
}

export function getAiDrawCharacterInjectedTags(metadata: Record<string, unknown>) {
  return [
    firstText(metadata.trigger_words, metadata.triggerWords),
    firstText(metadata.default_positive, metadata.defaultPositive),
  ].filter(Boolean).join(', ')
    .split(',')
    .map(tag => tag.trim())
    .filter(isAiDrawCharacterIdentityTag)
    .join(', ')
}

export function useAiDrawPromptTags(options: AiDrawPromptTagsOptions) {
  const syncingPresetPrompts = ref(false)
  const lastInjectedPositivePrompt = ref('')
  const lastInjectedNegativePrompt = ref('')
  const positivePromptManuallyEdited = ref(false)

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

  function isEnabledStylePreset(value: string) {
    return options.form.stylePresetIds.includes(value) && !(options.form.disabledStylePresetIds ?? []).includes(value)
  }

  const selectedStylePresets = computed(() => {
    return availableStylePromptPresets.value.filter(preset => isEnabledStylePreset(preset.value))
  })

  const unselectedStylePresets = computed(() => {
    return availableStylePromptPresets.value.filter(preset => !isEnabledStylePreset(preset.value))
  })

  const selectedStylePresetTags = computed(() => {
    return composeStackedPromptTags(mergeUniqueTags(...selectedStylePresets.value.map(preset => preset.tags)))
  })

  const selectedStylePresetNegativeTags = computed(() => {
    return composeStackedNegativeTags(
      mergeUniqueTags(...selectedStylePresets.value.map(preset => preset.negativeTags)),
      selectedStylePresetTags.value,
    )
  })

  const unselectedStylePresetTags = computed(() => {
    return mergeUniqueTags(...unselectedStylePresets.value.map(preset => preset.tags))
  })

  const unselectedStylePresetNegativeTags = computed(() => {
    return mergeUniqueTags(...unselectedStylePresets.value.map(preset => preset.negativeTags))
  })

  function stripInactiveStyleTags(prompt: string, previouslyInjected: string, unselected: string) {
    return subtractAiDrawInjectedTags(
      subtractAiDrawInjectedTags(prompt, previouslyInjected),
      unselected,
    )
  }

  const selectedStylePresetSummary = computed(() => {
    if (!availableStylePromptPresets.value.length)
      return '本地 worker 未上报风格预设'
    const disabled = new Set(options.form.disabledStylePresetIds)
    const selected = availableStylePromptPresets.value
      .filter(preset => options.form.stylePresetIds.includes(preset.value) && !disabled.has(preset.value))
    if (!selected.length)
      return '未选择风格预设'
    return `已选择 ${selected.length} 个：${selected.map(preset => preset.label).join('、')}`
  })

  const selectedStylePresetNames = computed(() => {
    const selected = new Set(options.form.stylePresetIds)
    const disabled = new Set(options.form.disabledStylePresetIds)
    const names = availableStylePromptPresets.value
      .filter(preset => selected.has(preset.value) && !disabled.has(preset.value))
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
      const manualPositive = stripInactiveStyleTags(
        options.form.promptPositive,
        lastInjectedPositivePrompt.value,
        unselectedStylePresetTags.value,
      )
      const manualNegative = stripInactiveStyleTags(
        options.form.promptNegative,
        lastInjectedNegativePrompt.value,
        unselectedStylePresetNegativeTags.value,
      )
      const mergedPositive = options.isDualMode.value
        ? filterAiDrawDualCharacterTags(mergeUniqueTags(manualPositive, nextPositive))
        : mergeUniqueTags(manualPositive, nextPositive)
      options.form.promptPositive = composeStackedPromptTags(mergedPositive)
      options.form.promptNegative = composeStackedNegativeTags(
        mergeUniqueTags(manualNegative || options.defaultNegative, nextNegative),
        options.form.promptPositive,
      )
      lastInjectedPositivePrompt.value = nextPositive
      lastInjectedNegativePrompt.value = nextNegative
    }
    finally {
      syncingPresetPrompts.value = false
    }
  }

  function getDraftPromptPatch() {
    const manualPositive = stripInactiveStyleTags(
      options.form.promptPositive,
      lastInjectedPositivePrompt.value,
      unselectedStylePresetTags.value,
    )
    const manualNegative = stripInactiveStyleTags(
      options.form.promptNegative,
      lastInjectedNegativePrompt.value,
      unselectedStylePresetNegativeTags.value,
    )
    return {
      promptPositive: options.isDualMode.value ? filterAiDrawDualCharacterTags(manualPositive) : manualPositive,
      promptNegative: manualNegative,
      defaultNegative: options.defaultNegative,
    }
  }

  function markPositivePromptDerived() {
    positivePromptManuallyEdited.value = false
  }

  function rememberRestoredPromptAuthorship() {
    positivePromptManuallyEdited.value = shouldTreatRestoredAiDrawPositiveAsManual(
      options.form.promptCn,
      options.form.promptPositive,
    )
  }

  watch(() => options.form.promptPositive, () => {
    if (options.restoringDraft.value || syncingPresetPrompts.value)
      return
    positivePromptManuallyEdited.value = true
  })

  watch(() => options.form.promptCn, (next, previous) => {
    if (options.restoringDraft.value)
      return
    const reconciled = reconcileAiDrawPositivePromptAfterNaturalLanguageChange({
      previousPromptCn: previous ?? '',
      nextPromptCn: next,
      promptPositive: options.form.promptPositive,
      presetPositivePrompt: presetPositivePrompt.value,
      manuallyEdited: positivePromptManuallyEdited.value,
    })
    if (reconciled === options.form.promptPositive)
      return
    syncingPresetPrompts.value = true
    options.form.promptPositive = reconciled
    if (!next.trim() && !positivePromptManuallyEdited.value)
      options.form.styleNotes = ''
    syncingPresetPrompts.value = false
  })

  return {
    availableStylePromptPresets,
    characterInjectedTags,
    editableInjectedTagList,
    editableInjectedTagsPreview,
    effectiveNegativePrompt,
    effectivePositivePrompt,
    getDraftPromptPatch,
    markPositivePromptDerived,
    mergedStyleTags,
    presetPositivePrompt,
    rememberRestoredPromptAuthorship,
    secondCharacterInjectedTags,
    selectedStylePresetNames,
    selectedStylePresetNegativeTags,
    selectedStylePresetSummary,
    selectedStylePresetTags,
    syncingPresetPrompts,
    syncPresetPrompts,
  }
}
