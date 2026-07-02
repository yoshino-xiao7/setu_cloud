<script setup lang="ts">
import type { AiGenerationJob, AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
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
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { parseMetadata } from '@/composables/useAiAssets'
import { useAiDrawCharacterMask } from '@/composables/useAiDrawCharacterMask'
import { createAiDrawDraftPatch } from '@/composables/useAiDrawDraftForm'
import {
  applyAiDrawCharacterMetadata,
  applyAiDrawGenerationModeChange,
  applyAiDrawNsfwModeChange,
  applyAiDrawNsfwVisibilityChange,
  clearAiDrawCharacter,
  clearAiDrawLora,
} from '@/composables/useAiDrawFormRules'
import { useAiDrawGenerationFlow } from '@/composables/useAiDrawGenerationFlow'
import {
  applyAiDrawDraftRestore,
  applyAiDrawHistoryJobToForm,
  readAiDrawPrefillJob,
} from '@/composables/useAiDrawHistoryRestore'
import { useAiDrawPromptTags } from '@/composables/useAiDrawPromptTags'
import { useAiDrawResources } from '@/composables/useAiDrawResources'
import {
  AI_DRAW_SIZE_PRESETS,
  applyAiDrawSizePreset,
} from '@/composables/useAiDrawSizePresets'
import { useAiDrawDraftStore } from '@/stores/aiDrawDraft'
import { useAuthStore } from '@/stores/auth'
import { getAiGenerationStatusMeta, getAiReviewStatusMeta } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const COST_PER_IMAGE = 50
const DUAL_CHARACTER_COST_MULTIPLIER = 2
const PROMPT_TRANSLATION_POLL_MS = 1500
const PROMPT_TRANSLATION_TIMEOUT_MS = 120000
const SERVICE_STATUS_POLL_MS = 60000
const DEFAULT_NEGATIVE = 'low quality, worst quality, bad anatomy, bad hands, extra fingers, missing fingers, deformed, blurry, text, watermark, logo, cropped'
const message = useMessage()
const auth = useAuthStore()
const router = useRouter()
const draftStore = useAiDrawDraftStore()
const isAdmin = computed(() => auth.user?.role === 1)

const sizePresets = AI_DRAW_SIZE_PRESETS

const activeJob = ref<AiGenerationJob | null>(null)
const selectedSize = ref('portrait')
const injectedTagsOpen = ref(false)
const normalLoraStrengths = ref({ primary: 1, secondary: 0.65 })
const restoringDraft = ref(false)
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
  normalLoraStrengths.value = applyAiDrawNsfwModeChange(form, enabled, normalLoraStrengths.value)
}

function handleNsfwVisibilityChange(level: AiNsfwVisibilityLevel) {
  applyAiDrawNsfwVisibilityChange(form, level)
}

const {
  capabilities,
  characterAssets,
  checkpointOptions,
  historyLoading,
  loraAssets,
  loadCapabilities,
  loadPoints,
  loadRecentJobs,
  loadServiceStatus,
  loadingCapabilities,
  points,
  queueStatusText,
  recentJobs,
  serviceReady,
  serviceStatus,
  serviceStatusLabel,
  serviceStatusMessage,
  serviceStatusPolling,
  serviceStatusType,
} = useAiDrawResources({
  isAdmin,
  message,
  serviceStatusPollMs: SERVICE_STATUS_POLL_MS,
})

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

const {
  brush: characterMaskBrush,
  buildJson: buildCharacterMaskJson,
  canvas: characterMaskCanvas,
  clear: clearCharacterMask,
  hasCompleteStrokes: hasCompleteCharacterMaskStrokes,
  hasStrokes: hasCharacterMaskStrokes,
  hint: characterMaskHint,
  movePaint: moveCharacterMaskPaint,
  promptGuard: dualCharacterPromptGuard,
  redrawSoon: redrawCharacterMaskSoon,
  restore: restoreCharacterMask,
  role: characterMaskRole,
  startPaint: startCharacterMaskPaint,
  undo: undoCharacterMaskStroke,
  endPaint: endCharacterMaskPaint,
} = useAiDrawCharacterMask({
  isEnabled: isDualMode,
  getDimensions: () => ({ width: form.width, height: form.height }),
})

const {
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
  syncingPresetPrompts,
  syncPresetPrompts: syncPresetPromptTags,
} = useAiDrawPromptTags({
  capabilities,
  defaultNegative: DEFAULT_NEGATIVE,
  dualCharacterPromptGuard,
  form,
  isDualMode,
  restoringDraft,
  selectedCharacterMetadata,
  selectedLoraAsset,
  selectedSecondCharacterMetadata,
  selectedSecondLoraAsset,
})

