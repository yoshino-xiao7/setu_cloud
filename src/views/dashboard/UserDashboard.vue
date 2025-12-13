<script setup lang="ts">
import { computed, onMounted, ref, h } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NDataTable, useMessage, type DataTableColumns, type PaginationProps } from 'naive-ui'
import http from '@/api/http'

const router = useRouter()
const message = useMessage()

// =======================
// 1. Key 使用相关状态 (保持不变)
// =======================
const keyLimit = ref(10)
const keyCount = ref(0)

const keyUsagePercent = computed(() => {
  if (keyLimit.value <= 0) return 0
  const raw = (keyCount.value / keyLimit.value) * 100
  return Math.round(Math.min(Math.max(raw, 0), 100))
})

const keyProgressColor = computed(() => {
  const used = keyCount.value
  if (used < 5) return '#8b5cf6'
  if (used < 8) return '#ec4899'
  return '#ef4444'
})

// =======================
// 2. 调用概览状态 (保持不变)
// =======================
interface UsageOverview {
  totalCalls: number
  todayCalls: number
  lastCalledAt: string | null
}
const usageOverview = ref<UsageOverview>({
  totalCalls: 0,
  todayCalls: 0,
  lastCalledAt: null
})

// =======================
// 3. 调用明细表格 (核心修复部分)
// =======================
interface UsageLogItem {
  id: number
  timestamp: string
  endpoint: string
  status: number
  ip: string
}

const logColumns: DataTableColumns<UsageLogItem> = [
  { title: '时间', key: 'timestamp', width: 180 },
  { title: '请求路径', key: 'endpoint', ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        'span',
        { style: row.status >= 200 && row.status < 300 ? 'color: #10b981' : 'color: #ef4444' },
        row.status
      )
    }
  },
  { title: '来源 IP', key: 'ip', width: 140 }
]

const usageLogs = ref<UsageLogItem[]>([])
const loadingLogs = ref(false)

// 修复：分页对象配置
const pagination = ref<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  prefix: (info) => `共 ${info.itemCount ?? 0} 条`
})


// =======================
// 4. 接口请求 (核心修复部分)
// =======================
async function fetchKeyStats() {
  try {
    const res = await http.get('/api-key/list')
    // 兼容多种返回结构
    const data = res.data
    const list = Array.isArray(data) ? data : (data?.data || [])
    keyCount.value = list.length
  } catch (e) {
    console.error('API Key List Error:', e)
  }
}

async function fetchUsageOverview() {
  try {
    const res = await http.get('/usage/overview')
    const data = res.data?.data || res.data || {}
    usageOverview.value = {
      totalCalls: data.totalCalls ?? 0,
      todayCalls: data.todayCalls ?? 0,
      lastCalledAt: data.lastCalledAt || null
    }
  } catch (e) {
    console.error('Overview Error:', e)
  }
}

// 修复：增加了页码参数传递，修复了数据解包逻辑
async function fetchUsageLogs() {
  loadingLogs.value = true
  try {
    const res = await http.get('/usage/logs', {
      params: {
        page: pagination.value.page,       // 传递当前页码
        limit: pagination.value.pageSize   // 传递每页条数
      }
    })

    // Debug: 在控制台查看真实数据结构，如果还有问题请截图控制台
    console.log('Logs Response:', res)

    // 1. 尝试获取列表
    const rawData = res.data
    let list: UsageLogItem[] = []
    let total = 0

    if (Array.isArray(rawData)) {
      // 情况A: 直接返回数组 [{}, {}]
      list = rawData
      total = rawData.length
    } else if (rawData && Array.isArray(rawData.data)) {
      // 情况B: 标准结构 { code: 200, data: [...], total: 100 }
      list = rawData.data
      total = rawData.total || rawData.count || 0
    } else if (rawData && Array.isArray(rawData.list)) {
      // 情况C: 常见分页结构 { list: [...], total: 100 }
      list = rawData.list
      total = rawData.total || 0
    }

    usageLogs.value = list
    pagination.value.itemCount = total // 更新分页总数

  } catch (e) {
    console.error('Logs Error:', e)
    message.error('获取日志失败')
  } finally {
    loadingLogs.value = false
  }
}

