<script setup lang="ts">
import type { AiCapabilityResponse, AiGenerationJob, AiGenerationMode, AiNsfwVisibilityLevel, AiServiceStatusResponse } from '@/api/aiGeneration'
import {
  ColorWandOutline,
  DownloadOutline,
  ImageOutline,
  RefreshOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSkeleton,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NTree,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { createAiGeneration, downloadAiGeneration, fetchAiCapabilities, fetchAiGeneration, fetchAiPromptTranslation, fetchAiStatus, fetchMyAiGenerations, translateAiPrompt } from '@/api/aiGeneration'
import { getMyPoints } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAuthStore } from '@/stores/auth'
import { getAiGenerationStatusMeta, getAiReviewStatusMeta } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const COST_PER_IMAGE = 50
const DUAL_CHARACTER_COST_MULTIPLIER = 2
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
const PROMPT_TRANSLATION_POLL_MS = 1500
const PROMPT_TRANSLATION_TIMEOUT_MS = 120000
const SERVICE_STATUS_POLL_MS = 60000
const NSFW_LORA_STRENGTHS: Record<AiNsfwVisibilityLevel, number> = {
  LIGHT: 0.65,
  STANDARD: 0.6,
  STRONG: 0.55,
}
const DEFAULT_NEGATIVE = 'low quality, worst quality, bad anatomy, bad hands, extra fingers, missing fingers, deformed, blurry, text, watermark, logo, cropped'
const message = useMessage()
const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 1)

const sizePresets = [
  { label: '竖屏 832x1216', value: 'portrait', width: 832, height: 1216 },
  { label: '横屏 1216x832', value: 'landscape', width: 1216, height: 832 },
  { label: '大头照 1024x1024', value: 'headshot', width: 1024, height: 1024 },
  { label: '手机壁纸 832x1472', value: 'wallpaper', width: 832, height: 1472 },
]

const capabilities = shallowRef<AiCapabilityResponse>({
  checkpoints: [],
  loras: [],
  vaes: [],
  characters: [],
  promptPresets: [],
  workers: [],
})
const serviceStatus = shallowRef<AiServiceStatusResponse | null>(null)
const recentJobs = shallowRef<AiGenerationJob[]>([])
const activeJob = ref<AiGenerationJob | null>(null)
const loadingCapabilities = ref(false)
const loadingServiceStatus = ref(false)
const translating = ref(false)
const generating = ref(false)
const historyLoading = ref(false)
const pointsLoading = ref(false)
const points = ref(0)
const selectedSize = ref('portrait')
const characterMaskCanvas = ref<HTMLCanvasElement | null>(null)
const characterMaskRole = ref<'primary' | 'secondary'>('primary')
const characterMaskBrush = ref(0.07)
let pollTimer: number | undefined
let serviceStatusTimer: number | undefined
let paintingMask = false
let activeMaskStroke: CharacterMaskStroke | null = null
const loraSelectorOpen = ref(false)
const characterSelectorOpen = ref(false)
const presetSelectorActiveTab = ref<'character' | 'style'>('character')
const loraSelectorTarget = ref<'primary' | 'secondary'>('primary')
const characterSelectorTarget = ref<'primary' | 'secondary'>('primary')
const loraSearch = ref('')
const characterSearch = ref('')
const loraDirectoryKeys = ref<string[]>(['all'])
const characterDirectoryKeys = ref<string[]>(['all'])
const assetDetailOpen = ref(false)
const assetDetailKind = ref<'lora' | 'character'>('lora')
const assetDetailTarget = ref<AssetOption | null>(null)
const injectedTagsOpen = ref(false)
const normalLoraStrengths = ref({ primary: 1, secondary: 0.65 })
const repairOpen = ref(false)
const repairJob = ref<AiGenerationJob | null>(null)
const repairCanvas = ref<HTMLCanvasElement | null>(null)
const repairInstruction = ref('')
const repairVisibilityLevel = ref<AiNsfwVisibilityLevel>('STANDARD')
const repairBrush = ref(0.06)
const repairStrokes = ref<RepairMaskStroke[]>([])
const repairSubmitting = ref(false)
const form = reactive({
  generationMode: 'SINGLE' as AiGenerationMode,
  nsfwMode: false,
  nsfwVisibilityLevel: 'STANDARD' as AiNsfwVisibilityLevel,
  promptCn: '',
  promptPositive: '',
  promptNegative: DEFAULT_NEGATIVE,
  styleNotes: '',
  width: 832,
  height: 1216,
  steps: 35,
  cfg: 4.5,
  seed: null as number | null,
  checkpoint: '',
  loraName: '',
  loraStrength: 1,
  characterId: '',
  secondLoraName: '',
  secondLoraStrength: 0.65,
  secondCharacterId: '',
  triggerWords: '',
  styleTags: '',
  stylePresetIds: [] as string[],
})

function handleNsfwModeChange(enabled: boolean) {
  if (enabled) {
    normalLoraStrengths.value = {
      primary: form.loraStrength,
      secondary: form.secondLoraStrength,
    }
    if (form.loraName)
      form.loraStrength = NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel]
    if (form.secondLoraName)
      form.secondLoraStrength = NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel]
    return
  }
  if (form.loraName)
    form.loraStrength = normalLoraStrengths.value.primary
  if (form.secondLoraName)
    form.secondLoraStrength = normalLoraStrengths.value.secondary
}

function handleNsfwVisibilityChange(level: AiNsfwVisibilityLevel) {
  if (!form.nsfwMode)
    return
  if (form.loraName)
    form.loraStrength = NSFW_LORA_STRENGTHS[level]
  if (form.secondLoraName)
    form.secondLoraStrength = NSFW_LORA_STRENGTHS[level]
}

function parseMetadata<T extends Record<string, any> = Record<string, any>>(metadataJson?: string | null): T {
  if (!metadataJson)
    return {} as T
  try {
    return JSON.parse(metadataJson) as T
  }
  catch {
    return {} as T
  }
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }
  return ''
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed))
      return parsed
  }
  return null
}

