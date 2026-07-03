import type { AiCapabilityResponse, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import type { AssetOption, StylePromptPreset } from '@/composables/useAiAssets'
import { useMessage } from 'naive-ui'
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAiCapabilities } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import {
  ALL_DIRECTORY_KEY,
  assetCompactSummary,
  assetDirectoryTree,
  filterAssets,
  firstNumber,
  firstText,
  parseMetadata,
  toAssetOption,
  toStylePromptPreset,
} from '@/composables/useAiAssets'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAiDrawDraftStore } from '@/stores/aiDrawDraft'

type SelectorTab = 'lora' | 'character' | 'style'
type SelectorTarget = 'primary' | 'secondary'
type StyleSafetyFilter = 'all' | 'sfw' | 'nsfw'

const NSFW_LORA_STRENGTHS: Record<AiNsfwVisibilityLevel, number> = {
  LIGHT: 0.65,
  STANDARD: 0.6,
  STRONG: 0.55,
}

export const AI_ASSET_PAGE_SIZE_OPTIONS = [24, 48, 96]
const DEFAULT_PAGE_SIZE = 24

function normalizeTab(value: unknown): SelectorTab {
  return value === 'character' || value === 'style' || value === 'lora' ? value : 'lora'
}

function normalizeTarget(value: unknown): SelectorTarget {
  return value === 'secondary' ? 'secondary' : 'primary'
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize))
}

function styleTypeLabel(preset: StylePromptPreset) {
  return preset.categoryType || '未分组'
}

