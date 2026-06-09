<script setup lang="ts">
import type { DataTableColumns, PaginationProps } from 'naive-ui'
// ✅ 引入你新建的类型文件 (请根据实际路径调整)
import type { KeyState, OverviewData, UsageLogItem } from '@/api/dashboard'
import {
  HardwareChipOutline,
  KeyOutline,
  RefreshOutline,
  SpeedometerOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NIcon,
  NSkeleton,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchMyApiKeys } from '@/api/apiKey'
import http from '@/api/http'
import { unwrapApiData } from '@/api/response'

import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'
import { safePush } from '@/utils/navigation'

const router = useRouter()
const message = useMessage()

interface UsageLogsPayload {
  count?: number
  data?: UsageLogItem[]
  items?: UsageLogItem[]
  list?: UsageLogItem[]
  total?: number
}

function getUsageLogsPayload(response: unknown): UsageLogItem[] | UsageLogsPayload {
  const body = response && typeof response === 'object' && 'data' in response
    ? (response as { data?: unknown }).data
    : response

  if (body && typeof body === 'object') {
    const payload = body as UsageLogsPayload
    if (
      Array.isArray(payload.data)
      || Array.isArray(payload.items)
      || Array.isArray(payload.list)
    ) {
      return payload
    }
  }

  return unwrapApiData<UsageLogItem[] | UsageLogsPayload>(response, [])
}

function goToApiKeys() {
  void safePush(router, '/dashboard/api-keys')
}

// ==========================================
// 模块 A: API Key 配额逻辑
// ==========================================
// 使用接口定义类型，更加安全
const keyState = reactive<KeyState>({
  count: 0,
  limit: 10,
  loading: false,
})
const keyError = ref('')

const keyUsagePercent = computed(() => {
  if (keyState.limit <= 0)
    return 0
  const raw = (keyState.count / keyState.limit) * 100
  return Math.round(Math.min(Math.max(raw, 0), 100))
})

const keyProgressColor = computed(() => {
  const used = keyState.count
  if (used < 5)
    return '#f586a9'
  if (used < 8)
    return '#ec4899'
  return '#ef4444'
})

async function fetchKeyStats() {
  keyState.loading = true
  keyError.value = ''
  try {
    const list = await fetchMyApiKeys()
    keyState.count = list.length
    // 如果后端返回 limit，请在此处更新: keyState.limit = ...
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    keyError.value = getApiErrorMessage(e, 'Key 配额加载失败')
  }
  finally {
    keyState.loading = false
  }
}

// ==========================================
// 模块 B: 调用概览数据
// ==========================================
const overview = reactive<OverviewData & { loading: boolean }>({
  totalCalls: 0,
  todayCalls: 0,
  lastCalledAt: null,
  loading: false,
})
const overviewError = ref('')

async function fetchOverview() {
  overview.loading = true
  overviewError.value = ''
  try {
    const res = await http.get('/usage/overview')
    const data = unwrapApiData<Partial<OverviewData>>(res, {})
    overview.totalCalls = data.totalCalls ?? 0
    overview.todayCalls = data.todayCalls ?? 0
    overview.lastCalledAt = data.lastCalledAt || null
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    overviewError.value = getApiErrorMessage(e, '调用概览加载失败')
  }
  finally {
    overview.loading = false
  }
}

// ==========================================
// 模块 C: 日志表格逻辑
// ==========================================
const tableState = reactive({
  loading: false,
  data: [] as UsageLogItem[], // ✅ 这里使用了导入的类型
})
const logsError = ref('')

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  prefix: info => `共 ${info.itemCount} 条`,
})

// 表格列定义
const columns: DataTableColumns<UsageLogItem> = [
  { title: '时间', key: 'timestamp', width: 160, ellipsis: { tooltip: true }, render: row => formatDate(row.timestamp) },
  {
    title: '请求路径',
    key: 'endpoint',
    ellipsis: { tooltip: true },
    render: row => h('span', { style: 'font-family: monospace;' }, row.endpoint),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row) {
      const isSuccess = row.status >= 200 && row.status < 300
      return h(
        'span',
        {
          style: {
            color: isSuccess ? '#10b981' : '#ef4444',
            fontWeight: '600',
            background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
          },
        },
        row.status,
      )
    },
  },
  { title: 'IP', key: 'ip', width: 130, ellipsis: { tooltip: true } },
]

async function fetchLogs() {
  tableState.loading = true
  logsError.value = ''
  try {
    const res = await http.get('/usage/logs', {
      params: { page: pagination.page, limit: pagination.pageSize },
    })

    const raw = getUsageLogsPayload(res)
    let list: UsageLogItem[] = []
    let total = 0

    if (Array.isArray(raw)) {
      list = raw
      total = raw.length
    }
    else if (raw?.data && Array.isArray(raw.data)) {
      list = raw.data
      total = raw.total || raw.count || 0
    }
    else if (raw?.items && Array.isArray(raw.items)) {
      list = raw.items
      total = raw.total || raw.count || 0
    }
    else if (raw?.list && Array.isArray(raw.list)) {
      list = raw.list
      total = raw.total || 0
    }

    tableState.data = list
    pagination.itemCount = total
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    logsError.value = getApiErrorMessage(e, '日志加载失败')
    message.error(logsError.value)
  }
  finally {
    tableState.loading = false
  }
}