function safePreviewImage(value: unknown) {
  if (typeof value !== 'string')
    return ''
  const url = value.trim()
  if (!url)
    return ''
  if (/^(?:https?:)?\/\//i.test(url) || /^data:image\//i.test(url) || url.startsWith('/'))
    return url
  return ''
}

interface AssetOption {
  name: string
  displayName: string
  category: string
  categoryType: string
  triggerWords: string
  recommendedStrength: number | null
  recommendedCheckpoint: string
  previewImage: string
  notes: string
  fileName: string
  metadata: Record<string, any>
}

interface CharacterMaskPoint {
  x: number
  y: number
}

interface CharacterMaskStroke {
  role: 'primary' | 'secondary'
  brush: number
  points: CharacterMaskPoint[]
}

interface RepairMaskStroke {
  brush: number
  points: CharacterMaskPoint[]
}

const characterMaskStrokes = ref<CharacterMaskStroke[]>([])

const ALL_DIRECTORY_KEY = 'all'

function toAssetOption(item: AiCapabilityResponse['loras'][number], fallbackCategory: string): AssetOption {
  const metadata = parseMetadata(item.metadataJson)
  const displayName = firstText(
    metadata.display_name,
    metadata.displayName,
    metadata.name,
    item.displayName,
    item.name,
  )
  return {
    name: item.name,
    displayName,
    category: firstText(metadata.category, metadata.category_name, metadata.categoryDisplayName, metadata.franchise, fallbackCategory),
    categoryType: firstText(metadata.category_type, metadata.categoryType, metadata.type, ''),
    triggerWords: firstText(metadata.trigger_words, metadata.triggerWords, metadata.trigger, ''),
    recommendedStrength: firstNumber(metadata.recommended_strength, metadata.recommendedStrength, metadata.lora_strength, metadata.loraStrength),
    recommendedCheckpoint: firstText(metadata.recommended_checkpoint, metadata.recommendedCheckpoint, ''),
    previewImage: safePreviewImage(firstText(metadata.preview_image, metadata.previewImage, metadata.preview_url, metadata.previewUrl)),
    notes: firstText(metadata.notes, metadata.description, metadata.summary, ''),
    fileName: firstText(metadata.file_name, metadata.fileName, metadata.lora_name, metadata.loraName, item.name),
    metadata,
  }
}

function assetTypeLabel(asset: AssetOption) {
  return asset.categoryType || '未分组'
}

function makeTypeDirectoryKey(type: string) {
  return `type:${encodeURIComponent(type)}`
}

function makeCategoryDirectoryKey(type: string, category: string) {
  return `category:${encodeURIComponent(type)}:${encodeURIComponent(category)}`
}

function parseDirectoryKey(key: string) {
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

function assetDirectoryTree(items: AssetOption[]) {
  const typeMap = new Map<string, Map<string, number>>()
  for (const item of items) {
    const type = assetTypeLabel(item)
    if (!typeMap.has(type))
      typeMap.set(type, new Map())
    const categoryMap = typeMap.get(type)!
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1)
  }
  return [
    {
      label: `全部 (${items.length})`,
      key: ALL_DIRECTORY_KEY,
    },
    ...Array.from(typeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
      .map(([type, categoryMap]) => {
        const total = Array.from(categoryMap.values()).reduce((sum, count) => sum + count, 0)
        return {
          label: `${type} (${total})`,
          key: makeTypeDirectoryKey(type),
          children: Array.from(categoryMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
            .map(([category, count]) => ({
              label: `${category} (${count})`,
              key: makeCategoryDirectoryKey(type, category),
            })),
        }
      }),
  ]
}

const defaultCheckpointLabel = computed(() => {
  if (capabilities.value.checkpoints.length === 1) {
    const checkpoint = capabilities.value.checkpoints[0]
    return `默认模型（${checkpoint.displayName || checkpoint.name}）`
  }
  return '默认模型'
})

const checkpointOptions = computed(() => [
  { label: defaultCheckpointLabel.value, value: '' },
  ...capabilities.value.checkpoints.map(item => ({
    label: item.displayName || item.name,
    value: item.name,
  })),
])

const loraAssets = computed(() => capabilities.value.loras.map(item => toAssetOption(item, '未分类')))
const characterAssets = computed(() => capabilities.value.characters.map(item => toAssetOption(item, '未分类角色')))

const selectedCharacterCapability = computed(() => {
  if (!form.characterId)
    return null
  return capabilities.value.characters.find(item => item.name === form.characterId) || null
})

const selectedSecondCharacterCapability = computed(() => {
  if (!form.secondCharacterId)
    return null
  return capabilities.value.characters.find(item => item.name === form.secondCharacterId) || null
})

const selectedCharacterMetadata = computed(() => parseMetadata(selectedCharacterCapability.value?.metadataJson))
const selectedSecondCharacterMetadata = computed(() => parseMetadata(selectedSecondCharacterCapability.value?.metadataJson))

const selectedLoraAsset = computed(() => loraAssets.value.find(item => item.name === form.loraName) || null)
const selectedSecondLoraAsset = computed(() => loraAssets.value.find(item => item.name === form.secondLoraName) || null)
const selectedCharacterAsset = computed(() => characterAssets.value.find(item => item.name === form.characterId) || null)
const selectedSecondCharacterAsset = computed(() => characterAssets.value.find(item => item.name === form.secondCharacterId) || null)

const isDualMode = computed(() => form.generationMode === 'DUAL')

const characterInjectedTags = computed(() => {
  const metadata = selectedCharacterMetadata.value as Record<string, any>
  return [
    firstText(metadata.trigger_words, metadata.triggerWords),
    firstText(metadata.default_positive, metadata.defaultPositive),
    firstText(metadata.style_tags, metadata.styleTags),
  ].filter(Boolean).join(', ')
})

const secondCharacterInjectedTags = computed(() => {
  const metadata = selectedSecondCharacterMetadata.value as Record<string, any>
  return [
    firstText(metadata.trigger_words, metadata.triggerWords),
    firstText(metadata.default_positive, metadata.defaultPositive),
    firstText(metadata.style_tags, metadata.styleTags),
  ].filter(Boolean).join(', ')
})

const allInjectedTags = computed(() => mergeUniqueTags(
  isDualMode.value ? filterDualCharacterTags(characterInjectedTags.value) : characterInjectedTags.value,
  isDualMode.value ? filterDualCharacterTags(secondCharacterInjectedTags.value) : '',
))

const characterInjectedTagList = computed(() => {
  return allInjectedTags.value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
})

const characterInjectedTagsPreview = computed(() => {
  const tags = characterInjectedTagList.value
  if (!tags.length)
    return ''
  const preview = tags.slice(0, 8).join(', ')
  return tags.length > 8 ? `${preview} ...` : preview
})

function normalizeAssetFileName(value: string) {
  return value
    .replace(/\.(safetensors|ckpt|pt)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

function mergeUniqueTags(...parts: string[]) {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of parts) {
    for (const rawTag of part.split(',')) {
      const tag = rawTag.trim()
      const key = normalizeTagKey(tag)
      if (!tag || seen.has(key))
        continue
      seen.add(key)
      tags.push(tag)
    }
  }
  return tags.join(', ')
}

function normalizeTagKey(tag: string) {
  return tag.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

function filterDualCharacterTags(prompt: string) {
  if (!prompt)
    return ''
  return prompt
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag && !DUAL_CHARACTER_BLOCKED_TAGS.has(normalizeTagKey(tag)))
    .join(', ')
}

function assetPromptTags(asset: AssetOption | null) {
  if (!asset)
    return ''
  return firstText(asset.triggerWords, normalizeAssetFileName(asset.fileName), asset.displayName)
}

function filterAssets(items: AssetOption[], search: string, directoryKey: string) {
  const keyword = search.trim().toLowerCase()
  const directory = parseDirectoryKey(directoryKey)
  return items.filter((item) => {
    if (directory.mode === 'type' && assetTypeLabel(item) !== directory.type)
      return false
    if (directory.mode === 'category' && (assetTypeLabel(item) !== directory.type || item.category !== directory.category))
      return false
    if (!keyword)
      return true
    return [
      item.displayName,
      item.name,
      item.fileName,
      item.category,
      item.categoryType,
      item.triggerWords,
      item.recommendedCheckpoint,
      item.notes,
    ].some(value => value.toLowerCase().includes(keyword))
  })
}

const loraDirectoryTree = computed(() => assetDirectoryTree(loraAssets.value))
const characterDirectoryTree = computed(() => assetDirectoryTree(characterAssets.value))
const filteredLoraAssets = computed(() => filterAssets(loraAssets.value, loraSearch.value, loraDirectoryKeys.value[0] || ALL_DIRECTORY_KEY))
const filteredCharacterAssets = computed(() => filterAssets(characterAssets.value, characterSearch.value, characterDirectoryKeys.value[0] || ALL_DIRECTORY_KEY))
const hasCharacterMaskStrokes = computed(() => characterMaskStrokes.value.length > 0)
const hasCompleteCharacterMaskStrokes = computed(() => {
  const roles = new Set(characterMaskStrokes.value.map(stroke => stroke.role))
  return roles.has('primary') && roles.has('secondary')
})
const dualCharacterPromptGuard = computed(() => {
  if (!isDualMode.value)
    return ''
  if (hasCompleteCharacterMaskStrokes.value)
    return '2girls, two distinct characters, character A, character B, separate faces, separate outfits, no fusion, no mixed features, natural close interaction'
  return '2girls, two distinct characters, left and right characters, separate faces, separate outfits, no fusion, no mixed features'
})

const availableStylePromptPresets = computed(() => {
  return (capabilities.value.promptPresets || [])
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
  const selected = new Set(form.stylePresetIds)
  return mergeUniqueTags(...availableStylePromptPresets.value
    .filter(preset => selected.has(preset.value))
    .map(preset => preset.tags))
})

const selectedStylePresetNegativeTags = computed(() => {
  const selected = new Set(form.stylePresetIds)
  return mergeUniqueTags(...availableStylePromptPresets.value
    .filter(preset => selected.has(preset.value))
    .map(preset => preset.negativeTags))
})

const selectedStylePresetSummary = computed(() => {
  if (!availableStylePromptPresets.value.length)
    return '本地 worker 未上报风格预设'
  const positive = selectedStylePresetTags.value
  const negative = selectedStylePresetNegativeTags.value
  if (!positive && !negative)
    return '未选择风格预设'
  return [
    positive ? `正向：${positive}` : '',
    negative ? `反向：${negative}` : '',
  ].filter(Boolean).join('；')
})

const selectedStylePresetNames = computed(() => {
  const selected = new Set(form.stylePresetIds)
  const names = availableStylePromptPresets.value
    .filter(preset => selected.has(preset.value))
    .map(preset => preset.label)
  return names.length ? names.join('、') : '不使用风格预设'
})

const presetPositivePrompt = computed(() => mergeUniqueTags(
  isDualMode.value ? filterDualCharacterTags(characterInjectedTags.value) : characterInjectedTags.value,
  isDualMode.value ? filterDualCharacterTags(secondCharacterInjectedTags.value) : '',
  assetPromptTags(selectedLoraAsset.value),
  isDualMode.value ? assetPromptTags(selectedSecondLoraAsset.value) : '',
  dualCharacterPromptGuard.value,
  selectedStylePresetTags.value,
  form.triggerWords,
  form.styleTags,
))
const effectivePositivePrompt = computed(() => {
  const prompt = mergeUniqueTags(form.promptPositive, presetPositivePrompt.value)
  return isDualMode.value ? filterDualCharacterTags(prompt) : prompt
})
const effectiveNegativePrompt = computed(() => mergeUniqueTags(
  form.promptNegative,
  selectedStylePresetNegativeTags.value,
))

const hasDrawablePrompt = computed(() => {
  return !!form.promptCn.trim() || !!effectivePositivePrompt.value
})

const serviceReady = computed(() => {
  if (!serviceStatus.value)
    return true
  return isAdmin.value ? serviceStatus.value.online : serviceStatus.value.available
})

const serviceOpenTimeText = computed(() => {
  const start = serviceStatus.value?.openStartTime || '08:30'
  const end = serviceStatus.value?.openEndTime || '22:30'
  return `每天 ${start}-${end}`
})

const queueStatusText = computed(() => {
  const status = serviceStatus.value
  if (!status)
    return '队列状态检测中'
  const queued = status.queuedCount || 0
  const running = (status.claimedCount || 0) + (status.runningCount || 0) + (status.uploadingCount || 0)
  const wait = formatWaitSeconds(status.estimatedWaitSeconds || 0)
  return `排队 ${queued} 个，处理中 ${running} 个，预计等待 ${wait}`
})

const serviceStatusType = computed(() => {
  if (!serviceStatus.value)
    return 'info'
  if (serviceReady.value)
    return 'success'
  if (serviceStatus.value.openNow && !serviceStatus.value.online)
    return 'error'
  return 'warning'
})

const serviceStatusLabel = computed(() => {
  if (!serviceStatus.value)
    return loadingServiceStatus.value ? '服务检测中' : '状态未知'
  if (serviceReady.value)
    return 'AI服务在线'
  if (!serviceStatus.value.openNow)
    return '非开放时间'
  return 'AI服务离线'
})

const serviceStatusMessage = computed(() => {
  if (isAdmin.value && serviceStatus.value?.online && !serviceStatus.value.openNow)
    return `Beta版AI绘画预计${serviceOpenTimeText.value}开放；管理员模式下机器在线即可使用。`
  return serviceStatus.value?.message || `Beta版AI绘画预计${serviceOpenTimeText.value}开放。`
})

const selectedGenerationCost = computed(() => COST_PER_IMAGE * (isDualMode.value ? DUAL_CHARACTER_COST_MULTIPLIER : 1))

const canGenerate = computed(() => {
  return serviceReady.value && hasDrawablePrompt.value && (isAdmin.value || points.value >= selectedGenerationCost.value)
})

const generateButtonText = computed(() => {
  if (isAdmin.value)
    return isDualMode.value ? '生成双角色图，管理员免费' : '生成一张图，管理员免费'
  return isDualMode.value
    ? `生成双角色图，消耗 ${selectedGenerationCost.value} 积分`
    : `生成一张图，消耗 ${COST_PER_IMAGE} 积分`
})

function formatWaitSeconds(seconds: number) {
  if (!seconds)
    return '较短'
  if (seconds < 60)
    return `${seconds} 秒`
  return `${Math.ceil(seconds / 60)} 分钟`
}

function mergedStyleTags() {
  return mergeUniqueTags(
    selectedStylePresetTags.value,
    form.triggerWords,
    form.styleTags,
    isDualMode.value ? filterDualCharacterTags(characterInjectedTags.value) : characterInjectedTags.value,
    isDualMode.value ? filterDualCharacterTags(secondCharacterInjectedTags.value) : '',
    dualCharacterPromptGuard.value,
  )
}

function applySizePreset(value: string | number) {
  const preset = sizePresets.find(item => item.value === String(value)) || sizePresets[0]
  selectedSize.value = preset.value
  form.width = preset.width
  form.height = preset.height
  redrawCharacterMaskSoon()
}

const characterMaskHint = computed(() => {
  if (!isDualMode.value)
    return ''
  if (hasCompleteCharacterMaskStrokes.value)
    return `已绘制 ${characterMaskStrokes.value.length} 笔角色区域；生成时只提取 A/B 大致位置作为构图参考，不再启用区域 mask。`
  if (hasCharacterMaskStrokes.value)
    return '需要同时画出角色 A 和角色 B 的范围才会启用布局参考；只画一边会按普通双角色生成。'
  return '不绘制时使用普通双角色生成；拥抱、接吻、遮挡较多时可手动画出两个角色的大致位置作为构图参考。'
})

function buildCharacterMaskJson() {
  if (!isDualMode.value || !hasCompleteCharacterMaskStrokes.value)
    return undefined
  const strokes = characterMaskStrokes.value
    .filter(stroke => stroke.points.length > 0)
    .map(stroke => ({
      role: stroke.role,
      brush: Number(stroke.brush.toFixed(4)),
      points: simplifyMaskPoints(stroke.points).map(point => ({
        x: Number(point.x.toFixed(4)),
        y: Number(point.y.toFixed(4)),
      })),
    }))
    .filter(stroke => stroke.points.length > 0)
  if (!strokes.length)
    return undefined
  return JSON.stringify({
    version: 1,
    width: form.width,
    height: form.height,
    strokes,
  })
}

function simplifyMaskPoints(points: CharacterMaskPoint[]) {
  const maxPoints = 220
  if (points.length <= maxPoints)
    return points
  const step = Math.ceil(points.length / maxPoints)
  return points.filter((_, index) => index % step === 0 || index === points.length - 1)
}

function clearCharacterMask() {
  characterMaskStrokes.value = []
  redrawCharacterMaskSoon()
}

function undoCharacterMaskStroke() {
  characterMaskStrokes.value = characterMaskStrokes.value.slice(0, -1)
  redrawCharacterMaskSoon()
}

function startCharacterMaskPaint(event: PointerEvent) {
  if (!isDualMode.value)
    return
  const point = maskPointFromEvent(event)
  if (!point)
    return
  paintingMask = true
  activeMaskStroke = {
    role: characterMaskRole.value,
    brush: characterMaskBrush.value,
    points: [point],
  }
  characterMaskCanvas.value?.setPointerCapture(event.pointerId)
  redrawCharacterMaskSoon()
}

function moveCharacterMaskPaint(event: PointerEvent) {
  if (!paintingMask || !activeMaskStroke)
    return
  const point = maskPointFromEvent(event)
  if (!point)
    return
  const lastPoint = activeMaskStroke.points[activeMaskStroke.points.length - 1]
  if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 0.006)
    return
  activeMaskStroke.points.push(point)
  redrawCharacterMaskSoon()
}

function endCharacterMaskPaint(event: PointerEvent) {
  if (!paintingMask || !activeMaskStroke)
    return
  paintingMask = false
  characterMaskCanvas.value?.releasePointerCapture(event.pointerId)
  if (activeMaskStroke.points.length > 0)
    characterMaskStrokes.value = [...characterMaskStrokes.value, activeMaskStroke]
  activeMaskStroke = null
  redrawCharacterMaskSoon()
}

function maskPointFromEvent(event: PointerEvent): CharacterMaskPoint | null {
  const canvas = characterMaskCanvas.value
  if (!canvas)
    return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height)
    return null
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  }
}

function redrawCharacterMaskSoon() {
  window.requestAnimationFrame(drawCharacterMaskCanvas)
}

function drawCharacterMaskCanvas() {
  const canvas = characterMaskCanvas.value
  if (!canvas)
    return
  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  const width = Math.max(320, Math.round(rect.width * ratio))
  const height = Math.max(180, Math.round(rect.height * ratio))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const context = canvas.getContext('2d')
  if (!context)
    return
  context.clearRect(0, 0, width, height)
  drawMaskGuide(context, width, height)
  for (const stroke of [...characterMaskStrokes.value, ...(activeMaskStroke ? [activeMaskStroke] : [])])
    drawMaskStroke(context, stroke, width, height)
}

function drawMaskGuide(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save()
  context.strokeStyle = 'rgba(100, 116, 139, 0.12)'
  context.lineWidth = 1
  const grid = Math.max(24, Math.round(Math.min(width, height) / 8))
  for (let x = grid; x < width; x += grid) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = grid; y < height; y += grid) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
  context.restore()
}

