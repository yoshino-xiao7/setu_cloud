<script setup lang="ts">
import type { AiCapabilityItem, AiCapabilityResponse, AiServiceStatusResponse, AiWorkerNode } from '@/api/aiGeneration'
import {
  CheckmarkCircleOutline,
  CubeOutline,
  FlashOutline,
  HourglassOutline,
  LayersOutline,
  RefreshOutline,
  ServerOutline,
  TimeOutline,
  WarningOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NProgress,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { fetchAiCapabilities, fetchAiStatus } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'

interface CapabilityGroup {
  key: string
  title: string
  items: AiCapabilityItem[]
}

const message = useMessage()
const loading = ref(false)
const status = shallowRef<AiServiceStatusResponse | null>(null)
const capabilities = shallowRef<AiCapabilityResponse>({
  checkpoints: [],
  loras: [],
  vaes: [],
  characters: [],
  promptPresets: [],
  workers: [],
})

const queueItems = computed(() => [
  { key: 'queued', label: '排队中', value: status.value?.queuedCount || 0, tone: 'warning' },
  { key: 'claimed', label: '已领取', value: status.value?.claimedCount || 0, tone: 'info' },
  { key: 'running', label: '生成中', value: status.value?.runningCount || 0, tone: 'success' },
  { key: 'uploading', label: '上传中', value: status.value?.uploadingCount || 0, tone: 'primary' },
])

const queueTotal = computed(() => queueItems.value.reduce((sum, item) => sum + item.value, 0))

const activeWorkerCount = computed(() => status.value?.activeWorkerCount || 0)
const workerCount = computed(() => status.value?.workerCount || status.value?.workers?.length || capabilities.value.workers.length || 0)
const workerOnlinePercent = computed(() => {
  if (!workerCount.value)
    return 0
  return Math.round((activeWorkerCount.value / workerCount.value) * 100)
})

const workerRows = computed<AiWorkerNode[]>(() => {
  const fromStatus = status.value?.workers || []
  return fromStatus.length ? fromStatus : capabilities.value.workers
})

const serviceState = computed(() => {
  if (!status.value) {
    return {
      label: loading.value ? '检测中' : '未知',
      tagType: 'default' as const,
      icon: TimeOutline,
      detail: '正在读取云端状态',
    }
  }
  if (status.value.online) {
    return {
      label: '在线',
      tagType: 'success' as const,
      icon: CheckmarkCircleOutline,
      detail: status.value.message || 'Worker 可接收生图任务',
    }
  }
  return {
    label: '离线',
    tagType: 'error' as const,
    icon: WarningOutline,
    detail: status.value.message || '当前没有在线 Worker',
  }
})

const capabilityGroups = computed<CapabilityGroup[]>(() => [
  { key: 'checkpoints', title: 'Checkpoint', items: capabilities.value.checkpoints },
  { key: 'loras', title: 'LoRA', items: capabilities.value.loras },
  { key: 'characters', title: '角色预设', items: capabilities.value.characters },
  { key: 'promptPresets', title: '风格预设', items: capabilities.value.promptPresets },
  { key: 'vaes', title: 'VAE', items: capabilities.value.vaes },
])

const totalCapabilities = computed(() =>
  capabilityGroups.value.reduce((sum, group) => sum + group.items.length, 0),
)

function formatWait(seconds?: number) {
  if (!seconds)
    return '较短'
  if (seconds < 60)
    return `${seconds} 秒`
  return `${Math.ceil(seconds / 60)} 分钟`
}

function formatMaybeDate(value?: string | null) {
  return value ? formatDate(value) : '-'
}

function workerStatusType(worker: AiWorkerNode) {
  return worker.status === 'ONLINE' ? 'success' : 'error'
}

function workerStatusLabel(worker: AiWorkerNode) {
  if (worker.status === 'ONLINE')
    return '在线'
  if (worker.status === 'OFFLINE')
    return '离线'
  return worker.status || '未知'
}

function displayCapability(item: AiCapabilityItem) {
  return item.displayName || item.name
}

async function loadData() {
  loading.value = true
  try {
    const [statusResp, capsResp] = await Promise.all([
      fetchAiStatus(),
      fetchAiCapabilities(),
    ])
    status.value = unwrapApiData(statusResp, null)
    capabilities.value = unwrapApiData(capsResp, capabilities.value)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载 AI Worker 状态失败')
  }
  finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="title-block">
        <span class="eyebrow">AI 绘图运行态</span>
        <h1>AI Worker 状态</h1>
        <p>查看 Worker 在线情况、任务队列和已上报的模型能力。</p>
      </div>
      <NButton secondary :loading="loading" @click="loadData">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NSpin :show="loading">
      <div class="summary-grid">
        <section class="summary-card service-card">
          <div class="summary-icon" :class="serviceState.tagType">
            <NIcon :component="serviceState.icon" />
          </div>
          <div class="summary-body">
            <span class="summary-label">服务状态</span>
            <div class="summary-main">
              <strong>{{ serviceState.label }}</strong>
              <NTag :type="serviceState.tagType" size="small" round>
                {{ status?.status || 'UNKNOWN' }}
              </NTag>
            </div>
            <p>{{ serviceState.detail }}</p>
          </div>
        </section>

        <section class="summary-card">
          <div class="summary-icon blue">
            <NIcon><ServerOutline /></NIcon>
          </div>
          <div class="summary-body">
            <span class="summary-label">在线 Worker</span>
            <div class="summary-main">
              <strong>{{ activeWorkerCount }} / {{ workerCount }}</strong>
            </div>
            <NProgress
              type="line"
              :percentage="workerOnlinePercent"
              :show-indicator="false"
              :height="6"
              processing
            />
          </div>
        </section>

        <section class="summary-card">
          <div class="summary-icon amber">
            <NIcon><HourglassOutline /></NIcon>
          </div>
          <div class="summary-body">
            <span class="summary-label">队列任务</span>
            <div class="summary-main">
              <strong>{{ queueTotal }}</strong>
            </div>
            <p>预计等待 {{ formatWait(status?.estimatedWaitSeconds) }}</p>
          </div>
        </section>

        <section class="summary-card">
          <div class="summary-icon violet">
            <NIcon><CubeOutline /></NIcon>
          </div>
          <div class="summary-body">
            <span class="summary-label">能力条目</span>
            <div class="summary-main">
              <strong>{{ totalCapabilities }}</strong>
            </div>
            <p>{{ capabilities.checkpoints.length }} 个 Checkpoint，{{ capabilities.loras.length }} 个 LoRA</p>
          </div>
        </section>
      </div>

      <div class="content-grid">
        <NCard class="panel-card queue-panel" :bordered="false">
          <template #header>
            <div class="panel-title">
              <NIcon><FlashOutline /></NIcon>
              <span>队列拆分</span>
            </div>
          </template>

          <div class="queue-grid">
            <div v-for="item in queueItems" :key="item.key" class="queue-item" :class="item.tone">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </NCard>

        <NCard class="panel-card meta-panel" :bordered="false">
          <template #header>
            <div class="panel-title">
              <NIcon><TimeOutline /></NIcon>
              <span>服务时间</span>
            </div>
          </template>

          <div class="meta-list">
            <div>
              <span>服务器时间</span>
              <strong>{{ formatMaybeDate(status?.serverTime) }}</strong>
            </div>
            <div>
              <span>最近心跳</span>
              <strong>{{ formatMaybeDate(status?.lastSeenAt) }}</strong>
            </div>
            <div>
              <span>开放状态</span>
              <strong>{{ status?.openNow ? '开放中' : '未开放' }}</strong>
            </div>
            <div>
              <span>时区</span>
              <strong>{{ status?.timezone || '-' }}</strong>
            </div>
          </div>
        </NCard>
      </div>

      <NCard class="panel-card worker-card" :bordered="false">
        <template #header>
          <div class="panel-title">
            <NIcon><ServerOutline /></NIcon>
            <span>Worker 节点</span>
          </div>
        </template>

        <div v-if="workerRows.length" class="worker-list">
          <div v-for="worker in workerRows" :key="worker.workerId" class="worker-row">
            <div class="worker-main">
              <strong>{{ worker.nodeName || worker.workerId }}</strong>
              <p>{{ worker.workerId }}</p>
            </div>
            <div class="worker-meta">
              <NTag :type="workerStatusType(worker)" round>
                {{ workerStatusLabel(worker) }}
              </NTag>
              <span>{{ worker.version || 'unknown' }}</span>
              <span>{{ formatMaybeDate(worker.lastSeenAt) }}</span>
            </div>
            <p v-if="worker.message" class="worker-message">
              {{ worker.message }}
            </p>
          </div>
        </div>
        <NEmpty v-else description="暂无 Worker 心跳" />
      </NCard>

      <NCard class="panel-card capability-card" :bordered="false">
        <template #header>
          <div class="panel-title">
            <NIcon><LayersOutline /></NIcon>
            <span>模型能力</span>
          </div>
        </template>

        <div class="capability-grid">
          <section v-for="group in capabilityGroups" :key="group.key" class="capability-group">
            <div class="capability-heading">
              <h3>{{ group.title }}</h3>
              <NTag size="small" round>
                {{ group.items.length }}
              </NTag>
            </div>
            <NSpace v-if="group.items.length" size="small" wrap>
              <NTag v-for="item in group.items.slice(0, 12)" :key="`${group.key}-${item.workerId || ''}-${item.name}`" size="small">
                {{ displayCapability(item) }}
              </NTag>
              <NTag v-if="group.items.length > 12" size="small" type="info">
                +{{ group.items.length - 12 }}
              </NTag>
            </NSpace>
            <p v-else class="muted">
              暂未上报
            </p>
          </section>
        </div>
      </NCard>
    </NSpin>
  </div>
</template>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  min-width: 0;
}

.eyebrow {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.page-header h1 {
  margin: 4px 0 0;
  color: #263247;
  font-size: 26px;
}

.page-header p,
.summary-body p,
.worker-main p,
.worker-message,
.muted {
  margin: 4px 0 0;
  color: #64748b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card,
.panel-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
}

.summary-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-height: 142px;
  padding: 18px;
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
  font-size: 22px;
}

.summary-icon.success,
.summary-icon.green {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.summary-icon.error {
  background: rgba(244, 63, 94, 0.12);
  color: #e11d48;
}

.summary-icon.blue {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.summary-icon.amber {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.summary-icon.violet {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}

.summary-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.summary-label {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.summary-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-main strong {
  color: #0f172a;
  font-size: 28px;
  line-height: 1;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 14px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #263247;
  font-weight: 700;
}

.queue-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.queue-item {
  display: grid;
  gap: 8px;
  min-height: 96px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.queue-item span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.queue-item strong {
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
}

.queue-item.warning {
  background: rgba(245, 158, 11, 0.08);
}

.queue-item.info {
  background: rgba(14, 165, 233, 0.08);
}

.queue-item.success {
  background: rgba(16, 185, 129, 0.08);
}

.queue-item.primary {
  background: rgba(99, 102, 241, 0.08);
}

.meta-list {
  display: grid;
  gap: 12px;
}

.meta-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  padding-bottom: 10px;
}

.meta-list div:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.meta-list span {
  color: #64748b;
}

.meta-list strong {
  color: #263247;
  text-align: right;
}

.worker-card,
.capability-card {
  margin-top: 0;
}

.worker-list {
  display: grid;
  gap: 10px;
}

.worker-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 14px;
  background: rgba(248, 250, 252, 0.72);
}

.worker-main {
  min-width: 0;
}

.worker-main strong {
  color: #263247;
}

.worker-main p,
.worker-message {
  overflow-wrap: anywhere;
}

.worker-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  color: #64748b;
  font-size: 13px;
}

.worker-message {
  grid-column: 1 / -1;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.capability-group {
  min-height: 128px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.capability-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.capability-heading h3 {
  margin: 0;
  color: #263247;
  font-size: 14px;
}

@media (max-width: 1180px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid,
  .capability-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-page {
    padding: 16px;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid,
  .queue-grid {
    grid-template-columns: 1fr;
  }

  .worker-row {
    grid-template-columns: 1fr;
  }

  .worker-meta,
  .meta-list div {
    align-items: flex-start;
    flex-direction: column;
  }

  .meta-list strong {
    text-align: left;
  }
}
</style>