// 修复：处理翻页事件
function handlePageChange(page: number) {
  pagination.value.page = page
  fetchUsageLogs()
}

// 修复：处理每页条数改变
function handlePageSizeChange(pageSize: number) {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1 // 重置回第一页
  fetchUsageLogs()
}

function reloadUsageLogs() {
  pagination.value.page = 1
  fetchUsageLogs()
}

function goManageKeys() {
  router.push('/dashboard/api-keys')
}

onMounted(() => {
  fetchKeyStats()
  fetchUsageOverview()
  fetchUsageLogs()
})
</script>

<template>
  <div class="dashboard-page">

    <div class="dashboard-header">
      <div class="title-block">
        <h1 class="title">仪表盘</h1>
        <p class="subtitle">欢迎回来，这里是您的 API 使用概览</p>
      </div>
      <n-button
        type="primary"
        round
        size="medium"
        color="#8b5cf6"
        @click="goManageKeys"
        class="glass-btn"
      >
        管理 API Key
      </n-button>
    </div>

    <div class="dashboard-grid">

      <div class="left-col">

        <n-card :bordered="false" class="glass-card key-card">
          <div class="card-header">
            <div class="header-icon purple">
              <span class="icon-key">🔑</span>
            </div>
            <span class="card-title">API Key 配额</span>
          </div>

          <div class="card-body">
            <div class="progress-info">
              <span class="big-num">{{ keyCount }}</span>
              <span class="slash">/</span>
              <span class="limit-num">{{ keyLimit }}</span>
            </div>

            <div class="custom-progress">
              <div
                class="progress-bar"
                :style="{ width: keyUsagePercent + '%', background: keyProgressColor }"
              ></div>
            </div>

            <p class="progress-tip" v-if="keyCount < keyLimit">
              还可以创建 {{ keyLimit - keyCount }} 个 Key
            </p>
            <p class="progress-tip warning" v-else>
              配额已满
            </p>
          </div>
        </n-card>

        <div class="stats-grid">
          <div class="glass-stat-box">
            <div class="stat-label">总调用次数</div>
            <div class="stat-value">{{ usageOverview.totalCalls }}</div>
            <div class="stat-decoration bg-blue"></div>
          </div>
          <div class="glass-stat-box">
            <div class="stat-label">今日调用</div>
            <div class="stat-value highlight">{{ usageOverview.todayCalls }}</div>
            <div class="stat-decoration bg-purple"></div>
          </div>
        </div>

        <div class="glass-stat-box wide">
          <div class="stat-row">
            <span class="stat-label">最后活跃时间</span>
            <span class="stat-value small">
              {{ usageOverview.lastCalledAt || '暂无记录' }}
            </span>
          </div>
        </div>
      </div>

      <div class="right-col">
        <n-card :bordered="false" class="glass-card table-card">
          <template #header>
            <div class="table-header">
              <span class="card-title">最近调用日志</span>
              <n-button text size="tiny" class="refresh-btn" @click="reloadUsageLogs">
                刷新
              </n-button>
            </div>
          </template>

          <n-data-table
            remote
            :columns="logColumns"
            :data="usageLogs"
            :loading="loadingLogs"
            :pagination="pagination"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
            size="small"
            class="glass-table"
          />
        </n-card>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* =========================================
   1. 布局与基础样式
   ========================================= */
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 4px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #6b7280;
}

/* 按钮样式 */
.glass-btn {
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
  font-weight: 600;
  transition: transform 0.2s;
}
.glass-btn:active { transform: scale(0.98); }