const hasDrawablePrompt = computed(() => {
  return !!form.promptCn.trim() || !!effectivePositivePrompt.value
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

const {
  downloadJob,
  generate,
  generating,
  preparePrompt,
  stopPolling,
  translating,
} = useAiDrawGenerationFlow({
  activeJob,
  buildCharacterMaskJson,
  defaultNegative: DEFAULT_NEGATIVE,
  effectiveNegativePrompt,
  effectivePositivePrompt,
  form,
  hasDrawablePrompt,
  isAdmin,
  isDualMode,
  loadPoints,
  loadRecentJobs,
  mergedStyleTags,
  message,
  points,
  promptTranslationPollMs: PROMPT_TRANSLATION_POLL_MS,
  promptTranslationTimeoutMs: PROMPT_TRANSLATION_TIMEOUT_MS,
  selectedCharacterAsset,
  selectedGenerationCost,
  selectedLoraAsset,
  selectedSecondCharacterAsset,
  selectedSecondLoraAsset,
  serviceReady,
  serviceStatusMessage,
})

function applySizePreset(value: string | number) {
  selectedSize.value = applyAiDrawSizePreset(form, value)
  redrawCharacterMaskSoon()
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

function syncPresetPrompts() {
  syncPresetPromptTags()
}

function captureDraft() {
  draftStore.capture(createAiDrawDraftPatch(form, getDraftPromptPatch()))
}

function openAssetSelector(tab: 'lora' | 'character' | 'style', target: 'primary' | 'secondary' = 'primary') {
  captureDraft()
  void router.push({
    path: '/dashboard/ai-assets',
    query: { tab, target },
  })
}

function openLoraSelector(target: 'primary' | 'secondary' = 'primary') {
  openAssetSelector('lora', target)
}

function openCharacterSelector(target: 'primary' | 'secondary' = 'primary', tab: 'character' | 'style' = 'character') {
  openAssetSelector(tab, target)
}

function clearLora(target: 'primary' | 'secondary' = 'primary') {
  clearAiDrawLora(form, target)
}

function clearCharacter(target: 'primary' | 'secondary' = 'primary') {
  clearAiDrawCharacter(form, target)
}

function fillAgain(job: AiGenerationJob) {
  selectedSize.value = applyAiDrawHistoryJobToForm(form, job, {
    defaultNegative: DEFAULT_NEGATIVE,
    restoreCharacterMask,
  })
  redrawCharacterMaskSoon()
}

function restoreDraft() {
  if (!draftStore.hasDraft)
    return
  restoringDraft.value = true
  selectedSize.value = applyAiDrawDraftRestore(form, draftStore.$state, DEFAULT_NEGATIVE)
  restoringDraft.value = false
  draftStore.resetDraft()
  redrawCharacterMaskSoon()
}

function restorePrefill() {
  try {
    const job = readAiDrawPrefillJob(window.sessionStorage)
    if (!job)
      return
    fillAgain(job)
    message.success(job.clearSeed ? '已复用参数并清空 Seed' : '已复用历史参数')
  }
  catch {
    message.warning('历史参数读取失败')
  }
}

watch(() => form.characterId, () => {
  if (restoringDraft.value)
    return
  const metadata = selectedCharacterMetadata.value as Record<string, unknown>
  applyAiDrawCharacterMetadata(form, metadata)
})

watch(() => form.secondCharacterId, () => {
  if (restoringDraft.value)
    return
  const metadata = selectedSecondCharacterMetadata.value as Record<string, unknown>
  applyAiDrawCharacterMetadata(form, metadata, 'secondary')
})

watch([
  () => form.generationMode,
  () => form.characterId,
  () => form.secondCharacterId,
  () => form.loraName,
  () => form.secondLoraName,
  () => form.triggerWords,
  () => form.styleTags,
  () => form.stylePresetIds.join('|'),
  () => availableStylePromptPresets.value.length,
  () => characterInjectedTags.value,
  () => secondCharacterInjectedTags.value,
], () => {
  if (!syncingPresetPrompts.value)
    syncPresetPrompts()
})

watch(() => form.generationMode, () => {
  const nextSizePreset = applyAiDrawGenerationModeChange(form, selectedSize.value)
  if (nextSizePreset)
    applySizePreset(nextSizePreset)
  redrawCharacterMaskSoon()
})

watch(() => [form.width, form.height], () => {
  redrawCharacterMaskSoon()
})

onMounted(async () => {
  await Promise.all([loadServiceStatus(), loadCapabilities(), loadPoints(), loadRecentJobs()])
  restoreDraft()
  restorePrefill()
  syncPresetPrompts()
  serviceStatusPolling.start()
  window.addEventListener('resize', redrawCharacterMaskSoon)
  redrawCharacterMaskSoon()
})

onUnmounted(() => {
  stopPolling()
  serviceStatusPolling.stop()
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
          每张图消耗 <b>{{ COST_PER_IMAGE }}</b> 积分，管理员免费。AI绘画正式版已开放，机器在线即可使用。
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
          <small>开放规则：正式版不限时，机器在线即可使用。</small>
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
              <NFormItem label="主 LoRA 强度">
                <NInputNumber v-model:value="form.loraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.loraName" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NFormItem label="资产组合">
            <div class="asset-composer">
              <button class="asset-composer-main" type="button" @click="openAssetSelector('lora', 'primary')">
                <span class="asset-preview">
                  <img v-if="selectedCharacterAsset?.previewImage" :src="selectedCharacterAsset.previewImage" :alt="selectedCharacterAsset.displayName">
                  <span v-else>资产</span>
                </span>
                <span>
                  <small>主角色 / LoRA / 风格</small>
                  <strong>{{ selectedCharacterAsset?.displayName || '未选择角色预设' }}</strong>
                  <em>{{ selectedLoraAsset?.displayName || '不使用 LoRA' }} · {{ selectedStylePresetNames }}</em>
                </span>
              </button>
              <div class="asset-composer-grid">
                <button class="asset-composer-card" type="button" @click="openCharacterSelector('primary')">
                  <small>角色预设</small>
                  <strong>{{ selectedCharacterAsset?.displayName || '不使用角色' }}</strong>
                  <em>{{ assetCompactSummary(selectedCharacterAsset, '可注入角色 tags') }}</em>
                </button>
                <button class="asset-composer-card" type="button" @click="openLoraSelector('primary')">
                  <small>LoRA</small>
                  <strong>{{ selectedLoraAsset?.displayName || '不使用 LoRA' }}</strong>
                  <em>{{ assetCompactSummary(selectedLoraAsset, '当前不会加载 LoRA') }}</em>
                </button>
                <button class="asset-composer-card" type="button" @click="openCharacterSelector('primary', 'style')">
                  <small>风格预设</small>
                  <strong>{{ selectedStylePresetNames }}</strong>
                  <em>{{ selectedStylePresetSummary }}</em>
                </button>
              </div>
              <div class="asset-actions asset-composer-actions">
                <NButton size="small" type="primary" secondary @click="openAssetSelector('lora', 'primary')">
                  配置资产组合
                </NButton>
                <NButton size="small" quaternary :disabled="!form.characterId" @click="clearCharacter">
                  清空角色
                </NButton>
                <NButton size="small" quaternary :disabled="!form.loraName" @click="clearLora">
                  清空 LoRA
                </NButton>
              </div>
            </div>
          </NFormItem>
          <div v-if="isDualMode" class="dual-character-panel">
            <NFormItem label="角色 B 资产组合">
              <div class="asset-composer">
                <button class="asset-composer-main" type="button" @click="openAssetSelector('character', 'secondary')">
                  <span class="asset-preview">
                    <img v-if="selectedSecondCharacterAsset?.previewImage" :src="selectedSecondCharacterAsset.previewImage" :alt="selectedSecondCharacterAsset.displayName">
                    <span v-else>角色B</span>
                  </span>
                  <span>
                    <small>角色 B / LoRA B</small>
                    <strong>{{ selectedSecondCharacterAsset?.displayName || '未选择角色 B' }}</strong>
                    <em>{{ selectedSecondLoraAsset?.displayName || '不使用 LoRA B' }}</em>
                  </span>
                </button>
                <div class="asset-composer-grid two-columns">
                  <button class="asset-composer-card" type="button" @click="openCharacterSelector('secondary')">
                    <small>角色 B 预设</small>
                    <strong>{{ selectedSecondCharacterAsset?.displayName || '不使用角色 B' }}</strong>
                    <em>{{ assetCompactSummary(selectedSecondCharacterAsset, '用于双角色构图的角色 B') }}</em>
                  </button>
                  <button class="asset-composer-card" type="button" @click="openLoraSelector('secondary')">
                    <small>LoRA B</small>
                    <strong>{{ selectedSecondLoraAsset?.displayName || '不使用 LoRA B' }}</strong>
                    <em>{{ assetCompactSummary(selectedSecondLoraAsset, '选择角色 B 后通常会自动填入') }}</em>
                  </button>
                </div>
                <div class="asset-actions asset-composer-actions">
                  <NButton size="small" type="primary" secondary @click="openAssetSelector('character', 'secondary')">
                    配置角色 B 资产
                  </NButton>
                  <NButton size="small" quaternary :disabled="!form.secondCharacterId" @click="clearCharacter('secondary')">
                    清空角色 B
                  </NButton>
                  <NButton size="small" quaternary :disabled="!form.secondLoraName" @click="clearLora('secondary')">
                    清空 LoRA B
                  </NButton>
                </div>
                <NInputNumber v-model:value="form.secondLoraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.secondLoraName" />
              </div>
            </NFormItem>
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

          <div v-if="presetPositivePrompt || selectedStylePresetNegativeTags" class="field-hint injected-tags-hint injected-tags-section">
            <span class="injected-tags-label">将注入</span>
            <span class="injected-tags-preview">{{ editableInjectedTagsPreview }}</span>
            <NButton size="tiny" text type="primary" @click="injectedTagsOpen = true">
              查看/编辑
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
    <NModal
      v-model:show="injectedTagsOpen"
      preset="card"
      title="预设注入的提示词"
      :style="{ width: '720px', maxWidth: '94vw' }"
    >
      <div class="injected-tags-detail">
        <div v-if="editableInjectedTagList.length" class="tag-cloud">
          <NTag v-for="tag in editableInjectedTagList" :key="tag" size="small" round>
            {{ tag }}
          </NTag>
        </div>
        <span class="prompt-edit-label">正向提示词</span>
        <NInput
          v-model:value="form.promptPositive"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
        />
        <span class="prompt-edit-label">反向提示词</span>
        <NInput
          v-model:value="form.promptNegative"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
        />
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

.prompt-edit-label {
  color: #475569;
  font-size: 12px;
  font-weight: 800;
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

.asset-composer {
  display: grid;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.asset-composer-main,
.asset-composer-card {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.asset-composer-main {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
}

.asset-composer-main:hover,
.asset-composer-card:hover {
  border-color: rgba(14, 165, 233, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.asset-composer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.asset-composer-grid.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.asset-composer-card {
  display: grid;
  align-content: start;
  gap: 5px;
  min-height: 118px;
  padding: 10px;
}

.asset-composer-main small,
.asset-composer-card small {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.asset-composer-main strong,
.asset-composer-card strong {
  min-width: 0;
  color: #263247;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.asset-composer-main em,
.asset-composer-card em {
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

.asset-composer-actions {
  justify-content: flex-start;
}

.asset-selector {
  display: grid;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.preset-selector-modal :deep(.n-card__content) {
  display: grid;
  height: calc(min(960px, 96vh) - 72px);
  min-height: 0;
  overflow: hidden;
}

.asset-selector :deep(.n-tabs) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.asset-selector :deep(.n-tab-pane),
.asset-selector :deep(.n-tabs-pane-wrapper) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.asset-selector-tab {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding-top: 8px;
}

.asset-selector-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 0;
}

.asset-selector-toolbar .field-hint {
  max-height: 40px;
  margin-top: 0;
  overflow: auto;
}

.asset-browser {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.asset-tree-pane,
.asset-list-pane {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.asset-tree-pane {
  max-height: none;
  height: 100%;
  overflow: auto;
  padding: 8px;
}

.asset-tree-pane :deep(.n-tree-node-content__text) {
  font-size: 12px;
}

.asset-list-pane {
  max-height: none;
  height: 100%;
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
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  align-content: start;
  gap: 12px;
  max-height: none;
  height: 100%;
  overflow: auto;
  padding: 10px;
}

.style-preset-shell {
  height: 100%;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
  overflow: hidden;
}

.style-preset-card {
  display: grid;
  grid-template-rows: auto auto minmax(42px, 1fr) auto auto;
  gap: 7px;
  min-width: 0;
  min-height: 176px;
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

.style-preset-state {
  display: flex;
  align-items: center;
  min-width: 0;
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

.style-preset-detail-modal {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.style-preset-detail-notes {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.style-preset-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.style-preset-detail-grid section {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.84);
}

.style-preset-detail-grid span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.style-preset-detail-grid pre {
  max-height: min(34vh, 320px);
  margin: 0;
  overflow: auto;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
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
  .asset-detail,
  .style-preset-detail-grid {
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

  .style-preset-detail-grid pre {
    max-height: 220px;
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

  .asset-composer-main,
  .asset-composer-grid,
  .asset-composer-grid.two-columns {
    grid-template-columns: 1fr;
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

  .preset-selector-modal :deep(.n-card__content) {
    height: calc(92vh - 72px);
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

}
</style>
