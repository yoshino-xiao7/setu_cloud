<script setup lang="ts">
import type { AiCapabilityResponse, AiGenerationJob, AiServiceStatusResponse } from '@/api/aiGeneration'
import {
  ColorWandOutline,
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
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSkeleton,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { createAiGeneration, fetchAiCapabilities, fetchAiGeneration, fetchAiPromptTranslation, fetchAiStatus, fetchMyAiGenerations, translateAiPrompt } from '@/api/aiGeneration'
import { getMyPoints } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAuthStore } from '@/stores/auth'
import { getAiGenerationStatusMeta, getAiReviewStatusMeta } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const COST_PER_IMAGE = 50
const PROMPT_TRANSLATION_POLL_MS = 1500
const PROMPT_TRANSLATION_TIMEOUT_MS = 120000
const SERVICE_STATUS_POLL_MS = 60000
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
let pollTimer: number | undefined
let serviceStatusTimer: number | undefined

const form = reactive({
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
  triggerWords: '',
  styleTags: '',
})

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

const checkpointOptions = computed(() => [
  { label: '默认模型', value: '' },
  ...capabilities.value.checkpoints.map(item => ({
    label: item.displayName || item.name,
    value: item.name,
  })),
])

const loraOptions = computed(() => [
  { label: '不使用 LoRA', value: '' },
  ...capabilities.value.loras.map(item => ({
    label: item.displayName || item.name,
    value: item.name,
  })),
])

const characterOptions = computed(() => [
  { label: '不使用角色预设', value: '' },
  ...capabilities.value.characters.map(item => ({
    label: item.displayName || item.name,
    value: item.name,
  })),
])

const selectedCharacterCapability = computed(() => {
  if (!form.characterId)
    return null
  return capabilities.value.characters.find(item => item.name === form.characterId) || null
})

const selectedCharacterMetadata = computed(() => parseMetadata(selectedCharacterCapability.value?.metadataJson))

const selectedLoraCapability = computed(() => {
  if (!form.loraName)
    return null
  return capabilities.value.loras.find(item => item.name === form.loraName) || null
})

const selectedLoraMetadata = computed(() => parseMetadata(selectedLoraCapability.value?.metadataJson))

const characterInjectedTags = computed(() => {
  const metadata = selectedCharacterMetadata.value
  return [
    metadata.trigger_words,
    metadata.default_positive,
    metadata.style_tags,
  ].filter(Boolean).join(', ')
})

