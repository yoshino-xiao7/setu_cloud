<script setup lang="ts">
import type { AiCapabilityResponse, AiGenerationJob } from '@/api/aiGeneration'
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
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NImage,
  NInput,
  NInputNumber,
  NSelect,
  NSkeleton,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import { createAiGeneration, fetchAiCapabilities, fetchAiGeneration, fetchMyAiGenerations } from '@/api/aiGeneration'
import { getMyPoints } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAuthStore } from '@/stores/auth'
import { getAiGenerationStatusMeta, getAiReviewStatusMeta } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const COST_PER_IMAGE = 50
const message = useMessage()
const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 1)

const capabilities = shallowRef<AiCapabilityResponse>({
  checkpoints: [],
  loras: [],
  vaes: [],
  characters: [],
  workers: [],
})
const recentJobs = shallowRef<AiGenerationJob[]>([])
const activeJob = ref<AiGenerationJob | null>(null)
const loadingCapabilities = ref(false)
const generating = ref(false)
const historyLoading = ref(false)
const pointsLoading = ref(false)
const points = ref(0)
let pollTimer: number | undefined

const form = reactive({
  promptCn: '',
  width: 768,
  height: 1024,
  steps: 24,
  cfg: 7,
  seed: null as number | null,
  checkpoint: '',
  loraName: '',
  loraStrength: 0.8,
  characterId: '',
  styleTags: '',
})

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

const canGenerate = computed(() => {
  return !!form.promptCn.trim() && (isAdmin.value || points.value >= COST_PER_IMAGE)
})

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
      showApiError(message, error, '加载最近生图失败')
  }
  finally {
    historyLoading.value = false
  }
}

async function generate() {
  if (!form.promptCn.trim()) {
    message.warning('先写一点你想画什么')
    return
  }
  if (!canGenerate.value) {
    message.warning(`积分不足，生成一张图需要 ${COST_PER_IMAGE} 积分`)
    return
  }
  generating.value = true
  try {
    const job = unwrapApiData(await createAiGeneration({
      promptCn: form.promptCn.trim(),
      width: form.width,
      height: form.height,
      steps: form.steps,
      cfg: form.cfg,
      seed: form.seed || undefined,
      checkpoint: form.checkpoint || undefined,
      loraName: form.loraName || undefined,
      loraStrength: form.loraName ? form.loraStrength : 0,
      characterId: form.characterId || undefined,
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
  form.width = job.width || 768
  form.height = job.height || 1024
  form.steps = job.steps || 24
  form.cfg = job.cfg || 7
  form.seed = job.seed || null
  form.checkpoint = job.checkpoint || ''
  form.loraName = job.loraName || ''
  form.loraStrength = job.loraStrength || 0.8
  form.characterId = job.characterId || ''
}

onMounted(async () => {
  await Promise.all([loadCapabilities(), loadPoints(), loadRecentJobs()])
})

onUnmounted(stopPolling)
</script>

<template>
  <div class="ai-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          AI 绘图
        </h1>
        <p class="ui-page-subtitle">
          每张图消耗 <b>{{ COST_PER_IMAGE }}</b> 积分，管理员免费。模型和 LoRA 来自当前在线的本机 Worker。
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

    <div class="draw-layout">
      <NCard class="ui-card draw-card" :bordered="false">
        <template #header>
          <div class="card-title">
            <NIcon><ColorWandOutline /></NIcon>
            生图参数
          </div>
        </template>

        <NAlert v-if="!capabilities.workers.length" type="warning" class="worker-alert">
          当前没有 Worker 上报在线能力，任务可以入队，但需要本机 Worker 启动后才会生成。
        </NAlert>

        <NForm label-placement="top">
          <NFormItem label="中文描述">
            <NInput
              v-model:value="form.promptCn"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 10 }"
              maxlength="1000"
              show-count
              placeholder="例如：银发少女，夜晚街景，赛博朋克霓虹，电影光影"
            />
          </NFormItem>

          <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
            <NGridItem>
              <NFormItem label="Checkpoint">
                <NSelect v-model:value="form.checkpoint" :options="checkpointOptions" filterable />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="角色预设">
                <NSelect v-model:value="form.characterId" :options="characterOptions" filterable />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="LoRA">
                <NSelect v-model:value="form.loraName" :options="loraOptions" filterable />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="LoRA 强度">
                <NInputNumber v-model:value="form.loraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.loraName" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="宽度">
                <NInputNumber v-model:value="form.width" :min="512" :max="1536" :step="64" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="高度">
                <NInputNumber v-model:value="form.height" :min="512" :max="1536" :step="64" />
              </NFormItem>
            </NGridItem>
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
              <NFormItem label="附加风格 tag">
                <NInput v-model:value="form.styleTags" clearable placeholder="masterpiece, cinematic lighting" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NButton type="primary" size="large" block :loading="generating" :disabled="!canGenerate" @click="generate">
            <template #icon>
              <NIcon><SparklesOutline /></NIcon>
            </template>
            生成一张图
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
            <NTag :type="getAiReviewStatusMeta(activeJob.reviewStatus).type" round>
              {{ getAiReviewStatusMeta(activeJob.reviewStatus).label }}
            </NTag>
            <span>#{{ activeJob.id }}</span>
            <span>{{ activeJob.width }}x{{ activeJob.height }}</span>
          </div>
          <p class="prompt-preview">
            {{ activeJob.promptCn }}
          </p>
          <NAlert v-if="activeJob.errorMessage" type="error">
            {{ activeJob.errorMessage }}
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
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
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

.image-stage {
  width: min(100%, 520px);
  aspect-ratio: 3 / 4;
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
  aspect-ratio: 3 / 4;
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
}
</style>