function drawMaskStroke(context: CanvasRenderingContext2D, stroke: CharacterMaskStroke, width: number, height: number) {
  const points = stroke.points
  if (!points.length)
    return
  const color = stroke.role === 'primary' ? 'rgba(14, 165, 233, 0.48)' : 'rgba(244, 63, 94, 0.48)'
  const edge = stroke.role === 'primary' ? 'rgba(2, 132, 199, 0.82)' : 'rgba(225, 29, 72, 0.82)'
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(16, stroke.brush * Math.min(width, height))
  context.strokeStyle = color
  context.beginPath()
  points.forEach((point, index) => {
    const x = point.x * width
    const y = point.y * height
    if (index === 0)
      context.moveTo(x, y)
    else
      context.lineTo(x, y)
  })
  context.stroke()
  context.lineWidth = Math.max(2, context.lineWidth * 0.08)
  context.strokeStyle = edge
  context.stroke()
  context.restore()
}

function assetCompactSummary(asset: AssetOption | null, emptyText: string) {
  if (!asset)
    return emptyText
  const parts = [
    asset.triggerWords ? `触发词：${asset.triggerWords}` : '',
    asset.recommendedStrength !== null ? `强度：${asset.recommendedStrength}` : '',
  ].filter(Boolean)
  return parts.join(' · ') || asset.fileName
}

function openLoraSelector(target: 'primary' | 'secondary' = 'primary') {
  loraSelectorTarget.value = target
  loraSelectorOpen.value = true
}

function openCharacterSelector(target: 'primary' | 'secondary' = 'primary', tab: 'character' | 'style' = 'character') {
  characterSelectorTarget.value = target
  presetSelectorActiveTab.value = tab
  characterSelectorOpen.value = true
}

function selectDirectory(keys: Array<string | number>) {
  return [String(keys[0] || ALL_DIRECTORY_KEY)]
}

function handleLoraDirectoryChange(keys: Array<string | number>) {
  loraDirectoryKeys.value = selectDirectory(keys)
}

function handleCharacterDirectoryChange(keys: Array<string | number>) {
  characterDirectoryKeys.value = selectDirectory(keys)
}

function openAssetDetail(kind: 'lora' | 'character', asset: AssetOption) {
  assetDetailKind.value = kind
  assetDetailTarget.value = asset
  assetDetailOpen.value = true
}

function isSelectedLora(asset: AssetOption) {
  return loraSelectorTarget.value === 'secondary'
    ? form.secondLoraName === asset.name
    : form.loraName === asset.name
}

function isSelectedCharacter(asset: AssetOption) {
  return characterSelectorTarget.value === 'secondary'
    ? form.secondCharacterId === asset.name
    : form.characterId === asset.name
}

function isSelectedStylePreset(value: string) {
  return form.stylePresetIds.includes(value)
}

function selectLora(asset: AssetOption) {
  if (loraSelectorTarget.value === 'secondary') {
    form.secondLoraName = asset.name
    if (form.nsfwMode)
      form.secondLoraStrength = NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel]
    else if (asset.recommendedStrength !== null)
      form.secondLoraStrength = asset.recommendedStrength
  }
  else {
    form.loraName = asset.name
    if (form.nsfwMode)
      form.loraStrength = NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel]
    else if (asset.recommendedStrength !== null)
      form.loraStrength = asset.recommendedStrength
  }
  if (asset.triggerWords && loraSelectorTarget.value === 'primary')
    form.triggerWords = asset.triggerWords
  loraSelectorOpen.value = false
  assetDetailOpen.value = false
}

function clearLora(target: 'primary' | 'secondary' = 'primary') {
  if (target === 'secondary') {
    form.secondLoraName = ''
    form.secondLoraStrength = form.nsfwMode ? NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel] : 0.65
    return
  }
  form.loraName = ''
  form.loraStrength = form.nsfwMode ? NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel] : 1
}

function selectCharacter(asset: AssetOption) {
  if (characterSelectorTarget.value === 'secondary')
    form.secondCharacterId = asset.name
  else
    form.characterId = asset.name
  characterSelectorOpen.value = false
  assetDetailOpen.value = false
}

function clearCharacter(target: 'primary' | 'secondary' = 'primary') {
  if (target === 'secondary') {
    form.secondCharacterId = ''
    form.secondLoraName = ''
    form.secondLoraStrength = 0.65
    return
  }
  form.characterId = ''
}

function toggleStylePreset(value: string) {
  if (!value)
    return
  form.stylePresetIds = isSelectedStylePreset(value)
    ? form.stylePresetIds.filter(item => item !== value)
    : [...form.stylePresetIds, value]
}

function clearStylePresets() {
  form.stylePresetIds = []
}

