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
import * as echarts from 'echarts/core'

// 注册 ECharts 组件
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const message = useMessage()

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
let timer: any = null

// -------------------------------------
// 2. 核心逻辑
// -------------------------------------

// 获取状态颜色
const statusColor = computed(() => {
  const s = systemData.value.status
  if (s === '正常') return '#10b981' // Green
  if (s === '降级') return '#f59e0b' // Orange
  if (s === '故障') return '#ef4444' // Red
  return '#9ca3af' // Gray
})

// 获取状态图标
const StatusIcon = computed(() => {
  const s = systemData.value.status
  if (s === '正常') return CheckmarkCircle
  if (s === '降级') return WarningOutline
  if (s === '故障') return CloseCircleOutline
  return HelpCircleOutline
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
    // ✅ 1. 自动判断环境
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    // ✅ 2. 动态选择接口地址
    const baseUrl = isDev
      ? 'http://localhost:9898'
      : 'https://api.yukiryou.icu'

    // ✅ 3. 发起请求
    const res = await fetch(`${baseUrl}/status`)
    const json = await res.json()

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

onMounted(() => {
  initChartData()
  fetchStatus() // 立即调用一次
  timer = setInterval(fetchStatus, 5000) // 每5秒刷新
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
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
    axisLabel: { color: '#9ca3af', fontSize: 11 }
  },
  series: [
    {
      name: '响应延迟',
      type: 'line',
      data: chartData.value.map(i => i.value),
      smooth: true, // 圆滑曲线
      showSymbol: false,
      itemStyle: { color: '#8b5cf6' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
          { offset: 1, color: 'rgba(139, 92, 246, 0)' }
        ])
      },
      lineStyle: { width: 3, shadowColor: 'rgba(139, 92, 246, 0.3)', shadowBlur: 10 }
    }
  ]
}))
</script>

<template>
  <div class="page-container">

    <div class="header-section">
      <h2 class="title">系统状态监控</h2>
      <p class="subtitle">API 服务实时可用性与性能看板</p>
    </div>

    <div class="glass-card status-hero" :style="{ borderTop: `4px solid ${statusColor}` }">
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
      <div class="glass-card metric-card">
        <div class="icon-box green">
          <n-icon><CheckmarkCircle /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">服务可用性 (5min)</div>
          <div class="value">
            {{ (systemData.availability * 100).toFixed(1) }}<span class="unit">%</span>
          </div>
        </div>
      </div>

      <div class="glass-card metric-card">
        <div class="icon-box purple">
          <n-icon><TimeOutline /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">平均响应延迟</div>
          <div class="value">
            {{ Math.round(systemData.avgLatencyMs) }}<span class="unit">ms</span>
          </div>
        </div>
      </div>

      <div class="glass-card metric-card">
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

    <div class="glass-card chart-card">
      <div class="chart-header">
        <n-icon color="#8b5cf6"><PulseOutline /></n-icon>
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
  padding: 40px 20px 80px;
  max-width: 1000px;
  margin: 0 auto;
  min-height: 80vh;
  display: flex; flex-direction: column; gap: 32px;
}

/* 头部 */
.header-section { text-align: center; margin-bottom: 10px; }
.title { font-size: 32px; font-weight: 800; color: #1f2937; margin: 0; }
.subtitle { color: #6b7280; margin-top: 8px; font-size: 15px; }

/* 玻璃卡片通用 */
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}

/* 1. 主状态卡 */
.status-hero {
  padding: 32px;
  display: flex; align-items: center; justify-content: center;
}
.hero-content {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; max-width: 600px;
}
.status-indicator { display: flex; align-items: center; gap: 20px; }
.status-text .label { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
.status-text .value { font-size: 32px; font-weight: 800; line-height: 1; }
.last-check { font-size: 12px; color: #9ca3af; font-family: monospace; }

/* 动画：心跳 */
.pulse-icon { animation: pulse 2s infinite; }
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* 2. 指标网格 */
.metrics-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}
@media (max-width: 768px) { .metrics-grid { grid-template-columns: 1fr; } }

.metric-card {
  padding: 24px;
  display: flex; align-items: center; gap: 16px;
  transition: transform 0.2s;
}
.metric-card:hover { transform: translateY(-4px); }

.icon-box {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}
.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.metric-info .label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.metric-info .value { font-size: 24px; font-weight: 700; color: #1f2937; }
.metric-info .unit { font-size: 14px; color: #9ca3af; margin-left: 4px; font-weight: normal; }

/* 3. 图表卡片 */
.chart-card { padding: 24px; height: 400px; display: flex; flex-direction: column; }
.chart-header { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #4b5563; margin-bottom: 16px; }
.chart-box { flex: 1; min-height: 0; width: 100%; }
.chart { height: 100%; width: 100%; }
</style>