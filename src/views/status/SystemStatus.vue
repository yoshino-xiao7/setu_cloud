<script setup lang="ts">
import {
  PulseOutline,
  ServerOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { UiBento, UiBentoTile, UiBoard, UiMetricRing } from '@/components/ui'
import { useSystemStatus } from '@/composables/useSystemStatus'

// 注册 ECharts 组件
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const {
  availabilityPercent,
  availabilityText,
  chartOption,
  currentStatus,
  lastUpdatedTime,
  latencyText,
  statusColor,
  StatusIcon,
  systemData,
  timeRangeEnd,
  timeRangeStart,
} = useSystemStatus()
</script>

<template>
  <UiBoard class="page-container ui-page">
    <div class="board-header-section ui-page-header">
      <h1 class="title ui-page-title">
        系统状态监控
      </h1>
      <p class="subtitle ui-page-subtitle">
        API 服务实时可用性与性能看板
      </p>
    </div>

    <UiBento><UiBentoTile title="当前状态" :value="currentStatus" :subtitle="`更新于：${lastUpdatedTime}`" :icon="StatusIcon" span="wide" tone="brand" :style="{ borderTop: `4px solid ${statusColor}` }" /></UiBento>

    <UiBento>
      <UiBentoTile title="服务可用性 (5min)" :value="availabilityText" :subtitle="`${timeRangeStart} — ${timeRangeEnd}`" span="wide">
        <UiMetricRing :value="availabilityText" :progress="availabilityPercent / 100" caption="服务可用性" />
      </UiBentoTile><UiBentoTile title="平均响应延迟" :value="latencyText" :icon="TimeOutline" /><UiBentoTile title="今日调用量" :value="`${systemData.callsToday} 次`" :icon="ServerOutline" />
    </UiBento>

    <div class="ui-card chart-card">
      <div class="chart-header">
        <n-icon color="#f586a9">
          <PulseOutline />
        </n-icon>
        <span>实时延迟波动 (Live Latency)</span>
      </div>
      <div class="chart-box">
        <VChart class="chart" :option="chartOption" autoresize />
      </div>
    </div>
  </UiBoard>
</template>

<style scoped>
/* 全局布局 */
.page-container {
  max-width: 1000px;
  min-height: 80vh;
  display: flex; flex-direction: column; gap: 32px;
}

/* 头部 */
.board-header-section {
  margin-bottom: 0;
  padding: 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}
.title { margin: 0; }
.subtitle { margin-top: 8px; }

/* 1. 主状态卡 */

/* 动画：心跳 */
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* 2. 指标网格 */

/* ✅ 第一个卡片（可用性）特殊处理 */

/* ✅ 暂无数据状态 */

/* ✅ 可用性状态条 */

/* ✅ 添加光晕效果 */

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 3. 图表卡片 */
.chart-card { padding: 24px; height: 400px; display: flex; flex-direction: column; }
.chart-header { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #4b5563; margin-bottom: 16px; }
.chart-box { flex: 1; min-height: 0; width: 100%; }
.chart { height: 100%; width: 100%; }

.board-header-section { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.ui-card, .header { background: var(--board-surface); color: var(--board-text); }
</style>
