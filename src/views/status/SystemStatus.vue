<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useMessage } from 'naive-ui'
import {
  ServerOutline,
  PulseOutline,
  TimeOutline,
  CheckmarkCircle,
  WarningOutline,
  CloseCircleOutline,
  HelpCircleOutline
} from '@vicons/ionicons5'
// 引入 ECharts
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { graphic } from 'echarts/core'
import http from '@/api/http'
import { unwrapApiData } from '@/api/response'
import { useSeo } from '@/composables/useSeo'

// 注册 ECharts 组件
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const message = useMessage()

useSeo({
  title: '系统状态',
  description: '查看雪涼云 API 服务的实时运行状态和性能指标。'
})

// -------------------------------------
// 1. 数据定义
// -------------------------------------
interface StatusData {
  status: string
  availability: number
  avgLatencyMs: number
  callsToday: number
}

const loading = ref(true)
const systemData = ref<StatusData>({
  status: '检查中...',
  availability: 1.0,
  avgLatencyMs: 0,
  callsToday: 0
})

// 图表数据 (模拟时间序列)
const chartData = ref<{ time: string; value: number }[]>([])
let timer: number | null = null

// -------------------------------------
// 2. 核心逻辑
// -------------------------------------

// 获取状态颜色
const statusColor = computed(() => {
  const s = systemData.value.status
  if (s === '正常') return '#10b981' // Green
  if (s === '降级') return '#f59e0b' // Orange
  if (s === '故障') return '#ef4444' // Red
  return '#6b7280' // Gray
})

// 获取状态图标
const StatusIcon = computed(() => {
  const s = systemData.value.status
  if (s === '正常') return CheckmarkCircle
  if (s === '降级') return WarningOutline
  if (s === '故障') return CloseCircleOutline
  return HelpCircleOutline
})

// ✅ 判断是否有数据
const hasRecentData = computed(() => {
  // 如果可用性为 0 且今日调用量为 0，说明 5 分钟内没有调用
  return systemData.value.availability > 0 || systemData.value.callsToday > 0
})

// ✅ 可用性显示文本
const availabilityText = computed(() => {
  if (!hasRecentData.value) {
    return '暂无数据'
  }
  return `${(systemData.value.availability * 100).toFixed(1)}%`
})

// ✅ 延迟显示文本
const latencyText = computed(() => {
  if (!hasRecentData.value || systemData.value.avgLatencyMs === 0) {
    return '无调用'
  }
  return `${Math.round(systemData.value.avgLatencyMs)}ms`
})

// ✅ 状态条时间范围（5分钟前）
const timeRangeStart = computed(() => {
  const now = new Date()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
  return fiveMinAgo.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
})

const timeRangeEnd = computed(() => {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
})

// 模拟生成初始图表数据 (让图表一开始不空)
const initChartData = () => {
  const now = new Date()
  for (let i = 0; i < 20; i++) {
    chartData.value.push({
      time: new Date(now.getTime() - (20 - i) * 5000).toLocaleTimeString(),
      value: 0 // 初始占位
    })
  }
}

// 轮询接口
const fetchStatus = async () => {
  try {
    const res = await http.get<StatusData>('/status')
    const json = unwrapApiData<StatusData>(res)

    // 更新核心数据
    systemData.value = json

    // 更新图表数据 (推入新数据，移除旧数据)
    const nowStr = new Date().toLocaleTimeString()
    chartData.value.push({
      time: nowStr,
      value: json.avgLatencyMs
    })
    if (chartData.value.length > 20) {
      chartData.value.shift()
    }

    loading.value = false
  } catch (e) {
    console.error(e)
    // 只有第一次失败才弹窗，避免轮询一直弹窗
    if (loading.value) message.error('状态监控服务连接失败')
  }
}

const stopPolling = () => {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

const startPolling = () => {
  if (timer || document.hidden) return
  timer = window.setInterval(fetchStatus, 5000)
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopPolling()
    return
  }

  fetchStatus()
  startPolling()
}

onMounted(() => {
  initChartData()
  fetchStatus() // 立即调用一次
  startPolling()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopPolling()
})

// -------------------------------------
// 3. ECharts 配置 (Aurora 风格)
// -------------------------------------
const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  grid: { top: 30, right: 20, bottom: 20, left: 50, containLabel: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'transparent',
    textStyle: { color: '#333' }
  },
  xAxis: {
    type: 'category',
    data: chartData.value.map(i => i.time),
    boundaryGap: false,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false } // 隐藏时间轴文字让看起来更简洁
  },
  yAxis: {
    type: 'value',
    splitLine: { show: true, lineStyle: { type: 'dashed', color: 'rgba(0,0,0,0.05)' } },
    axisLabel: { color: '#6b7280', fontSize: 11 }
  },
  series: [
    {
      name: '响应延迟',
      type: 'line',
      data: chartData.value.map(i => i.value),
      smooth: true, // 圆滑曲线
      showSymbol: false,
      itemStyle: { color: '#f586a9' },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(245, 134, 169, 0.4)' },
          { offset: 1, color: 'rgba(245, 134, 169, 0)' }
        ])
      },
      lineStyle: { width: 3, shadowColor: 'rgba(245, 134, 169, 0.3)', shadowBlur: 10 }
    }
  ]
}))
</script>