async function loadServiceStatus() {
  loadingServiceStatus.value = true
  try {
    serviceStatus.value = unwrapApiData(await fetchAiStatus(), serviceStatus.value)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载AI服务状态失败')
  }
  finally {
    loadingServiceStatus.value = false
  }
}

function startServiceStatusPolling() {
  stopServiceStatusPolling()
  serviceStatusTimer = window.setInterval(() => {
    void loadServiceStatus()
  }, SERVICE_STATUS_POLL_MS)
}

function stopServiceStatusPolling() {
  if (serviceStatusTimer) {
    window.clearInterval(serviceStatusTimer)
    serviceStatusTimer = undefined
  }
}

async function loadCapabilities() {
  loadingCapabilities.value = true
  try {
    capabilities.value = unwrapApiData(await fetchAiCapabilities(), capabilities.value)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载模型能力失败')
  }
  finally {
    loadingCapabilities.value = false
  }
}

async function loadPoints() {
  if (isAdmin.value) {
    points.value = Number.POSITIVE_INFINITY
    return
  }
  pointsLoading.value = true
  try {
    const data = unwrapApiData(await getMyPoints(), { points: 0 })
    points.value = Number(data.points || 0)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载积分失败')
  }
  finally {
    pointsLoading.value = false
  }
}

async function loadRecentJobs() {
  historyLoading.value = true
  try {
    const data = unwrapApiData(await fetchMyAiGenerations({ page: 1, pageSize: 6 }), {
      total: 0,
      page: 1,
      pageSize: 6,
      list: [],
    })
    recentJobs.value = data.list || []
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载最近生成失败')
  }
  finally {
    historyLoading.value = false
  }
}

function sleep(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function waitForPromptTranslation(id: number) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < PROMPT_TRANSLATION_TIMEOUT_MS) {
    const data = unwrapApiData(await fetchAiPromptTranslation(id), null)
    if (!data)
      throw new Error('Prompt translation job not found')
    if (data.status === 'COMPLETED')
      return data
    if (data.status === 'FAILED')
      throw new Error(data.errorMessage || 'Local Ollama prompt translation failed')
    await sleep(PROMPT_TRANSLATION_POLL_MS)
  }
  throw new Error('Local Ollama prompt translation timed out')
}

async function preparePrompt() {
  if (!form.promptCn.trim()) {
    message.warning('先写一点你想画什么')
    return false
  }
  if (isDualMode.value && !form.secondCharacterId && !form.secondLoraName) {
    message.warning('双角色模式需要选择角色 B 或第二个 LoRA')
    return
  }
  if (!serviceReady.value) {
    message.warning(serviceStatusMessage.value)
    return false
  }
  translating.value = true
  try {
    let data = unwrapApiData(await translateAiPrompt({
      promptCn: form.promptCn.trim(),
      styleTags: mergedStyleTags() || undefined,
      negativePrompt: effectiveNegativePrompt.value || undefined,
      nsfwMode: form.nsfwMode,
      nsfwVisibilityLevel: form.nsfwVisibilityLevel,
    }), {
      positive: '',
      negative: DEFAULT_NEGATIVE,
      styleNotes: '',
    })
    if (data.status !== 'COMPLETED' && !data.positive) {
      if (!data.id)
        throw new Error('Prompt translation job was not created')
      message.info('Local Ollama is generating prompts...')
      data = await waitForPromptTranslation(data.id)
    }
    form.promptPositive = data.positive || form.promptPositive
    form.promptNegative = data.negative || DEFAULT_NEGATIVE
    form.styleNotes = data.styleNotes || ''
    message.success('提示词已生成')
    return true
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '生成提示词失败')
    return false
  }
  finally {
    translating.value = false
  }
}

async function generate() {
  if (!hasDrawablePrompt.value) {
    message.warning('先填写自然语言、正向提示词，或选择带触发词的角色/LoRA 预设')
    return
  }
  if (!serviceReady.value) {
    message.warning(serviceStatusMessage.value)
    return
  }
  if (!canGenerate.value) {
    message.warning(`积分不足，本次生成需要 ${selectedGenerationCost.value} 积分`)
    return
  }
  if (!form.promptPositive.trim() && form.promptCn.trim()) {
    const prepared = await preparePrompt()
    if (!prepared)
      return
  }
  const promptPositive = effectivePositivePrompt.value
  const promptCn = firstText(
    form.promptCn,
    selectedCharacterAsset.value?.displayName,
    selectedSecondCharacterAsset.value?.displayName,
    selectedLoraAsset.value?.displayName,
    selectedSecondLoraAsset.value?.displayName,
    promptPositive,
  )
  const presetOnlyPrompt = !form.promptCn.trim() && !form.promptPositive.trim()
  generating.value = true
  try {
    const job = unwrapApiData(await createAiGeneration({
      promptCn,
      promptPositive,
      promptNegative: effectiveNegativePrompt.value.trim(),
      styleNotes: form.styleNotes || undefined,
      width: form.width,
      height: form.height,
      steps: form.steps,
      cfg: form.cfg,
      seed: form.seed || undefined,
      checkpoint: form.checkpoint || undefined,
      generationMode: form.generationMode,
      loraName: form.loraName || undefined,
      loraStrength: form.loraName ? form.loraStrength : 0,
      nsfwMode: form.nsfwMode,
      nsfwVisibilityLevel: form.nsfwVisibilityLevel,
      characterId: form.characterId || undefined,
      secondLoraName: isDualMode.value ? form.secondLoraName || undefined : undefined,
      secondLoraStrength: isDualMode.value && form.secondLoraName ? form.secondLoraStrength : 0,
      secondCharacterId: isDualMode.value ? form.secondCharacterId || undefined : undefined,
      triggerWords: presetOnlyPrompt ? undefined : form.triggerWords || undefined,
      styleTags: presetOnlyPrompt ? undefined : form.styleTags || undefined,
      characterMaskJson: buildCharacterMaskJson(),
    }))
    activeJob.value = job
    message.success('任务已进入队列')
    await loadPoints()
    await loadRecentJobs()
    startPolling(job.id)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '创建生图任务失败')
  }
  finally {
    generating.value = false
  }
}

function startPolling(jobId: number) {
  stopPolling()
  pollTimer = window.setInterval(async () => {
    try {
      const job = unwrapApiData(await fetchAiGeneration(jobId), null)
      if (!job)
        return
      const wasCompleted = activeJob.value?.status === 'COMPLETED'
      activeJob.value = job
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        stopPolling()
        if (job.status === 'COMPLETED' && !wasCompleted) {
          message.success('生图完成，图片仅保留30天，如需永久保存请审核发布至广场或自行下载。', {
            duration: 8000,
          })
        }
        await loadPoints()
        await loadRecentJobs()
      }
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '刷新任务状态失败')
      stopPolling()
    }
  }, 2500)
}

async function downloadJob(job: AiGenerationJob) {
  try {
    const data = unwrapApiData(await downloadAiGeneration(job.id), null)
    if (!data?.downloadUrl)
      throw new Error('后端未返回下载地址')
    window.location.href = data.downloadUrl
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '下载图片失败')
  }
}

function startRepairPaint() {
  message.info('局部修复已下线，请使用一次性生成重新出图')
}

function moveRepairPaint() {
}

function endRepairPaint() {
}

function redrawRepairMask() {
}

function undoRepairStroke() {
  repairStrokes.value = []
}

function clearRepairMask() {
  repairStrokes.value = []
}

function submitRepair() {
  message.info('局部修复已下线，请使用一次性生成重新出图')
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

function fillAgain(job: AiGenerationJob) {
  form.promptCn = job.promptCn
  form.promptPositive = job.promptPositive || ''
  form.promptNegative = job.promptNegative || DEFAULT_NEGATIVE
  form.styleNotes = job.styleNotes || ''
  form.width = job.width || 832
  form.height = job.height || 1216
  form.steps = job.steps || 35
  form.cfg = job.cfg || 4.5
  form.seed = null
  form.checkpoint = job.checkpoint || ''
  form.generationMode = job.generationMode || 'SINGLE'
  form.nsfwMode = job.nsfwMode === true
  form.nsfwVisibilityLevel = job.nsfwVisibilityLevel || 'STANDARD'
  form.loraName = job.loraName || ''
  form.loraStrength = job.loraStrength || 1
  form.characterId = job.characterId || ''
  form.secondLoraName = job.secondLoraName || ''
  form.secondLoraStrength = job.secondLoraStrength || 0.65
  form.secondCharacterId = job.secondCharacterId || ''
  form.triggerWords = ''
  form.styleTags = ''
  form.stylePresetIds = []
  restoreCharacterMask(job.characterMaskJson || '')
  const preset = sizePresets.find(item => item.width === form.width && item.height === form.height)
  selectedSize.value = preset?.value || 'portrait'
  redrawCharacterMaskSoon()
}

function restoreCharacterMask(maskJson: string) {
  if (!maskJson.trim()) {
    characterMaskStrokes.value = []
    return
  }
  try {
    const payload = JSON.parse(maskJson) as { strokes?: CharacterMaskStroke[] }
    characterMaskStrokes.value = (payload.strokes || [])
      .filter(stroke => (stroke.role === 'primary' || stroke.role === 'secondary') && Array.isArray(stroke.points))
      .map(stroke => ({
        role: stroke.role,
        brush: Number(stroke.brush) || 0.07,
        points: stroke.points
          .map(point => ({ x: Number(point.x), y: Number(point.y) }))
          .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)),
      }))
      .filter(stroke => stroke.points.length > 0)
  }
  catch {
    characterMaskStrokes.value = []
  }
}

function restorePrefill() {
  const raw = window.sessionStorage.getItem('ai-draw-prefill')
  if (!raw)
    return
  window.sessionStorage.removeItem('ai-draw-prefill')
  try {
    const job = JSON.parse(raw) as AiGenerationJob & { clearSeed?: boolean }
    fillAgain({
      ...job,
      seed: job.clearSeed ? null : job.seed,
    })
    message.success(job.clearSeed ? '已复用参数并清空 Seed' : '已复用历史参数')
  }
  catch {
    message.warning('历史参数读取失败')
  }
}

