<script setup lang="ts">
import { computed, onMounted, h, reactive } from 'vue' // ✅ 已移除 ref
import { useRouter } from 'vue-router'
import {
  NButton, NCard, NDataTable, NIcon, useMessage,
  type DataTableColumns, type PaginationProps
} from 'naive-ui'
import {
  KeyOutline, SpeedometerOutline, RefreshOutline,
  TimeOutline, HardwareChipOutline
} from '@vicons/ionicons5'
import http from '@/api/http'

// ✅ 引入你新建的类型文件 (请根据实际路径调整)
import type { UsageLogItem, OverviewData, KeyState } from '@/api/dashboard'

const router = useRouter()
const message = useMessage()

// ==========================================
// 模块 A: API Key 配额逻辑
// ==========================================
// 使用接口定义类型，更加安全
const keyState = reactive<KeyState>({
  count: 0,
  limit: 10,
  loading: false
})

const keyUsagePercent = computed(() => {
  if (keyState.limit <= 0) return 0
  const raw = (keyState.count / keyState.limit) * 100
  return Math.round(Math.min(Math.max(raw, 0), 100))
})

const keyProgressColor = computed(() => {
  const used = keyState.count
  if (used < 5) return '#8b5cf6'
  if (used < 8) return '#ec4899'
  return '#ef4444'
})

async function fetchKeyStats() {
  keyState.loading = true
  try {
    const res = await http.get('/api-key/list')
    const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    keyState.count = list.length
    // 如果后端返回 limit，请在此处更新: keyState.limit = ...
  } catch (e) {
    console.error('Fetch Keys Failed', e)
  } finally {
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
  loading: false
})

async function fetchOverview() {
  overview.loading = true
  try {
    const res = await http.get('/usage/overview')
    const data = res.data?.data || res.data || {}
    overview.totalCalls = data.totalCalls ?? 0
    overview.todayCalls = data.todayCalls ?? 0
    overview.lastCalledAt = data.lastCalledAt || null
  } catch (e) {
    console.error('Fetch Overview Failed', e)
  } finally {
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

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  prefix: (info) => `共 ${info.itemCount} 条`
})

// 表格列定义
const columns: DataTableColumns<UsageLogItem> = [
  { title: '时间', key: 'timestamp', width: 160, ellipsis: { tooltip: true } },
  {
    title: '请求路径',
    key: 'endpoint',
    ellipsis: { tooltip: true },
    render: (row) => h('span', { style: 'font-family: monospace;' }, row.endpoint)
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
            fontSize: '12px'
          }
        },
        row.status
      )
    }
  },
  { title: 'IP', key: 'ip', width: 130, ellipsis: { tooltip: true } }
]

async function fetchLogs() {
  tableState.loading = true
  try {
    const res = await http.get('/usage/logs', {
      params: { page: pagination.page, limit: pagination.pageSize }
    })

    const raw = res.data
    let list: UsageLogItem[] = []
    let total = 0

    if (Array.isArray(raw)) {
      list = raw
      total = raw.length
    } else if (raw?.data && Array.isArray(raw.data)) {
      list = raw.data
      total = raw.total || raw.count || 0
    } else if (raw?.list && Array.isArray(raw.list)) {
      list = raw.list
      total = raw.total || 0
    }

    tableState.data = list
    pagination.itemCount = total
  } catch (e) {
    message.error('日志加载失败')
  } finally {
    tableState.loading = false
  }
}