<template>
  <div class="page-container ui-page">

    <div class="header-section ui-page-header">
      <h1 class="title ui-page-title">系统状态监控</h1>
      <p class="subtitle ui-page-subtitle">API 服务实时可用性与性能看板</p>
    </div>

    <div class="ui-card status-hero" :style="{ borderTop: `4px solid ${statusColor}` }">
      <div class="hero-content">
        <div class="status-indicator">
          <n-icon size="48" :color="statusColor" class="pulse-icon">
            <component :is="StatusIcon" />
          </n-icon>
          <div class="status-text">
            <div class="label">当前状态</div>
            <div class="value" :style="{ color: statusColor }">{{ systemData.status }}</div>
          </div>
        </div>
        <div class="last-check">
          更新于: {{ new Date().toLocaleTimeString() }}
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="ui-card ui-card-hover metric-card">
        <div class="icon-box green">
          <n-icon><CheckmarkCircle /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">服务可用性 (5min)</div>
          <div class="value" :class="{ 'no-data': !hasRecentData }">
            {{ availabilityText }}<span v-if="hasRecentData" class="unit"></span>
          </div>
          <!-- ✅ 可视化状态条 -->
          <div class="availability-bar">
            <div class="bar-background">
              <div 
                class="bar-fill" 
                :style="{ 
                  width: hasRecentData ? (systemData.availability * 100) + '%' : '0%',
                  background: hasRecentData ? 'linear-gradient(90deg, #10b981, #34d399)' : '#e5e7eb'
                }"
              ></div>
            </div>
            <div class="bar-labels">
              <span class="bar-label-left">{{ timeRangeStart }}</span>
              <span class="bar-label-right">{{ timeRangeEnd }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ui-card ui-card-hover metric-card">
        <div class="icon-box purple">
          <n-icon><TimeOutline /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">平均响应延迟</div>
          <div class="value" :class="{ 'no-data': !hasRecentData || systemData.avgLatencyMs === 0 }">
            {{ latencyText }}<span v-if="hasRecentData && systemData.avgLatencyMs > 0" class="unit"></span>
          </div>
        </div>
      </div>

      <div class="ui-card ui-card-hover metric-card">
        <div class="icon-box blue">
          <n-icon><ServerOutline /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">今日调用量</div>
          <div class="value">
            {{ systemData.callsToday }}<span class="unit">次</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ui-card chart-card">
      <div class="chart-header">
        <n-icon color="#f586a9"><PulseOutline /></n-icon>
        <span>实时延迟波动 (Live Latency)</span>
      </div>
      <div class="chart-box">
        <v-chart class="chart" :option="chartOption" autoresize />
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 全局布局 */
.page-container {
  max-width: 1000px;
  min-height: 80vh;
  display: flex; flex-direction: column; gap: 32px;
}

/* 头部 */
.header-section {
  margin-bottom: 0;
  padding: 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}
.title { margin: 0; }
.subtitle { margin-top: 8px; }

/* 1. 主状态卡 */
.status-hero {
  padding: 32px;
  display: flex; align-items: center; justify-content: center;
  background: #fff;
}
.hero-content {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; max-width: 600px;
}
.status-indicator { display: flex; align-items: center; gap: 20px; }
.status-text .label { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
.status-text .value { font-size: 32px; font-weight: 800; line-height: 1; }
.last-check { font-size: 12px; color: #6b7280; font-family: monospace; }

/* 动画：心跳 */
.pulse-icon { animation: pulse 2s infinite; }
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* 2. 指标网格 */
.metrics-grid {
  display: grid; 
  grid-template-columns: 1.5fr 1fr 1fr; 
  gap: 24px;
}
@media (max-width: 768px) { .metrics-grid { grid-template-columns: 1fr; } }

.metric-card {
  padding: 24px;
  display: flex; 
  align-items: flex-start; 
  gap: 16px;
}
.metric-card:hover { transform: translateY(-4px); }

/* ✅ 第一个卡片（可用性）特殊处理 */
.metric-card:first-child {
  flex-direction: column;
}

.metric-card:first-child .icon-box {
  align-self: flex-start;
}

.metric-card:first-child .metric-info {
  width: 100%;
}

.icon-box {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}
.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.purple { background: rgba(245, 134, 169, 0.1); color: #f586a9; }
.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.metric-info .label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.metric-info .value { font-size: 24px; font-weight: 700; color: var(--ui-text); }
.metric-info .unit { font-size: 14px; color: #6b7280; margin-left: 4px; font-weight: normal; }

/* ✅ 暂无数据状态 */
.metric-info .value.no-data {
  color: #6b7280;
  font-size: 16px;
  font-weight: 600;
  font-style: italic;
}

/* ✅ 可用性状态条 */
.availability-bar {
  margin-top: 16px;
  width: 100%;
}

.bar-background {
  width: 100%;
  height: 10px;
  background: linear-gradient(90deg, #f3f4f6, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
  position: relative;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

/* ✅ 添加光晕效果 */
.bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.bar-label-left,
.bar-label-right {
  font-family: 'Courier New', monospace;
  background: rgba(156, 163, 175, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

/* 3. 图表卡片 */
.chart-card { padding: 24px; height: 400px; display: flex; flex-direction: column; }
.chart-header { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #4b5563; margin-bottom: 16px; }
.chart-box { flex: 1; min-height: 0; width: 100%; }
.chart { height: 100%; width: 100%; }
</style>