watch(() => form.characterId, () => {
  const metadata = selectedCharacterMetadata.value as Record<string, any>
  form.triggerWords = firstText(metadata.trigger_words, metadata.triggerWords)
  form.styleTags = firstText(metadata.style_tags, metadata.styleTags) || form.styleTags
  const loraName = firstText(metadata.lora_name, metadata.loraName)
  if (loraName) {
    form.loraName = loraName
    form.loraStrength = form.nsfwMode
      ? NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel]
      : firstNumber(metadata.lora_strength, metadata.loraStrength, metadata.recommended_strength, metadata.recommendedStrength) || 1
  }
})

watch(() => form.secondCharacterId, () => {
  const metadata = selectedSecondCharacterMetadata.value as Record<string, any>
  const loraName = firstText(metadata.lora_name, metadata.loraName)
  if (loraName) {
    form.secondLoraName = loraName
    form.secondLoraStrength = form.nsfwMode
      ? NSFW_LORA_STRENGTHS[form.nsfwVisibilityLevel]
      : firstNumber(metadata.lora_strength, metadata.loraStrength, metadata.recommended_strength, metadata.recommendedStrength) || 0.65
  }
})

watch(() => form.generationMode, () => {
  if (form.generationMode === 'SINGLE') {
    form.secondCharacterId = ''
    form.secondLoraName = ''
    form.secondLoraStrength = 0.65
  }
  else if (selectedSize.value === 'portrait') {
    applySizePreset('landscape')
  }
  redrawCharacterMaskSoon()
})

watch(() => [form.width, form.height], () => {
  redrawCharacterMaskSoon()
})

onMounted(async () => {
  await Promise.all([loadServiceStatus(), loadCapabilities(), loadPoints(), loadRecentJobs()])
  restorePrefill()
  startServiceStatusPolling()
  window.addEventListener('resize', redrawCharacterMaskSoon)
  redrawCharacterMaskSoon()
})

onUnmounted(() => {
  stopPolling()
  stopServiceStatusPolling()
  window.removeEventListener('resize', redrawCharacterMaskSoon)
})
</script>