const hasDrawablePrompt = computed(() => {
  return !!form.promptPositive.trim() || !!form.promptCn.trim()
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

const canGenerate = computed(() => {
  return serviceReady.value && hasDrawablePrompt.value && (isAdmin.value || points.value >= COST_PER_IMAGE)
})

const generateButtonText = computed(() => {
  if (isAdmin.value)
    return '生成一张图，管理员免费'
  return `生成一张图，消耗 ${COST_PER_IMAGE} 积分`
})

function formatWaitSeconds(seconds: number) {
  if (!seconds)
    return '较短'
  if (seconds < 60)
    return `${seconds} 秒`
  return `${Math.ceil(seconds / 60)} 分钟`
}

function mergedStyleTags() {
  return [form.triggerWords, form.styleTags].filter(Boolean).join(', ')
}

function applySizePreset(value: string | number) {
  const preset = sizePresets.find(item => item.value === String(value)) || sizePresets[0]
  selectedSize.value = preset.value
  form.width = preset.width
  form.height = preset.height
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
  if (!serviceReady.value) {
    message.warning(serviceStatusMessage.value)
    return false
  }
  translating.value = true
  try {
    let data = unwrapApiData(await translateAiPrompt({
      promptCn: form.promptCn.trim(),
      styleTags: mergedStyleTags() || undefined,
      negativePrompt: form.promptNegative || undefined,
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
    message.warning('先填写正向提示词，或写自然语言描绘后生成提示词')
    return
  }
  if (!serviceReady.value) {
    message.warning(serviceStatusMessage.value)
    return
  }
  if (!canGenerate.value) {
    message.warning(`积分不足，生成一张图需要 ${COST_PER_IMAGE} 积分`)
    return
  }
  if (!form.promptPositive.trim()) {
    const prepared = await preparePrompt()
    if (!prepared)
      return
  }
  generating.value = true
  try {
    const job = unwrapApiData(await createAiGeneration({
      promptCn: form.promptCn.trim() || form.promptPositive.trim(),
      promptPositive: form.promptPositive.trim(),
      promptNegative: form.promptNegative.trim(),
      styleNotes: form.styleNotes || undefined,
      width: form.width,
      height: form.height,
      steps: form.steps,
      cfg: form.cfg,
      seed: form.seed || undefined,
      checkpoint: form.checkpoint || undefined,
      loraName: form.loraName || undefined,
      loraStrength: form.loraName ? form.loraStrength : 0,
      characterId: form.characterId || undefined,
      triggerWords: form.triggerWords || undefined,
      styleTags: form.styleTags || undefined,
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
      activeJob.value = job
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        stopPolling()
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
  form.seed = job.seed || null
  form.checkpoint = job.checkpoint || ''
  form.loraName = job.loraName || ''
  form.loraStrength = job.loraStrength || 1
  form.characterId = job.characterId || ''
  form.triggerWords = ''
  form.styleTags = ''
  const preset = sizePresets.find(item => item.width === form.width && item.height === form.height)
  selectedSize.value = preset?.value || 'portrait'
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
  const metadata = selectedCharacterMetadata.value
  form.triggerWords = metadata.trigger_words || ''
  form.styleTags = metadata.style_tags || form.styleTags
  if (metadata.lora_name) {
    form.loraName = metadata.lora_name
    form.loraStrength = Number(metadata.lora_strength || 1)
  }
})

onMounted(async () => {
  await Promise.all([loadServiceStatus(), loadCapabilities(), loadPoints(), loadRecentJobs()])
  restorePrefill()
  startServiceStatusPolling()
})

onUnmounted(() => {
  stopPolling()
  stopServiceStatusPolling()
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
                  placeholder="生成后可继续编辑"
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
                <NSelect v-model:value="form.loraName" :options="loraOptions" filterable />
                <div v-if="form.loraName" class="field-hint">
                  推荐强度：{{ selectedLoraMetadata.recommended_strength || form.loraStrength }} ·
                  {{ selectedLoraMetadata.trigger_words || selectedLoraMetadata.notes || '未配置 LoRA 说明' }}
                </div>
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="角色预设">
                <NSelect v-model:value="form.characterId" :options="characterOptions" filterable />
                <div v-if="characterInjectedTags" class="field-hint">
                  将注入：{{ characterInjectedTags }}
                </div>
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="LoRA 强度">
                <NInputNumber v-model:value="form.loraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.loraName" />
              </NFormItem>
            </NGridItem>
          </NGrid>

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

      <NCard class="ui-card result-card" :bordered="false">
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
              object-fit="cover"
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
            <img v-if="job.imageUrl" :src="job.imageUrl" :alt="job.promptCn" loading="lazy" decoding="async">
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

.size-presets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.size-presets :deep(.n-radio-button) {
  width: 100%;
}

.size-presets :deep(.n-radio-button__label) {
  width: 100%;
  text-align: center;
  white-space: normal;
  line-height: 1.35;
}

.prompt-actions {
  display: grid;
  grid-template-columns: minmax(132px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin: 6px 0 16px;
  color: #64748b;
  font-size: 12px;
}

.prompt-actions :deep(.n-button) {
  min-width: 132px;
}

.prompt-actions span {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
}

.field-hint {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.advanced-panel {
  margin-bottom: 16px;
}

.image-stage {
  width: min(100%, 520px);
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
  object-fit: cover;
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
  width: min(100%, 620px);
  margin: 0;
  color: #475569;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.job-card {
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
  object-fit: cover;
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

  .size-presets {
    grid-template-columns: 1fr;
  }

  .prompt-actions {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .prompt-actions span {
    text-align: left;
  }
}
</style>