// 分页事件处理
const handlePageChange = (page: number) => {
  pagination.page = page
  fetchLogs()
}
const handlePageSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchLogs()
}
const refreshLogs = () => {
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
  <div class="dashboard-page">

    <div class="dashboard-header">
      <div class="title-block">
        <h1 class="page-title">仪表盘</h1>
        <p class="subtitle">实时监控您的 API 使用情况与系统状态</p>
      </div>
      <n-button
        secondary
        strong
        round
        type="primary"
        @click="router.push('/dashboard/api-keys')"
        class="action-btn"
      >
        <template #icon><n-icon><KeyOutline /></n-icon></template>
        管理 Key
      </n-button>
    </div>

    <div class="dashboard-grid">

      <div class="left-panel">

        <n-card :bordered="false" class="glass-card quota-card">
          <div class="card-header">
            <div class="icon-box purple">
              <n-icon size="20"><SpeedometerOutline /></n-icon>
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
                :style="{ width: keyUsagePercent + '%', background: keyProgressColor }"
              ></div>
            </div>
            <div class="quota-footer">
              <span v-if="keyState.count < keyState.limit">
                剩余可创建 {{ keyState.limit - keyState.count }} 个 Key
              </span>
              <span v-else class="text-danger">配额已耗尽</span>
            </div>
          </div>
        </n-card>

        <div class="stats-row">
          <div class="glass-stat-box">
            <div class="stat-label">今日调用</div>
            <div class="stat-num highlight">{{ overview.todayCalls }}</div>
            <n-icon class="bg-icon" :component="TimeOutline" />
          </div>
          <div class="glass-stat-box">
            <div class="stat-label">历史总量</div>
            <div class="stat-num">{{ overview.totalCalls }}</div>
            <n-icon class="bg-icon" :component="HardwareChipOutline" />
          </div>
        </div>

        <div class="glass-info-bar">
          <span class="label">上次活跃</span>
          <span class="value">{{ overview.lastCalledAt || '暂无记录' }}</span>
        </div>

      </div>

      <div class="right-panel">
        <n-card :bordered="false" class="glass-card table-card">
          <template #header>
            <div class="table-card-header">
              <span class="card-title">最近调用日志</span>
              <n-button text size="small" @click="refreshLogs">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                刷新
              </n-button>
            </div>
          </template>

          <div class="table-scroll-container">
            <n-data-table
              remote
              size="small"
              :columns="columns"
              :data="tableState.data"
              :loading="tableState.loading"
              :pagination="pagination"
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange"
              :single-line="false"
              class="glass-table"
              :scroll-x="600"
            />
          </div>
        </n-card>
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
  gap: 24px;
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

.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0 0; font-size: 14px; color: #6b7280; }

.action-btn {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  border: 1px solid rgba(139, 92, 246, 0.2);
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

/* =================================
   组件样式
   ================================= */

/* 毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  transition: transform 0.3s ease;
  --n-color: transparent !important;
}
:deep(.n-card__content) { padding: 20px; }

/* 配额卡片 */
.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.icon-box {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.icon-box.purple { background: rgba(139, 92, 246, 0.15); color: #7c3aed; }
.card-title { font-weight: 700; color: #374151; font-size: 16px; }

.quota-body { display: flex; flex-direction: column; gap: 12px; }
.quota-text { display: flex; align-items: baseline; gap: 4px; }
.quota-text .current { font-size: 36px; font-weight: 800; color: #111827; line-height: 1; }
.quota-text .divider { font-size: 20px; color: #9ca3af; }
.quota-text .total { font-size: 20px; font-weight: 600; color: #6b7280; }

.progress-track {
  height: 8px; background: rgba(0,0,0,0.06); border-radius: 99px; overflow: hidden;
}
.progress-fill { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.quota-footer { font-size: 12px; color: #6b7280; }
.text-danger { color: #ef4444; }

/* 统计小方块 */
.stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.glass-stat-box {
  position: relative;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; position: relative; z-index: 2; }
.stat-num { font-size: 24px; font-weight: 700; color: #1f2937; position: relative; z-index: 2; line-height: 1.2; }
.stat-num.highlight { color: #7c3aed; }
.bg-icon {
  position: absolute; right: -5px; bottom: -5px;
  font-size: 60px; color: rgba(0,0,0,0.03); z-index: 1;
  transform: rotate(-15deg);
}

.glass-info-bar {
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 12px 16px; border-radius: 12px;
}
.glass-info-bar .label { font-size: 13px; color: #6b7280; }
.glass-info-bar .value { font-size: 13px; font-weight: 600; color: #4b5563; font-family: monospace; }

/* 表格与滚动容器 */
.table-card { min-height: 400px; display: flex; flex-direction: column; }
.table-card-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px; }

/* 🔥 表格防溢出容器 🔥 */
.table-scroll-container {
  width: 100%;
  overflow-x: auto; /* 允许内部横向滚动 */
  border-radius: 8px;
}

/* 表格样式修正 */
.glass-table {
  width: 100%;
  --n-td-color: transparent !important;
  --n-th-color: rgba(255, 255, 255, 0.3) !important;
  --n-border-color: rgba(0, 0, 0, 0.05) !important;
  --n-td-color-hover: rgba(139, 92, 246, 0.1) !important;
  --n-merged-td-color: transparent !important;
  --n-merged-th-color: rgba(255, 255, 255, 0.3) !important;
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
  background: #8b5cf6 !important;
  color: #fff !important;
  border: none !important;
}
</style>