<template>
  <div class="ai-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          AI 绘图
        </h1>
        <p class="ui-page-subtitle">
          每张图消耗 <b>{{ COST_PER_IMAGE }}</b> 积分，管理员免费。Beta开放时间：{{ serviceOpenTimeText }}（北京时间）。
        </p>
      </div>
      <NSpace>
        <NTag round :type="isAdmin ? 'success' : 'info'">
          {{ isAdmin ? '管理员免费' : pointsLoading ? '积分加载中' : `${points} 积分` }}
        </NTag>
        <NButton secondary :loading="loadingCapabilities" @click="loadCapabilities">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新模型
        </NButton>
      </NSpace>
    </div>

    <NAlert :type="serviceStatusType" class="service-alert">
      <div class="service-status">
        <div>
          <strong>{{ serviceStatusLabel }}</strong>
          <span>{{ serviceStatusMessage }}</span>
          <small>Beta开放时间：{{ serviceOpenTimeText }}（北京时间）</small>
          <small>{{ queueStatusText }}</small>
        </div>
        <NTag round :type="serviceStatusType">
          {{ serviceStatus?.online ? `${serviceStatus.activeWorkerCount || 0} 个Worker在线` : 'Worker离线' }}
        </NTag>
      </div>
    </NAlert>

    <div class="draw-layout">
      <NCard class="ui-card draw-card" :bordered="false">
        <template #header>
          <div class="card-title">
            <NIcon><ColorWandOutline /></NIcon>
            绘制设置
          </div>
        </template>

        <NAlert v-if="!capabilities.workers.length" type="warning" class="worker-alert">
          当前没有 Worker 上报在线能力，任务可以入队，但需要本机 Worker 启动后才会生成。
        </NAlert>

        <NForm label-placement="top">
          <NFormItem label="生成模式">
            <div class="mode-switch">
              <NRadioGroup v-model:value="form.generationMode">
                <NRadioButton value="SINGLE">
                  单角色
                </NRadioButton>
                <NRadioButton value="DUAL">
                  双角色
                </NRadioButton>
              </NRadioGroup>
              <span>{{ isAdmin ? '管理员免费' : `本次预计消耗 ${selectedGenerationCost} 积分` }}</span>
            </div>
          </NFormItem>

          <NFormItem label="NSFW 兼容模式">
            <div class="mode-switch">
              <NSwitch v-model:value="form.nsfwMode" @update:value="handleNsfwModeChange">
                <template #checked>
                  已开启
                </template>
                <template #unchecked>
                  已关闭
                </template>
              </NSwitch>
              <span>
                {{ form.nsfwMode
                  ? '过滤服装、审查与遮挡标签，强化无遮挡构图，并将 LoRA 默认强度调整为 0.60'
                  : '保留全部预设标签和普通 LoRA 强度' }}
              </span>
            </div>
          </NFormItem>

          <NFormItem v-if="form.nsfwMode" label="NSFW 可见性强度">
            <div class="visibility-level-field">
              <NRadioGroup
                v-model:value="form.nsfwVisibilityLevel"
                @update:value="handleNsfwVisibilityChange"
              >
                <NRadioButton value="LIGHT">
                  轻度
                </NRadioButton>
                <NRadioButton value="STANDARD">
                  标准
                </NRadioButton>
                <NRadioButton value="STRONG">
                  强力
                </NRadioButton>
              </NRadioGroup>
              <span>只在 NSFW 开启时生效；强度越高，遮挡负面词和局部重绘幅度越强。</span>
            </div>
          </NFormItem>

          <NFormItem label="自然语言描绘">
            <NInput
              v-model:value="form.promptCn"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 10 }"
              maxlength="1000"
              show-count
              placeholder="例如：银发少女，雨夜街角，霓虹灯，电影感光影"
            />
          </NFormItem>

          <NFormItem label="画幅">
            <NRadioGroup v-model:value="selectedSize" class="size-presets" @update:value="applySizePreset">
              <NRadioButton v-for="preset in sizePresets" :key="preset.value" :value="preset.value">
                {{ preset.label }}
              </NRadioButton>
            </NRadioGroup>
          </NFormItem>

          <div class="prompt-actions">
            <NButton secondary :loading="translating" :disabled="!serviceReady || !form.promptCn.trim()" @click="preparePrompt">
              生成提示词
            </NButton>
            <span>{{ form.width }} x {{ form.height }} · {{ form.steps }} steps · CFG {{ form.cfg }}</span>
          </div>

          <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
            <NGridItem>
              <NFormItem label="正向提示词">
                <NInput
                  v-model:value="form.promptPositive"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                  placeholder="可选：补充场景、动作、镜头；不填则使用已选预设 tags"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="反向提示词">
                <NInput
                  v-model:value="form.promptNegative"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
            <NGridItem>
              <NFormItem label="Checkpoint">
                <NSelect v-model:value="form.checkpoint" :options="checkpointOptions" filterable />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="LoRA">
                <div class="asset-picker-field">
                  <button class="asset-trigger" type="button" @click="openLoraSelector">
                    <span class="asset-preview">
                      <img v-if="selectedLoraAsset?.previewImage" :src="selectedLoraAsset.previewImage" :alt="selectedLoraAsset.displayName">
                      <span v-else>LoRA</span>
                    </span>
                    <span class="asset-trigger-text">
                      <small>{{ selectedLoraAsset?.category || 'LoRA' }}</small>
                      <strong>{{ selectedLoraAsset?.displayName || '不使用 LoRA' }}</strong>
                      <em>{{ assetCompactSummary(selectedLoraAsset, '当前不会加载 LoRA') }}</em>
                    </span>
                  </button>
                  <div class="asset-actions">
                    <NButton size="small" secondary @click="openLoraSelector">
                      选择 LoRA
                    </NButton>
                    <NButton size="small" quaternary :disabled="!form.loraName" @click="clearLora">
                      不使用
                    </NButton>
                  </div>
                </div>
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="预设">
                <div class="preset-picker-group">
                  <div class="preset-picker-section">
                    <div class="asset-picker-field">
                      <button class="asset-trigger" type="button" @click="openCharacterSelector">
                        <span class="asset-preview">
                          <img v-if="selectedCharacterAsset?.previewImage" :src="selectedCharacterAsset.previewImage" :alt="selectedCharacterAsset.displayName">
                          <span v-else>预设</span>
                        </span>
                        <span class="asset-trigger-text">
                          <small>预设</small>
                          <strong>{{ selectedCharacterAsset?.displayName || '不使用角色' }}</strong>
                          <em>风格：{{ selectedStylePresetNames }}</em>
                        </span>
                      </button>
                      <div class="asset-actions">
                        <NButton size="small" secondary @click="openCharacterSelector">
                          选择预设
                        </NButton>
                        <NButton size="small" tertiary @click="openCharacterSelector('primary', 'style')">
                          风格预设
                        </NButton>
                        <NButton size="small" quaternary :disabled="!form.characterId" @click="clearCharacter">
                          不使用角色
                        </NButton>
                      </div>
                    </div>
                  </div>
                  <div class="preset-picker-section">
                    <div class="preset-section-head">
                      <strong>风格预设</strong>
                      <span>可多选</span>
                    </div>
                    <div class="style-preset-summary">
                      <div class="field-hint">
                        {{ selectedStylePresetSummary }}
                      </div>
                    </div>
                  </div>
                </div>
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="LoRA 强度">
                <NInputNumber v-model:value="form.loraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.loraName" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <div v-if="isDualMode" class="dual-character-panel">
            <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
              <NGridItem>
                <NFormItem label="角色 B 预设">
                  <div class="asset-picker-field">
                    <button class="asset-trigger" type="button" @click="openCharacterSelector('secondary')">
                      <span class="asset-preview">
                        <img v-if="selectedSecondCharacterAsset?.previewImage" :src="selectedSecondCharacterAsset.previewImage" :alt="selectedSecondCharacterAsset.displayName">
                        <span v-else>角色B</span>
                      </span>
                      <span class="asset-trigger-text">
                        <small>{{ selectedSecondCharacterAsset?.category || '第二角色' }}</small>
                        <strong>{{ selectedSecondCharacterAsset?.displayName || '选择第二个角色' }}</strong>
                        <em>{{ assetCompactSummary(selectedSecondCharacterAsset, '用于双角色构图的角色 B') }}</em>
                      </span>
                    </button>
                    <div class="asset-actions">
                      <NButton size="small" secondary @click="openCharacterSelector('secondary')">
                        选择角色 B
                      </NButton>
                      <NButton size="small" quaternary :disabled="!form.secondCharacterId" @click="clearCharacter('secondary')">
                        不使用
                      </NButton>
                    </div>
                  </div>
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="角色 B LoRA">
                  <div class="asset-picker-field">
                    <button class="asset-trigger" type="button" @click="openLoraSelector('secondary')">
                      <span class="asset-preview">
                        <img v-if="selectedSecondLoraAsset?.previewImage" :src="selectedSecondLoraAsset.previewImage" :alt="selectedSecondLoraAsset.displayName">
                        <span v-else>LoRA B</span>
                      </span>
                      <span class="asset-trigger-text">
                        <small>{{ selectedSecondLoraAsset?.category || '第二 LoRA' }}</small>
                        <strong>{{ selectedSecondLoraAsset?.displayName || '不使用第二 LoRA' }}</strong>
                        <em>{{ assetCompactSummary(selectedSecondLoraAsset, '选择角色 B 后通常会自动填入') }}</em>
                      </span>
                    </button>
                    <div class="asset-actions">
                      <NButton size="small" secondary @click="openLoraSelector('secondary')">
                        选择 LoRA B
                      </NButton>
                      <NButton size="small" quaternary :disabled="!form.secondLoraName" @click="clearLora('secondary')">
                        不使用
                      </NButton>
                    </div>
                    <NInputNumber v-model:value="form.secondLoraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.secondLoraName" />
                  </div>
                </NFormItem>
              </NGridItem>
            </NGrid>
            <p class="field-hint">
              双角色会按两张图计费。不画区域时使用普通双角色生成；同时画出角色 A/B 范围后只作为构图参考，不会再触发区域 mask。
            </p>
            <div class="character-mask-panel">
              <div class="mask-panel-head">
                <div>
                  <strong>角色布局参考</strong>
                  <span>{{ characterMaskHint }}</span>
                </div>
                <NTag size="small" round :type="hasCompleteCharacterMaskStrokes ? 'success' : (hasCharacterMaskStrokes ? 'warning' : 'info')">
                  {{ hasCompleteCharacterMaskStrokes ? '布局参考启用' : (hasCharacterMaskStrokes ? '区域未完整' : '普通双角色') }}
                </NTag>
              </div>
              <div class="mask-toolbar">
                <NRadioGroup v-model:value="characterMaskRole" size="small">
                  <NRadioButton value="primary">
                    画角色 A
                  </NRadioButton>
                  <NRadioButton value="secondary">
                    画角色 B
                  </NRadioButton>
                </NRadioGroup>
                <NInputNumber v-model:value="characterMaskBrush" size="small" :min="0.03" :max="0.16" :step="0.01" />
                <NButton size="small" secondary :disabled="!hasCharacterMaskStrokes" @click="undoCharacterMaskStroke">
                  撤销一笔
                </NButton>
                <NButton size="small" quaternary :disabled="!hasCharacterMaskStrokes" @click="clearCharacterMask">
                  清空
                </NButton>
              </div>
              <div class="mask-canvas-wrap" :style="{ aspectRatio: `${form.width} / ${form.height}` }">
                <canvas
                  ref="characterMaskCanvas"
                  class="character-mask-canvas"
                  @pointerdown.prevent="startCharacterMaskPaint"
                  @pointermove.prevent="moveCharacterMaskPaint"
                  @pointerup.prevent="endCharacterMaskPaint"
                  @pointercancel.prevent="endCharacterMaskPaint"
                  @pointerleave="moveCharacterMaskPaint"
                />
              </div>
            </div>
          </div>

          <div v-if="allInjectedTags" class="field-hint injected-tags-hint injected-tags-section">
            <span class="injected-tags-label">将注入</span>
            <span class="injected-tags-preview">{{ characterInjectedTagsPreview }}</span>
            <NButton size="tiny" text type="primary" @click="injectedTagsOpen = true">
              查看全部
            </NButton>
          </div>

          <NCollapse class="advanced-panel">
            <NCollapseItem title="高级参数" name="advanced">
              <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
                <NGridItem>
                  <NFormItem label="步数">
                    <NInputNumber v-model:value="form.steps" :min="8" :max="80" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="CFG">
                    <NInputNumber v-model:value="form.cfg" :min="1" :max="20" :step="0.5" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="Seed">
                    <NInputNumber v-model:value="form.seed" :min="1" clearable placeholder="留空随机" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="风格补充 tag">
                    <NInput v-model:value="form.styleTags" clearable placeholder="masterpiece, cinematic lighting" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="角色/LoRA 触发词">
                    <NInput v-model:value="form.triggerWords" clearable placeholder="选择角色后可自动填入，也可手动编辑" />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NCollapseItem>
          </NCollapse>

          <NButton type="primary" size="large" block :loading="generating" :disabled="!canGenerate" @click="generate">
            <template #icon>
              <NIcon><SparklesOutline /></NIcon>
            </template>
            {{ generateButtonText }}
          </NButton>
        </NForm>
      </NCard>

      <NCard class="ui-card result-card" :class="{ 'has-active-job': activeJob }" :bordered="false">
        <template #header>
          <div class="card-title">
            <NIcon><ImageOutline /></NIcon>
            当前任务
          </div>
        </template>

        <div v-if="activeJob" class="active-job">
          <div class="image-stage">
            <NImage
              v-if="activeJob.imageUrl"
              :src="activeJob.imageUrl"
              object-fit="contain"
              :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
            />
            <div v-else class="placeholder">
              <NSkeleton v-if="activeJob.status !== 'FAILED'" height="100%" />
              <NEmpty v-else description="生成失败" />
            </div>
          </div>
          <div class="job-meta">
            <NTag :type="getAiGenerationStatusMeta(activeJob.status).type" round>
              {{ getAiGenerationStatusMeta(activeJob.status).label }}
            </NTag>
            <NTag v-if="activeJob.status === 'COMPLETED'" :type="getAiReviewStatusMeta(activeJob.reviewStatus).type" round>
              广场审核：{{ getAiReviewStatusMeta(activeJob.reviewStatus).label }}
            </NTag>
            <span>#{{ activeJob.id }}</span>
            <span>{{ activeJob.width }}x{{ activeJob.height }}</span>
          </div>
          <p class="prompt-preview">
            {{ activeJob.promptCn }}
          </p>
          <NAlert v-if="activeJob.errorMessage" type="error">
            {{ activeJob.userErrorMessage || activeJob.errorMessage }}
          </NAlert>
          <NAlert v-if="activeJob.status === 'COMPLETED'" type="warning">
            图片仅保留 30 天，如需永久保存请审核发布至广场或自行下载。
            <template v-if="activeJob.privateOssExpiresAt">
              云端原图预计于 {{ formatDate(activeJob.privateOssExpiresAt) }} 清理。
            </template>
          </NAlert>
          <NAlert
            v-if="activeJob.privateOssStatus === 'EXPIRED' || activeJob.privateOssStatus === 'EXPLICITLY_DELETED'"
            type="info"
          >
            云端原图已清理，生成历史仍会保留。
          </NAlert>
          <NButton
            v-if="activeJob.imageUrl"
            type="primary"
            secondary
            @click="downloadJob(activeJob)"
          >
            <template #icon>
              <NIcon><DownloadOutline /></NIcon>
            </template>
            下载图片
          </NButton>
        </div>
        <NEmpty v-else description="还没有当前任务" />
      </NCard>
    </div>

    <NCard class="ui-card recent-card" :bordered="false">
      <template #header>
        <div class="card-title">
          最近生成
        </div>
      </template>

      <div v-if="historyLoading" class="recent-grid">
        <NSkeleton v-for="item in 3" :key="item" height="260px" />
      </div>
      <div v-else-if="recentJobs.length" class="recent-grid">
        <div v-for="job in recentJobs" :key="job.id" class="job-card">
          <div class="job-thumb">
            <NImage
              v-if="job.imageUrl"
              :src="job.imageUrl"
              object-fit="contain"
              :img-props="{ alt: job.promptCn, referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
            />
            <div v-else class="thumb-empty">
              {{ getAiGenerationStatusMeta(job.status).label }}
            </div>
          </div>
          <div class="job-card-body">
            <div class="job-card-title">
              #{{ job.id }} · {{ formatDate(job.createdAt) }}
            </div>
            <p>{{ job.promptCn }}</p>
            <NTag :type="getAiGenerationStatusMeta(job.status).type" size="small" round>
              {{ getAiGenerationStatusMeta(job.status).label }}
            </NTag>
            <NButton size="small" secondary @click="fillAgain(job)">
              复用参数
            </NButton>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无生成记录" />
    </NCard>

    <NModal v-model:show="loraSelectorOpen" preset="card" title="选择 LoRA" :style="{ width: '1280px', maxWidth: '96vw' }">
      <div class="asset-selector">
        <div class="asset-selector-toolbar">
          <NInput v-model:value="loraSearch" clearable placeholder="搜索显示名、文件名、触发词、分类或说明" />
          <NButton secondary @click="clearLora(loraSelectorTarget); loraSelectorOpen = false">
            不使用 LoRA
          </NButton>
        </div>
        <div class="asset-browser">
          <aside class="asset-tree-pane">
            <NTree
              block-line
              :data="loraDirectoryTree"
              :selected-keys="loraDirectoryKeys"
              :default-expanded-keys="[ALL_DIRECTORY_KEY]"
              @update:selected-keys="handleLoraDirectoryChange"
            />
          </aside>
          <div class="asset-list-pane">
            <div v-if="filteredLoraAssets.length" class="asset-grid">
              <article
                v-for="asset in filteredLoraAssets"
                :key="asset.name"
                role="button"
                tabindex="0"
                class="asset-card"
                :class="{ chosen: isSelectedLora(asset) }"
                @click="selectLora(asset)"
                @keydown.enter.prevent="selectLora(asset)"
                @keydown.space.prevent="selectLora(asset)"
              >
                <span class="asset-card-preview">
                  <img v-if="asset.previewImage" :src="asset.previewImage" :alt="asset.displayName">
                  <span v-else>{{ asset.displayName.slice(0, 2) }}</span>
                </span>
                <span class="asset-card-body">
                  <span class="asset-card-topline">
                    <NTag size="small" round>{{ asset.category }}</NTag>
                    <small v-if="asset.categoryType">{{ asset.categoryType }}</small>
                  </span>
                  <strong>{{ asset.displayName }}</strong>
                  <em>{{ asset.fileName }}</em>
                  <span class="asset-card-meta">{{ assetCompactSummary(asset, '未配置触发词') }}</span>
                  <span class="asset-card-actions">
                    <NButton
                      size="tiny"
                      secondary
                      @click.stop="openAssetDetail('lora', asset)"
                      @keydown.enter.stop
                      @keydown.space.stop
                    >
                      详细
                    </NButton>
                  </span>
                </span>
              </article>
            </div>
            <NEmpty v-else description="没有匹配的 LoRA" />
          </div>
        </div>
      </div>
    </NModal>

    <NModal v-model:show="characterSelectorOpen" preset="card" title="选择预设" :style="{ width: '1280px', maxWidth: '96vw' }">
      <div class="asset-selector">
        <NTabs v-model:value="presetSelectorActiveTab" type="segment">
          <NTabPane name="character" tab="角色预设">
            <div class="asset-selector-tab">
              <div class="asset-selector-toolbar">
                <NInput v-model:value="characterSearch" clearable placeholder="搜索角色、作品/风格分类、触发词或说明" />
                <NButton secondary @click="clearCharacter(characterSelectorTarget); characterSelectorOpen = false">
                  不使用角色
                </NButton>
              </div>
              <div class="asset-browser">
                <aside class="asset-tree-pane">
                  <NTree
                    block-line
                    :data="characterDirectoryTree"
                    :selected-keys="characterDirectoryKeys"
                    :default-expanded-keys="[ALL_DIRECTORY_KEY]"
                    @update:selected-keys="handleCharacterDirectoryChange"
                  />
                </aside>
                <div class="asset-list-pane">
                  <div v-if="filteredCharacterAssets.length" class="asset-grid">
                    <article
                      v-for="asset in filteredCharacterAssets"
                      :key="asset.name"
                      role="button"
                      tabindex="0"
                      class="asset-card"
                      :class="{ chosen: isSelectedCharacter(asset) }"
                      @click="selectCharacter(asset)"
                      @keydown.enter.prevent="selectCharacter(asset)"
                      @keydown.space.prevent="selectCharacter(asset)"
                    >
                      <span class="asset-card-preview">
                        <img v-if="asset.previewImage" :src="asset.previewImage" :alt="asset.displayName">
                        <span v-else>{{ asset.displayName.slice(0, 2) }}</span>
                      </span>
                      <span class="asset-card-body">
                        <span class="asset-card-topline">
                          <NTag size="small" round>{{ asset.category }}</NTag>
                          <small v-if="asset.categoryType">{{ asset.categoryType }}</small>
                        </span>
                        <strong>{{ asset.displayName }}</strong>
                        <em>{{ asset.fileName }}</em>
                        <span class="asset-card-meta">{{ assetCompactSummary(asset, '未配置触发词') }}</span>
                        <span class="asset-card-actions">
                          <NButton
                            size="tiny"
                            secondary
                            @click.stop="openAssetDetail('character', asset)"
                            @keydown.enter.stop
                            @keydown.space.stop
                          >
                            详细
                          </NButton>
                        </span>
                      </span>
                    </article>
                  </div>
                  <NEmpty v-else description="没有匹配的角色预设" />
                </div>
              </div>
            </div>
          </NTabPane>
          <NTabPane name="style" tab="风格预设">
            <div class="asset-selector-tab">
              <div class="asset-selector-toolbar">
                <div class="field-hint">
                  {{ selectedStylePresetSummary }}
                </div>
                <NButton secondary :disabled="!form.stylePresetIds.length" @click="clearStylePresets">
                  清空风格
                </NButton>
              </div>
              <div v-if="availableStylePromptPresets.length" class="style-preset-grid">
                <article
                  v-for="preset in availableStylePromptPresets"
                  :key="preset.value"
                  role="button"
                  tabindex="0"
                  class="style-preset-card"
                  :class="{ chosen: isSelectedStylePreset(preset.value) }"
                  @click="toggleStylePreset(preset.value)"
                  @keydown.enter.prevent="toggleStylePreset(preset.value)"
                  @keydown.space.prevent="toggleStylePreset(preset.value)"
                >
                  <span class="asset-card-topline">
                    <NTag size="small" round>{{ preset.category }}</NTag>
                    <small v-if="preset.categoryType">{{ preset.categoryType }}</small>
                  </span>
                  <strong>{{ preset.label }}</strong>
                  <em>{{ preset.notes || '未配置说明' }}</em>
                  <span class="asset-card-meta">正向：{{ preset.tags || '无' }}</span>
                  <span class="asset-card-meta">反向：{{ preset.negativeTags || '无' }}</span>
                </article>
              </div>
              <NEmpty v-else description="本地 worker 未上报风格预设" />
            </div>
          </NTabPane>
        </NTabs>
      </div>
    </NModal>

    <NModal
      v-model:show="assetDetailOpen"
      preset="card"
      :title="assetDetailKind === 'lora' ? 'LoRA 详情' : '角色预设详情'"
      :style="{ width: '760px', maxWidth: '94vw' }"
    >
      <div v-if="assetDetailTarget" class="asset-detail-modal">
        <div class="asset-inspector-preview">
          <img v-if="assetDetailTarget.previewImage" :src="assetDetailTarget.previewImage" :alt="assetDetailTarget.displayName">
          <span v-else>{{ assetDetailTarget.displayName.slice(0, 2) }}</span>
        </div>
        <div class="asset-inspector-head">
          <NTag size="small" round>
            {{ assetDetailTarget.category }}
          </NTag>
          <strong>{{ assetDetailTarget.displayName }}</strong>
          <em>{{ assetDetailTarget.fileName }}</em>
        </div>
        <div class="asset-detail">
          <div><span>显示名</span><strong>{{ assetDetailTarget.displayName }}</strong></div>
          <div><span>文件名</span><strong>{{ assetDetailTarget.fileName }}</strong></div>
          <div><span>目录</span><strong>{{ assetDetailTarget.categoryType || '未分组' }} / {{ assetDetailTarget.category }}</strong></div>
          <div><span>触发词</span><strong>{{ assetDetailTarget.triggerWords || '未配置' }}</strong></div>
          <div><span>推荐强度</span><strong>{{ assetDetailTarget.recommendedStrength ?? '未配置' }}</strong></div>
          <div><span>适配模型</span><strong>{{ assetDetailTarget.recommendedCheckpoint || '未配置' }}</strong></div>
          <div class="asset-detail-wide">
            <span>说明</span><strong>{{ assetDetailTarget.notes || '未配置说明' }}</strong>
          </div>
        </div>
        <NButton
          type="primary"
          block
          @click="assetDetailKind === 'lora' ? selectLora(assetDetailTarget) : selectCharacter(assetDetailTarget)"
        >
          {{ assetDetailKind === 'lora' ? '使用这个 LoRA' : '使用这个角色预设' }}
        </NButton>
      </div>
    </NModal>

    <NModal
      v-model:show="injectedTagsOpen"
      preset="card"
      title="将注入的角色 tags"
      :style="{ width: '720px', maxWidth: '94vw' }"
    >
      <div class="injected-tags-detail">
        <div class="tag-cloud">
          <NTag v-for="tag in characterInjectedTagList" :key="tag" size="small" round>
            {{ tag }}
          </NTag>
        </div>
        <NInput
          :value="allInjectedTags"
          type="textarea"
          readonly
          :autosize="{ minRows: 4, maxRows: 8 }"
        />
      </div>
    </NModal>

    <NModal
      v-model:show="repairOpen"
      preset="card"
      title="手绘局部修复"
      :style="{ width: '920px', maxWidth: '96vw' }"
      @after-enter="redrawRepairMask"
    >
      <div v-if="repairJob" class="repair-editor">
        <NAlert type="info">
          在图片上涂红需要重绘的区域。提交后会创建一个新的子任务，原图保留，并按单张图片收取 {{ COST_PER_IMAGE }} 积分。
        </NAlert>
        <div class="repair-toolbar">
          <NRadioGroup v-model:value="repairVisibilityLevel" size="small" class="repair-visibility-group">
            <NRadioButton value="LIGHT">
              轻度
            </NRadioButton>
            <NRadioButton value="STANDARD">
              标准
            </NRadioButton>
            <NRadioButton value="STRONG">
              强力
            </NRadioButton>
          </NRadioGroup>
          <label class="repair-brush-field">
            画笔
            <NInputNumber v-model:value="repairBrush" size="small" :min="0.02" :max="0.18" :step="0.01" />
          </label>
          <NButton size="small" secondary :disabled="!repairStrokes.length" @click="undoRepairStroke">
            撤销一笔
          </NButton>
          <NButton size="small" quaternary :disabled="!repairStrokes.length" @click="clearRepairMask">
            清空
          </NButton>
        </div>
        <div
          class="repair-canvas-wrap"
          :style="{ aspectRatio: `${repairJob.width} / ${repairJob.height}` }"
        >
          <img :src="repairJob.imageUrl || ''" alt="待修复原图" @load="redrawRepairMask">
          <canvas
            ref="repairCanvas"
            @pointerdown.prevent="startRepairPaint"
            @pointermove.prevent="moveRepairPaint"
            @pointerup.prevent="endRepairPaint"
            @pointercancel.prevent="endRepairPaint"
          />
        </div>
        <NFormItem label="修复描述（可选）">
          <NInput
            v-model:value="repairInstruction"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            maxlength="500"
            show-count
            placeholder="例如：修复局部结构，保持角色脸部、姿势和光影不变"
          />
        </NFormItem>
        <NButton
          type="primary"
          block
          :loading="repairSubmitting"
          :disabled="!repairStrokes.length"
          @click="submitRepair"
        >
          创建局部修复任务
        </NButton>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.ai-page {
  display: grid;
  gap: 18px;
}