// 分页事件处理
function handlePageChange(page: number) {
  pagination.page = page
  fetchLogs()
}
function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchLogs()
}
function refreshLogs() {
  pagination.page = 1
  fetchLogs()
}

// ==========================================
// 初始化
// ==========================================
onMounted(() => {
  fetchKeyStats()
  fetchOverview()
  fetchLogs()
})
</script>

<template>
  <div class="dashboard-page ui-page">
    <div class="dashboard-header ui-page-header">
      <div class="title-block">
        <h1 class="page-title ui-page-title">
          仪表盘
        </h1>
        <p class="subtitle ui-page-subtitle">
          实时监控您的 API 使用情况与系统状态
        </p>
      </div>
      <NButton
        secondary
        strong
        round
        type="primary"
        class="action-btn"
        @click="goToApiKeys"
      >
        <template #icon>
          <NIcon><KeyOutline /></NIcon>
        </template>
        管理 Key
      </NButton>
    </div>

    <div class="overview-grid">
      <div class="overview-card ui-card">
        <div class="overview-icon pink">
          <NIcon size="20">
            <TimeOutline />
          </NIcon>
        </div>
        <div class="overview-copy">
          <span class="overview-label">今日调用</span>
          <NSkeleton v-if="overview.loading" text width="64px" />
          <strong v-else class="overview-value">{{ overview.todayCalls }}</strong>
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-icon blue">
          <NIcon size="20">
            <HardwareChipOutline />
          </NIcon>
        </div>
        <div class="overview-copy">
          <span class="overview-label">历史总量</span>
          <NSkeleton v-if="overview.loading" text width="80px" />
          <strong v-else class="overview-value">{{ overview.totalCalls }}</strong>
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-icon violet">
          <NIcon size="20">
            <KeyOutline />
          </NIcon>
        </div>
        <div class="overview-copy">
          <span class="overview-label">Key 使用</span>
          <NSkeleton v-if="keyState.loading" text width="70px" />
          <strong v-else class="overview-value">{{ keyState.count }}<small>/{{ keyState.limit }}</small></strong>
        </div>
      </div>
      <div class="overview-card ui-card wide">
        <div class="overview-icon mint">
          <NIcon size="20">
            <SpeedometerOutline />
          </NIcon>
        </div>
        <div class="overview-copy">
          <span class="overview-label">上次活跃</span>
          <NSkeleton v-if="overview.loading" text width="150px" />
          <strong v-else class="overview-value is-date">{{ formatDate(overview.lastCalledAt) }}</strong>
        </div>
      </div>
    </div>

    <NAlert
      v-if="overviewError || keyError"
      type="warning"
      class="status-alert"
      :show-icon="false"
    >
      {{ overviewError || keyError }}
      <NButton text type="primary" size="small" class="inline-retry" @click="fetchOverview(); fetchKeyStats()">
        重试
      </NButton>
    </NAlert>

    <div class="dashboard-grid">
      <div class="left-panel">
        <NCard :bordered="false" class="glass-card ui-card quota-card">
          <div class="card-header">
            <div class="icon-box purple">
              <NIcon size="20">
                <SpeedometerOutline />
              </NIcon>
            </div>
            <span class="card-title">配额使用率</span>
          </div>

          <div class="quota-body">
            <div class="quota-text">
              <span class="current">{{ keyState.count }}</span>
              <span class="divider">/</span>
              <span class="total">{{ keyState.limit }}</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${keyUsagePercent}%`, background: keyProgressColor }"
              />
            </div>
            <div class="quota-footer">
              <span v-if="keyState.count < keyState.limit">
                剩余可创建 {{ keyState.limit - keyState.count }} 个 Key
              </span>
              <span v-else class="text-danger">配额已耗尽</span>
            </div>
          </div>
        </NCard>
      </div>

      <div class="right-panel">
        <NCard :bordered="false" class="glass-card ui-card table-card">
          <template #header>
            <div class="table-card-header">
              <span class="card-title">最近调用日志</span>
              <NButton text size="small" @click="refreshLogs">
                <template #icon>
                  <NIcon><RefreshOutline /></NIcon>
                </template>
                刷新
              </NButton>
            </div>
          </template>

          <div class="table-scroll-container">
            <NAlert v-if="logsError" type="error" class="logs-alert" :show-icon="false">
              {{ logsError }}
              <NButton text type="primary" size="small" class="inline-retry" @click="fetchLogs">
                重试
              </NButton>
            </NAlert>
            <NEmpty
              v-else-if="!tableState.loading && tableState.data.length === 0"
              description="暂无调用日志"
              class="logs-empty"
            />
            <NDataTable
              v-else
              remote
              size="small"
              :columns="columns"
              :data="tableState.data"
              :loading="tableState.loading"
              :pagination="pagination"
              :single-line="false"
              class="glass-table"
              :scroll-x="600"
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange"
            />
          </div>
        </NCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* =================================
   全局布局与变量
   ================================= */
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 60px; /* 底部留白，防手机遮挡 */
  width: 100%;
  box-sizing: border-box; /* 防止 padding 撑大页面 */
}

/* 头部 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  flex-wrap: wrap; /* 防止手机端标题和按钮挤在一起 */
  gap: 12px;
}

.page-title { margin: 0; }
.subtitle { margin: 6px 0 0 0; }

.action-btn {
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.18) 0%, rgba(255, 255, 255, 0.62) 100%);
  color: var(--ui-primary-hover);
  border: 1px solid rgba(245, 134, 169, 0.22);
  box-shadow: 0 8px 20px rgba(245, 134, 169, 0.12);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.status-alert {
  border-radius: var(--ui-radius-md);
}

.inline-retry {
  margin-left: 8px;
  vertical-align: baseline;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  min-width: 0;
}

.overview-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.overview-icon.pink { color: #f26d99; background: rgba(245, 134, 169, 0.15); }
.overview-icon.blue { color: #3b82f6; background: rgba(59, 130, 246, 0.13); }
.overview-icon.violet { color: #8b5cf6; background: rgba(139, 92, 246, 0.13); }
.overview-icon.mint { color: #0f9f8a; background: rgba(32, 191, 169, 0.14); }

.overview-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.overview-label {
  font-size: 12px;
  color: var(--ui-text-muted);
  font-weight: 600;
  margin-bottom: 4px;
}

.overview-value {
  color: var(--ui-text);
  font-size: 24px;
  line-height: 1.1;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-value small {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ui-text-soft);
}

.overview-value.is-date {
  font-size: 15px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

/* =================================
   核心网格系统 (PC / Mobile 切换)
   ================================= */
.dashboard-grid {
  display: grid;
  /* PC端：左侧固定320px，右侧自适应 */
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0; /* 防止 Flex 子项溢出 */
}

/* 右侧面板 */
.right-panel {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 关键：防止 Grid/Flex 子项内表格撑开父容器 */
}

/* 🔥🔥 手机端适配核心代码 (< 960px) 🔥🔥 */
@media (max-width: 960px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    /* 强制切换为 Flex 垂直布局 */
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .left-panel, .right-panel {
    width: 100%; /* 占满屏幕宽度 */
  }

  /* 调整头部，让标题换行不那么拥挤 */
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .action-btn {
    width: 100%; /* 手机端按钮通栏，更容易点击 */
  }
}

@media (max-width: 560px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .overview-card {
    padding: 16px;
  }
}

/* =================================
   组件样式
   ================================= */

/* 液态玻璃数据卡片 */
.glass-card {
  border-radius: var(--ui-radius-lg) !important;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  --n-color: transparent !important;
  transform: translateZ(0);
}
:deep(.n-card__content) { padding: 20px; }
:deep(.n-card-header) { padding: 20px 20px 0; }

/* 配额卡片 */
.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.icon-box {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.icon-box.purple { background: rgba(245, 134, 169, 0.15); color: #f586a9; }
.card-title { font-weight: 800; color: var(--ui-text); font-size: 16px; }

.quota-body { display: flex; flex-direction: column; gap: 12px; }
.quota-text { display: flex; align-items: baseline; gap: 4px; }
.quota-text .current { font-size: 38px; font-weight: 850; color: var(--ui-text); line-height: 1; }
.quota-text .divider { font-size: 20px; color: var(--ui-text-soft); }
.quota-text .total { font-size: 20px; font-weight: 700; color: var(--ui-text-muted); }

.progress-track {
  height: 8px; background: rgba(0,0,0,0.06); border-radius: 99px; overflow: hidden;
}
.progress-fill { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.quota-footer { font-size: 12px; color: var(--ui-text-muted); }
.text-danger { color: #ef4444; }

/* 表格与滚动容器 */
.table-card { min-height: 400px; display: flex; flex-direction: column; }
.table-card-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px; }

/* 🔥 表格防溢出容器 🔥 */
.table-scroll-container {
  width: 100%;
  overflow-x: auto; /* 允许内部横向滚动 */
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.64);
}

.logs-alert {
  margin: 12px;
}

.logs-empty {
  padding: 44px 12px;
}

/* 表格样式修正 */
.glass-table {
  width: 100%;
  --n-td-color: transparent !important;
  --n-th-color: rgba(255, 255, 255, 0.64) !important;
  --n-border-color: rgba(0, 0, 0, 0.05) !important;
  --n-td-color-hover: rgba(245, 134, 169, 0.1) !important;
  --n-merged-td-color: transparent !important;
  --n-merged-th-color: rgba(255, 255, 255, 0.64) !important;
}

.glass-table :deep(.n-data-table-th) {
  font-weight: 600; color: #4b5563;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}
.glass-table :deep(.n-data-table-td) {
  color: #374151;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03) !important;
}
.glass-table :deep(.n-pagination-item) {
  background: transparent !important;
  border: 1px solid rgba(0,0,0,0.1) !important;
}
.glass-table :deep(.n-pagination-item--active) {
  background: #f586a9 !important;
  color: #fff !important;
  border: none !important;
}
</style>
