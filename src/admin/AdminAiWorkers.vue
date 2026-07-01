<script setup lang="ts">
import type { AiCapabilityResponse, AiServiceStatusResponse } from '@/api/aiGeneration'
import { RefreshOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NIcon,
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

const queueTotal = computed(() =>
  (status.value?.queuedCount || 0)
  + (status.value?.claimedCount || 0)
  + (status.value?.runningCount || 0)
  + (status.value?.uploadingCount || 0),
)

function formatWait(seconds?: number) {
  if (!seconds)
    return '较短'
  if (seconds < 60)
    return `${seconds} 秒`
  return `${Math.ceil(seconds / 60)} 分钟`
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
      <div>
        <h1>AI Worker 状态</h1>
        <p>查看本机 Worker 在线状态、队列和已上报模型能力</p>
      </div>
      <NButton secondary :loading="loading" @click="loadData">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NSpin :show="loading">
      <div class="status-grid">
        <NCard class="panel-card" :bordered="false">
          <strong>{{ status?.online ? '在线' : '离线' }}</strong>
          <span>Worker 状态</span>
          <NTag :type="status?.online ? 'success' : 'error'" round>
            {{ status?.activeWorkerCount || 0 }} / {{ status?.workerCount || 0 }}
          </NTag>
        </NCard>
        <NCard class="panel-card" :bordered="false">
          <strong>{{ queueTotal }}</strong>
          <span>队列任务</span>
          <p>预计等待 {{ formatWait(status?.estimatedWaitSeconds) }}</p>
        </NCard>
        <NCard class="panel-card" :bordered="false">
          <strong>{{ capabilities.checkpoints.length }}</strong>
          <span>Checkpoint</span>
          <p>{{ capabilities.loras.length }} 个 LoRA · {{ capabilities.characters.length }} 个角色</p>
        </NCard>
        <NCard class="panel-card" :bordered="false">
          <strong>{{ status?.openNow ? '开放中' : '非开放时段' }}</strong>
          <span>普通用户 Beta 时段</span>
          <p>{{ status?.openStartTime || '08:30' }} - {{ status?.openEndTime || '22:30' }} 北京时间</p>
        </NCard>
      </div>

      <NCard class="panel-card worker-card" :bordered="false">
        <template #header>
          Worker 节点
        </template>
        <div v-if="status?.workers?.length" class="worker-list">
          <div v-for="worker in status.workers" :key="worker.workerId" class="worker-row">
            <div>
              <strong>{{ worker.nodeName || worker.workerId }}</strong>
              <p>{{ worker.workerId }} · {{ worker.version || 'unknown' }}</p>
            </div>
            <NSpace>
              <NTag :type="worker.status === 'ONLINE' ? 'success' : 'error'" round>
                {{ worker.status || 'UNKNOWN' }}
              </NTag>
              <span>{{ formatDate(worker.lastSeenAt) }}</span>
            </NSpace>
          </div>
        </div>
        <p v-else class="muted">
          暂无 Worker 心跳。
        </p>
      </NCard>

      <NCard class="panel-card worker-card" :bordered="false">
        <template #header>
          模型能力
        </template>
        <div class="capability-grid">
          <div>
            <h3>Checkpoint</h3>
            <p v-for="item in capabilities.checkpoints" :key="item.name">
              {{ item.displayName || item.name }}
            </p>
          </div>
          <div>
            <h3>LoRA</h3>
            <p v-for="item in capabilities.loras" :key="item.name">
              {{ item.displayName || item.name }}
            </p>
          </div>
          <div>
            <h3>角色预设</h3>
            <p v-for="item in capabilities.characters" :key="item.name">
              {{ item.displayName || item.name }}
            </p>
          </div>
          <div>
            <h3>风格预设</h3>
            <p v-for="item in capabilities.promptPresets" :key="item.name">
              {{ item.displayName || item.name }}
            </p>
          </div>
        </div>
      </NCard>
    </NSpin>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0;
  color: #263247;
}

.page-header p,
.panel-card p,
.panel-card span,
.muted {
  margin: 4px 0 0;
  color: #64748b;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.panel-card {
  border-radius: 8px;
}

.status-grid :deep(.n-card__content) {
  display: grid;
  gap: 8px;
}

.status-grid strong {
  color: #263247;
  font-size: 28px;
  line-height: 1;
}

.worker-card {
  margin-top: 14px;
}

.worker-list {
  display: grid;
  gap: 10px;
}

.worker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 12px;
  background: rgba(248, 250, 252, 0.72);
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.capability-grid h3 {
  margin: 0 0 8px;
  color: #263247;
  font-size: 14px;
}

.capability-grid p {
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .admin-page {
    padding: 16px;
  }

  .page-header,
  .worker-row {
    align-items: stretch;
    flex-direction: column;
  }

  .capability-grid {
    grid-template-columns: 1fr;
  }
}
</style>