.draw-layout {
  display: grid;
  grid-template-columns: minmax(360px, 560px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.draw-card,
.result-card,
.recent-card {
  border-radius: 8px;
}

.result-card {
  position: sticky;
  top: 82px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-text);
  font-weight: 800;
}

.worker-alert {
  margin-bottom: 14px;
}

.service-alert {
  border-radius: 8px;
}

.service-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.service-status > div {
  display: grid;
  gap: 3px;
}

.service-status span {
  line-height: 1.6;
}

.service-status small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.mode-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.mode-switch span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.visibility-level-field,
.repair-editor {
  display: grid;
  gap: 12px;
  width: 100%;
}

.visibility-level-field span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.repair-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.repair-visibility-group,
.repair-brush-field {
  min-width: 0;
}

.repair-visibility-group {
  display: flex;
}

.repair-toolbar label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.repair-canvas-wrap {
  position: relative;
  width: min(100%, 640px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: #0f172a;
  touch-action: none;
}

.repair-canvas-wrap img,
.repair-canvas-wrap canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.repair-canvas-wrap canvas {
  cursor: crosshair;
}

.size-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
}

.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 16px 0 16px;
  color: #64748b;
  font-size: 12px;
}

.prompt-actions :deep(.n-button) {
  flex: 0 0 auto;
}