/* 主网格布局 */
.dashboard-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-col {
  display: flex;
  flex-direction: column;
}

/* =========================================
   2. 核心：毛玻璃卡片 (Card)
   ========================================= */
.glass-card {
  /* ⚠️ 必须加 !important 覆盖 Naive 默认白底 */
  background-color: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  transition: transform 0.3s ease;
  /* 这一行很重要：Naive Card 默认背景色变量置空 */
  --n-color: transparent !important;
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

/* 强制穿透修改 Card 内部 */
:deep(.n-card) { background-color: transparent !important; }
:deep(.n-card__content) { padding: 20px; background-color: transparent !important; }

/* =========================================
   3. ⚡️⚡️ 重点：强制表格透明化 ⚡️⚡️
   ========================================= */

/* 方法：直接在根节点重写 CSS 变量，这是 Naive UI 最底层的控制方式 */
.glass-table {
  /* 单元格背景 */
  --n-td-color: transparent !important;
  /* 表头背景（稍微带点白，区分层次） */
  --n-th-color: rgba(255, 255, 255, 0.3) !important;
  /* 边框颜色 */
  --n-border-color: rgba(0, 0, 0, 0.05) !important;
  /* 悬浮颜色 */
  --n-td-color-hover: rgba(139, 92, 246, 0.1) !important;
  /* 底部背景 */
  --n-merged-td-color: transparent !important;
  --n-merged-th-color: rgba(255, 255, 255, 0.3) !important;
}

/* 即使变量失效，我们也用样式强行覆盖 */
.glass-table :deep(.n-data-table) {
  background-color: transparent !important;
}

.glass-table :deep(.n-data-table-th) {
  background-color: var(--n-th-color) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
  font-weight: 600;
  color: #4b5563;
}

.glass-table :deep(.n-data-table-td) {
  background-color: transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #374151;
}

/* 去除外边框 */
.glass-table :deep(.n-data-table-wrapper) {
  border: none !important;
  border-radius: 0 !important;
}

/* 修复分页器白色背景问题 */
.glass-table :deep(.n-pagination .n-pagination-item) {
  background-color: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
}
.glass-table :deep(.n-pagination .n-pagination-item--active) {
  background-color: #8b5cf6 !important;
  color: #fff !important;
  border: none !important;
}
.glass-table :deep(.n-pagination .n-pagination-item:hover) {
  color: #8b5cf6 !important;
  border-color: #8b5cf6 !important;
}

/* =========================================
   4. 其它组件样式
   ========================================= */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.header-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.header-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #374151;
}

.progress-info {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}
.big-num { font-size: 32px; font-weight: 800; color: #111827; line-height: 1; }
.slash { font-size: 16px; color: #9ca3af; margin: 0 4px; }
.limit-num { font-size: 20px; font-weight: 600; color: #6b7280; }

.custom-progress {
  height: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 8px;
}
.progress-bar {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
  background-image: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, transparent 100%);
}

.progress-tip { font-size: 12px; color: #6b7280; }
.progress-tip.warning { color: #ef4444; font-weight: 500; }

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.glass-stat-box {
  position: relative;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.glass-stat-box.wide {
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
}

.stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; z-index: 1; }
.stat-value { font-size: 20px; font-weight: 700; color: #1f2937; z-index: 1; }
.stat-value.highlight { color: #8b5cf6; }
.stat-value.small { font-size: 14px; color: #4b5563; font-weight: 500; }

.stat-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.stat-decoration {
  position: absolute;
  top: -10px; right: -10px;
  width: 60px; height: 60px;
  border-radius: 50%;
  filter: blur(25px);
  opacity: 0.3;
}
.bg-blue { background: #3b82f6; }
.bg-purple { background: #d946ef; }

.table-header {
  display: flex; justify-content: space-between; align-items: center;
}
.refresh-btn { color: #6b7280; }
.refresh-btn:hover { color: #8b5cf6; }
</style>