function styleDirectoryTree(presets: StylePromptPreset[]) {
  const typeMap = new Map<string, Map<string, number>>()
  for (const preset of presets) {
    const type = styleTypeLabel(preset)
    if (!typeMap.has(type))
      typeMap.set(type, new Map())
    const categoryMap = typeMap.get(type)!
    categoryMap.set(preset.category, (categoryMap.get(preset.category) || 0) + 1)
  }

  return [
    {
      label: `全部 (${presets.length})`,
      key: ALL_DIRECTORY_KEY,
    },
    ...Array.from(typeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
      .map(([type, categoryMap]) => {
        const total = Array.from(categoryMap.values()).reduce((sum, count) => sum + count, 0)
        return {
          label: `${type} (${total})`,
          key: `type:${encodeURIComponent(type)}`,
          children: Array.from(categoryMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
            .map(([category, count]) => ({
              label: `${category} (${count})`,
              key: `category:${encodeURIComponent(type)}:${encodeURIComponent(category)}`,
            })),
        }
      }),
  ]
}

function parseStyleDirectoryKey(key: string) {
  if (key === ALL_DIRECTORY_KEY)
    return { mode: 'all', type: '', category: '' }
  if (key.startsWith('type:'))
    return { mode: 'type', type: decodeURIComponent(key.slice(5)), category: '' }
  if (key.startsWith('category:')) {
    const [, encodedType = '', encodedCategory = ''] = key.split(':')
    return {
      mode: 'category',
      type: decodeURIComponent(encodedType),
      category: decodeURIComponent(encodedCategory),
    }
  }
  return { mode: 'all', type: '', category: '' }
}

export function useAiAssetSelector() {
  const route = useRoute()
  const router = useRouter()
  const message = useMessage()
  const draftStore = useAiDrawDraftStore()

  const activeTab = ref<SelectorTab>(normalizeTab(route.query.tab))
  const target = ref<SelectorTarget>(normalizeTarget(route.query.target))
  const loading = ref(false)
  const loraSearch = ref('')
  const characterSearch = ref('')
  const styleSearch = ref('')
  const styleSafetyFilter = ref<StyleSafetyFilter>('all')
  const styleCheckpointFilter = ref(draftStore.checkpoint || '')
  const loraPage = ref(1)
  const characterPage = ref(1)
  const stylePage = ref(1)
  const loraPageSize = ref(DEFAULT_PAGE_SIZE)
  const characterPageSize = ref(DEFAULT_PAGE_SIZE)
  const stylePageSize = ref(DEFAULT_PAGE_SIZE)
  const loraDirectoryKeys = ref<string[]>([ALL_DIRECTORY_KEY])
  const characterDirectoryKeys = ref<string[]>([ALL_DIRECTORY_KEY])
  const styleDirectoryKeys = ref<string[]>([ALL_DIRECTORY_KEY])
  const assetDetailOpen = ref(false)
  const assetDetailKind = ref<'lora' | 'character'>('lora')
  const assetDetailTarget = ref<AssetOption | null>(null)
  const styleDetailOpen = ref(false)
  const styleDetailTarget = ref<StylePromptPreset | null>(null)

  const capabilities = shallowRef<AiCapabilityResponse>({
    checkpoints: [],
    loras: [],
    vaes: [],
    characters: [],
    promptPresets: [],
    workers: [],
  })

  const draft = reactive({
    generationMode: draftStore.generationMode,
    nsfwMode: draftStore.nsfwMode,
    nsfwVisibilityLevel: draftStore.nsfwVisibilityLevel,
    loraName: draftStore.loraName,
    loraStrength: draftStore.loraStrength,
    characterId: draftStore.characterId,
    secondLoraName: draftStore.secondLoraName,
    secondLoraStrength: draftStore.secondLoraStrength,
    secondCharacterId: draftStore.secondCharacterId,
    triggerWords: draftStore.triggerWords,
    checkpoint: draftStore.checkpoint,
    styleTags: draftStore.styleTags,
    stylePresetIds: [...draftStore.stylePresetIds],
    disabledStylePresetIds: [...draftStore.disabledStylePresetIds],
  })

  const loraAssets = computed(() => capabilities.value.loras.map(item => toAssetOption(item, '未分类')))
  const characterAssets = computed(() => capabilities.value.characters.map(item => toAssetOption(item, '未分类角色')))
  const stylePresets = computed(() => (capabilities.value.promptPresets || [])
    .map(toStylePromptPreset)
    .filter(preset => preset.value && (preset.tags || preset.negativeTags)))

  const loraDirectoryTree = computed(() => assetDirectoryTree(loraAssets.value))
  const characterDirectoryTree = computed(() => assetDirectoryTree(characterAssets.value))
  const safetyFilteredStylePresets = computed(() => {
    if (styleSafetyFilter.value === 'nsfw')
      return stylePresets.value.filter(preset => preset.nsfwOnly)
    if (styleSafetyFilter.value === 'sfw')
      return stylePresets.value.filter(preset => !preset.nsfwOnly)
    return stylePresets.value
  })
  const styleSafetyOptions = computed(() => {
    const sfwCount = stylePresets.value.filter(preset => !preset.nsfwOnly).length
    const nsfwCount = stylePresets.value.filter(preset => preset.nsfwOnly).length
    return {
      all: stylePresets.value.length,
      sfw: sfwCount,
      nsfw: nsfwCount,
    }
  })
  const visibleStylePresetDirectoryTree = computed(() => styleDirectoryTree(safetyFilteredStylePresets.value))
  const styleCheckpointOptions = computed(() => {
    const names = new Set<string>()
    for (const preset of stylePresets.value) {
      if (preset.recommendedCheckpoint)
        names.add(preset.recommendedCheckpoint)
    }
    for (const checkpoint of capabilities.value.checkpoints) {
      if (checkpoint.name)
        names.add(checkpoint.name)
    }

    const options = [
      { label: '全部推荐模型', value: '' },
    ]
    if (draft.checkpoint) {
      options.push({
        label: `当前 Checkpoint：${draft.checkpoint}`,
        value: draft.checkpoint,
      })
    }
    for (const name of Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
      if (name !== draft.checkpoint)
        options.push({ label: name, value: name })
    }
    return options
  })

  const filteredLoraAssets = computed(() => filterAssets(loraAssets.value, loraSearch.value, loraDirectoryKeys.value[0] || ALL_DIRECTORY_KEY))
  const filteredCharacterAssets = computed(() => filterAssets(characterAssets.value, characterSearch.value, characterDirectoryKeys.value[0] || ALL_DIRECTORY_KEY))
  const filteredStylePresets = computed(() => {
    const keyword = styleSearch.value.trim().toLowerCase()
    const directory = parseStyleDirectoryKey(styleDirectoryKeys.value[0] || ALL_DIRECTORY_KEY)
    const checkpoint = styleCheckpointFilter.value
    return safetyFilteredStylePresets.value.filter((preset) => {
      if (directory.mode === 'type' && styleTypeLabel(preset) !== directory.type)
        return false
      if (directory.mode === 'category' && (styleTypeLabel(preset) !== directory.type || preset.category !== directory.category))
        return false
      if (checkpoint && preset.recommendedCheckpoint !== checkpoint)
        return false
      if (!keyword)
        return true
      return [
        preset.label,
        preset.value,
        preset.category,
        preset.categoryType,
        preset.tags,
        preset.negativeTags,
        preset.recommendedCheckpoint,
        preset.notes,
      ].some(value => value.toLowerCase().includes(keyword))
    })
  })

  const paginatedLoraAssets = computed(() => paginate(filteredLoraAssets.value, loraPage.value, loraPageSize.value))
  const paginatedCharacterAssets = computed(() => paginate(filteredCharacterAssets.value, characterPage.value, characterPageSize.value))
  const paginatedStylePresets = computed(() => paginate(filteredStylePresets.value, stylePage.value, stylePageSize.value))

  watch([loraSearch, () => loraDirectoryKeys.value[0]], () => {
    loraPage.value = 1
  })

  watch([characterSearch, () => characterDirectoryKeys.value[0]], () => {
    characterPage.value = 1
  })

  watch(styleSafetyFilter, () => {
    styleDirectoryKeys.value = [ALL_DIRECTORY_KEY]
    stylePage.value = 1
  })

  watch([styleSearch, styleCheckpointFilter, () => styleDirectoryKeys.value[0]], () => {
    stylePage.value = 1
  })

  watch([() => filteredLoraAssets.value.length, loraPageSize], ([total, size]) => {
    loraPage.value = Math.min(loraPage.value, pageCount(total, size))
  })

  watch([() => filteredCharacterAssets.value.length, characterPageSize], ([total, size]) => {
    characterPage.value = Math.min(characterPage.value, pageCount(total, size))
  })

  watch([() => filteredStylePresets.value.length, stylePageSize], ([total, size]) => {
    stylePage.value = Math.min(stylePage.value, pageCount(total, size))
  })

  const selectedLoraAsset = computed(() => loraAssets.value.find(item => item.name === draft.loraName) || null)
  const selectedSecondLoraAsset = computed(() => loraAssets.value.find(item => item.name === draft.secondLoraName) || null)
  const selectedCharacterAsset = computed(() => characterAssets.value.find(item => item.name === draft.characterId) || null)
  const selectedSecondCharacterAsset = computed(() => characterAssets.value.find(item => item.name === draft.secondCharacterId) || null)

  const currentLoraAsset = computed(() => target.value === 'secondary' ? selectedSecondLoraAsset.value : selectedLoraAsset.value)
  const currentCharacterAsset = computed(() => target.value === 'secondary' ? selectedSecondCharacterAsset.value : selectedCharacterAsset.value)
  const selectedStylePresets = computed(() => stylePresets.value.filter(preset => draft.stylePresetIds.includes(preset.value)))
  const styleSummary = computed(() => {
    if (!stylePresets.value.length)
      return '本地 worker 未上报风格预设'
    if (!selectedStylePresets.value.length)
      return '未选择风格预设'
    return `已选择 ${selectedStylePresets.value.length} 个：${selectedStylePresets.value.map(preset => preset.label).join('、')}`
  })

  function selectDirectory(keys: Array<string | number>) {
    return [String(keys[0] || ALL_DIRECTORY_KEY)]
  }

  function isSelectedLora(asset: AssetOption) {
    return target.value === 'secondary'
      ? draft.secondLoraName === asset.name
      : draft.loraName === asset.name
  }

  function isSelectedCharacter(asset: AssetOption) {
    return target.value === 'secondary'
      ? draft.secondCharacterId === asset.name
      : draft.characterId === asset.name
  }

  function isSelectedStylePreset(value: string) {
    return draft.stylePresetIds.includes(value)
  }

  function isEnabledStylePreset(value: string) {
    return isSelectedStylePreset(value) && !draft.disabledStylePresetIds.includes(value)
  }

  function selectLora(asset: AssetOption) {
    if (target.value === 'secondary') {
      draft.secondLoraName = asset.name
      if (draft.nsfwMode)
        draft.secondLoraStrength = NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
      else if (asset.recommendedStrength !== null)
        draft.secondLoraStrength = asset.recommendedStrength
      return
    }

    draft.loraName = asset.name
    if (draft.nsfwMode)
      draft.loraStrength = NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
    else if (asset.recommendedStrength !== null)
      draft.loraStrength = asset.recommendedStrength
    if (asset.triggerWords)
      draft.triggerWords = asset.triggerWords
  }

  function clearLora() {
    if (target.value === 'secondary') {
      draft.secondLoraName = ''
      draft.secondLoraStrength = draft.nsfwMode ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel] : 0.65
      return
    }
    draft.loraName = ''
    draft.loraStrength = draft.nsfwMode ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel] : 1
  }

  function selectCharacter(asset: AssetOption) {
    const metadata = asset.metadata || parseMetadata()
    const loraName = firstText(metadata.lora_name, metadata.loraName)
    if (target.value === 'secondary') {
      draft.secondCharacterId = asset.name
      if (loraName) {
        draft.secondLoraName = loraName
        draft.secondLoraStrength = draft.nsfwMode
          ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
          : firstNumber(metadata.lora_strength, metadata.loraStrength, metadata.recommended_strength, metadata.recommendedStrength) || 0.65
      }
      return
    }

    draft.characterId = asset.name
    draft.triggerWords = firstText(metadata.trigger_words, metadata.triggerWords)
    draft.styleTags = firstText(metadata.style_tags, metadata.styleTags) || draft.styleTags
    if (loraName) {
      draft.loraName = loraName
      draft.loraStrength = draft.nsfwMode
        ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
        : firstNumber(metadata.lora_strength, metadata.loraStrength, metadata.recommended_strength, metadata.recommendedStrength) || 1
    }
  }

  function clearCharacter() {
    if (target.value === 'secondary') {
      draft.secondCharacterId = ''
      draft.secondLoraName = ''
      draft.secondLoraStrength = 0.65
      return
    }
    draft.characterId = ''
  }

  function toggleStylePreset(value: string) {
    if (!value)
      return
    if (isSelectedStylePreset(value)) {
      removeStylePreset(value)
      return
    }
    draft.stylePresetIds = [...draft.stylePresetIds, value]
    draft.disabledStylePresetIds = draft.disabledStylePresetIds.filter(item => item !== value)
  }

  function removeStylePreset(value: string) {
    draft.stylePresetIds = draft.stylePresetIds.filter(item => item !== value)
    draft.disabledStylePresetIds = draft.disabledStylePresetIds.filter(item => item !== value)
  }

  function toggleStylePresetEnabled(value: string) {
    if (!isSelectedStylePreset(value))
      return

    draft.disabledStylePresetIds = isEnabledStylePreset(value)
      ? [...draft.disabledStylePresetIds, value]
      : draft.disabledStylePresetIds.filter(item => item !== value)
  }

  function clearStylePresets() {
    draft.stylePresetIds = []
    draft.disabledStylePresetIds = []
  }

  function openAssetDetail(kind: 'lora' | 'character', asset: AssetOption) {
    assetDetailKind.value = kind
    assetDetailTarget.value = asset
    assetDetailOpen.value = true
  }

  function openStyleDetail(preset: StylePromptPreset) {
    styleDetailTarget.value = preset
    styleDetailOpen.value = true
  }

  function stylePresetSummary(preset: StylePromptPreset) {
    return preset.notes || [preset.categoryType, preset.category].filter(Boolean).join(' / ') || '未配置说明'
  }

  async function loadCapabilities() {
    loading.value = true
    try {
      capabilities.value = unwrapApiData(await fetchAiCapabilities(), capabilities.value)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '加载模型能力失败')
    }
    finally {
      loading.value = false
    }
  }

  function cancel() {
    void router.push('/dashboard/ai-draw')
  }

  function done() {
    draftStore.commitAssetSelection({
      loraName: draft.loraName,
      loraStrength: draft.loraStrength,
      characterId: draft.characterId,
      secondLoraName: draft.secondLoraName,
      secondLoraStrength: draft.secondLoraStrength,
      secondCharacterId: draft.secondCharacterId,
      triggerWords: draft.triggerWords,
      styleTags: draft.styleTags,
      stylePresetIds: draft.stylePresetIds,
      disabledStylePresetIds: draft.disabledStylePresetIds,
    })
    void router.push('/dashboard/ai-draw')
  }

  onMounted(loadCapabilities)

  return {
    ALL_DIRECTORY_KEY,
    PAGE_SIZE_OPTIONS: AI_ASSET_PAGE_SIZE_OPTIONS,
    activeTab,
    assetCompactSummary,
    assetDetailKind,
    assetDetailOpen,
    assetDetailTarget,
    cancel,
    characterAssets,
    characterDirectoryKeys,
    characterDirectoryTree,
    characterPage,
    characterPageSize,
    characterSearch,
    clearCharacter,
    clearLora,
    clearStylePresets,
    currentCharacterAsset,
    currentLoraAsset,
    done,
    draft,
    filteredCharacterAssets,
    filteredLoraAssets,
    filteredStylePresets,
    isSelectedCharacter,
    isSelectedLora,
    isEnabledStylePreset,
    isSelectedStylePreset,
    loadCapabilities,
    loading,
    loraAssets,
    loraDirectoryKeys,
    loraDirectoryTree,
    loraPage,
    loraPageSize,
    loraSearch,
    openAssetDetail,
    openStyleDetail,
    paginatedCharacterAssets,
    paginatedLoraAssets,
    paginatedStylePresets,
    selectCharacter,
    selectDirectory,
    selectLora,
    selectedStylePresets,
    removeStylePreset,
    styleCheckpointFilter,
    styleCheckpointOptions,
    styleDetailOpen,
    styleDetailTarget,
    styleDirectoryKeys,
    stylePage,
    stylePageSize,
    stylePresetSummary,
    stylePresets,
    styleSafetyFilter,
    styleSafetyOptions,
    styleSearch,
    styleSummary,
    target,
    toggleStylePresetEnabled,
    toggleStylePreset,
    visibleStylePresetDirectoryTree,
  }
}