.prompt-actions span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.preset-picker-group,
.preset-picker-section,
.style-preset-summary {
  display: grid;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.preset-picker-group {
  gap: 12px;
}

.preset-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.preset-section-head strong {
  min-width: 0;
  color: #263247;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.preset-section-head span {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
}

.field-hint {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.injected-tags-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  padding: 6px 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.82);
  overflow: hidden;
}

.injected-tags-label {
  flex: 0 0 auto;
  color: #475569;
  font-weight: 800;
}

.injected-tags-preview {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.injected-tags-hint :deep(.n-button) {
  flex: 0 0 auto;
}

.injected-tags-section {
  margin: 0 0 16px;
}

.injected-tags-detail {
  display: grid;
  gap: 12px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.82);
}

.asset-picker-field {
  display: grid;
  gap: 8px;
  width: 100%;
}

.asset-trigger {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-height: 86px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.asset-trigger:hover {
  border-color: rgba(56, 189, 248, 0.72);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.asset-preview,
.asset-card-preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #f8fafc 52%, #fee2e2);
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.asset-preview {
  width: 72px;
  height: 72px;
}

.asset-preview img,
.asset-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-trigger-text {
  display: grid;
  align-content: center;
  gap: 3px;
  min-width: 0;
}

.asset-trigger-text small {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.asset-trigger-text strong {
  color: #263247;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.asset-trigger-text em {
  display: -webkit-box;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dual-character-panel {
  margin: 0 0 16px;
  padding: 12px;
  border: 1px solid rgba(14, 165, 233, 0.18);
  border-radius: 8px;
  background: rgba(224, 242, 254, 0.34);
}

.character-mask-panel {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
}

.mask-panel-head,
.mask-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mask-panel-head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.mask-panel-head strong {
  color: #263247;
  font-size: 13px;
}

.mask-panel-head span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.mask-toolbar {
  justify-content: flex-start;
}

.mask-toolbar :deep(.n-input-number) {
  width: 92px;
}

.mask-canvas-wrap {
  position: relative;
  width: 100%;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  background:
    repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.1) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.1) 0 1px, transparent 1px 24px),
    #f8fafc;
}

.character-mask-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.asset-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.84);
}

.asset-detail div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.asset-detail span {
  color: #64748b;
  font-size: 11px;
}

.asset-detail strong {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.asset-detail-wide {
  grid-column: 1 / -1;
}

.asset-selector {
  display: grid;
  gap: 14px;
}

.asset-selector-tab {
  display: grid;
  gap: 12px;
  padding-top: 8px;
}

.asset-selector-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.asset-browser {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.asset-tree-pane,
.asset-list-pane {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.asset-tree-pane {
  max-height: min(68vh, 640px);
  overflow: auto;
  padding: 8px;
}

.asset-tree-pane :deep(.n-tree-node-content__text) {
  font-size: 12px;
}

.asset-list-pane {
  max-height: min(68vh, 640px);
  overflow: auto;
  padding: 10px;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}

.asset-card {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 10px;
  min-height: 114px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.asset-card:hover,
.asset-card.active {
  border-color: rgba(14, 165, 233, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.asset-card.chosen {
  background: rgba(224, 242, 254, 0.78);
}

.style-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  max-height: min(68vh, 640px);
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.style-preset-card {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
  min-height: 160px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.style-preset-card:hover {
  border-color: rgba(14, 165, 233, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.style-preset-card.chosen {
  border-color: rgba(14, 165, 233, 0.9);
  background: rgba(224, 242, 254, 0.86);
}

.style-preset-card strong {
  min-width: 0;
  color: #263247;
  font-size: 15px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.style-preset-card em {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-card-preview {
  width: 68px;
  height: 92px;
  align-self: start;
  font-size: 15px;
}

.asset-card-body {
  display: grid;
  align-content: start;
  gap: 5px;
  min-width: 0;
}

.asset-card-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.asset-card-topline small {
  min-width: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.asset-card strong {
  color: #263247;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.asset-card em,
.asset-card-meta,
.asset-card-notes {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.style-preset-card .asset-card-meta {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-card-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 2px;
}

.asset-card-notes {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-detail-modal {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.asset-detail-modal .asset-detail,
.asset-detail-modal :deep(.n-button) {
  grid-column: 1 / -1;
}

.asset-inspector-preview {
  display: grid;
  width: 100%;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #f8fafc 52%, #fee2e2);
  color: #475569;
  font-size: 24px;
  font-weight: 900;
}

.asset-inspector-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-inspector-head {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.asset-inspector-head strong {
  color: #263247;
  font-size: 16px;
  overflow-wrap: anywhere;
}

.asset-inspector-head em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  overflow-wrap: anywhere;
}

.advanced-panel {
  margin-bottom: 16px;
}

.image-stage {
  width: min(100%, 420px);
  aspect-ratio: 832 / 1216;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.84);
}

.image-stage :deep(.n-image),
.image-stage :deep(img),
.placeholder {
  width: 100%;
  height: 100%;
}

.image-stage :deep(img) {
  object-fit: contain;
}

.active-job {
  display: grid;
  justify-items: center;
  gap: 14px;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.prompt-preview {
  display: -webkit-box;
  width: min(100%, 620px);
  margin: 0;
  overflow: hidden;
  color: #475569;
  line-height: 1.6;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.job-card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
}

.job-thumb {
  display: grid;
  aspect-ratio: 832 / 1216;
  place-items: center;
  overflow: hidden;
  background: #f1f5f9;
  color: #94a3b8;
}

.job-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.job-thumb :deep(.n-image) {
  width: 100%;
  height: 100%;
}

.job-thumb :deep(.n-image img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.job-card-body {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.job-card-title {
  color: #263247;
  font-size: 13px;
  font-weight: 800;
}

.job-card-body p {
  display: -webkit-box;
  min-height: 42px;
  margin: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 980px) {
  .draw-layout {
    grid-template-columns: 1fr;
  }

  .result-card {
    position: static;
  }

  .asset-selector-toolbar,
  .asset-browser,
  .asset-detail-modal,
  .asset-detail {
    grid-template-columns: 1fr;
  }

  .asset-tree-pane,
  .asset-list-pane {
    max-height: none;
  }

  .asset-card {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .asset-card-preview {
    width: 64px;
    height: 86px;
  }

  .style-preset-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  }
}

@media (max-width: 640px) {
  .ai-page {
    gap: 12px;
  }

  .draw-layout {
    gap: 12px;
  }

  .result-card.has-active-job {
    order: -1;
  }

  .image-stage {
    width: min(100%, 280px);
    max-height: 46dvh;
  }

  .active-job {
    gap: 10px;
  }

  .prompt-preview {
    font-size: 12px;
    line-height: 1.5;
    -webkit-line-clamp: 2;
  }

  .recent-grid {
    display: grid;
    grid-auto-columns: minmax(150px, 68vw);
    grid-auto-flow: column;
    grid-template-columns: none;
    gap: 10px;
    overflow-x: auto;
    padding: 2px 2px 8px;
    scroll-snap-type: x proximity;
  }

  .recent-grid > * {
    scroll-snap-align: start;
  }

  .preset-section-head {
    align-items: flex-start;
  }

  .asset-trigger {
    grid-template-columns: 58px minmax(0, 1fr);
    min-height: 74px;
    gap: 10px;
  }

  .asset-preview {
    width: 58px;
    height: 58px;
  }

  .asset-actions :deep(.n-button) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .style-preset-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 8px;
  }

  .style-preset-card {
    min-height: auto;
    padding: 10px;
  }

  .style-preset-card strong {
    font-size: 14px;
  }

  .job-card-body {
    gap: 6px;
    padding: 9px;
  }

  .job-card-title,
  .job-card-body p {
    font-size: 12px;
  }

  .job-card-body p {
    min-height: 36px;
    line-height: 1.5;
  }

  .repair-editor {
    gap: 10px;
  }

  .repair-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: stretch;
    gap: 8px;
  }

  .repair-visibility-group {
    grid-column: 1 / -1;
    width: 100%;
  }

  .repair-visibility-group :deep(.n-radio-button) {
    flex: 1 1 0;
    min-width: 0;
    text-align: center;
  }

  .repair-brush-field {
    grid-column: 1 / -1;
    width: 100%;
    justify-content: space-between;
  }

  .repair-brush-field :deep(.n-input-number) {
    width: min(180px, 62vw);
  }

  .repair-toolbar > .n-button {
    min-width: 0;
  }

  .repair-canvas-wrap {
    width: 100%;
    max-height: 58dvh;
  }
}
</style>
