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
  <div class="page-container ui-page">
    <div class="header-section ui-page-header">
      <h1 class="title ui-page-title">
        系统状态监控
      </h1>
      <p class="subtitle ui-page-subtitle">
        API 服务实时可用性与性能看板
      </p>
    </div>

    <div class="ui-card status-hero" :style="{ borderTop: `4px solid ${statusColor}` }">
      <div class="hero-content">
        <div class="status-indicator">
          <n-icon size="48" :color="statusColor" class="pulse-icon">
            <component :is="StatusIcon" />
          </n-icon>
          <div class="status-text">
            <div class="label">
              当前状态
            </div>
            <div class="value" :style="{ color: statusColor }">
              {{ currentStatus }}
            </div>
          </div>
        </div>
        <div class="last-check">
          更新于: {{ lastUpdatedTime }}
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="ui-card ui-card-hover metric-card">
        <div class="icon-box green">
          <n-icon><CheckmarkCircle /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">
            服务可用性 (5min)
          </div>
          <div class="value" :class="{ 'no-data': !hasRecentData }">
            {{ availabilityText }}<span v-if="hasRecentData" class="unit" />
          </div>
          <!-- ✅ 可视化状态条 -->
          <div class="availability-bar">
            <div class="bar-background">
              <div
                class="bar-fill"
                :style="{
                  width: hasRecentData ? `${availabilityPercent}%` : '0%',
                  background: hasRecentData ? 'linear-gradient(90deg, #10b981, #34d399)' : '#e5e7eb',
                }"
              />
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
          <div class="label">
            平均响应延迟
          </div>
          <div class="value" :class="{ 'no-data': !hasRecentData || systemData.avgLatencyMs === 0 }">
            {{ latencyText }}<span v-if="hasRecentData && systemData.avgLatencyMs > 0" class="unit" />
          </div>
        </div>
      </div>

      <div class="ui-card ui-card-hover metric-card">
        <div class="icon-box blue">
          <n-icon><ServerOutline /></n-icon>
        </div>
        <div class="metric-info">
          <div class="label">
            今日调用量
          </div>
          <div class="value">
            {{ systemData.callsToday }}<span class="unit">次</span>
          </div>
        </div>
      </div>
    </div>

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
.purple { background: rgba(245, 134, 169, 0.1); color: var(--ui-primary); }
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
