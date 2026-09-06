<script setup lang="ts">
import { HardwareChipOutline, KeyOutline, SpeedometerOutline, TimeOutline } from '@vicons/ionicons5'
import { NAlert, NButton, NPagination, NSkeleton } from 'naive-ui'
import { UiBento, UiBentoTile, UiBoard, UiMetricRing, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useUserDashboard } from '@/composables/useUserDashboard'

const { formatDate, goToApiKeys, handlePageChange, handlePageSizeChange, keyError, keyState, keyUsagePercent, logsError, overview, overviewError, pagination, refreshLogs, tableState, fetchOverview, fetchKeyStats, fetchLogs } = useUserDashboard()
</script>

<template>
  <UiBoard class="dashboard-page ui-page">
    <header class="ui-page-header dashboard-header">
      <div>
        <h1 class="ui-page-title">
          仪表盘
        </h1><p class="ui-page-subtitle">
          实时监控您的 API 使用情况与系统状态
        </p>
      </div>
      <NButton type="primary" @click="goToApiKeys">
        管理 Key
      </NButton>
    </header>
    <UiBento>
      <UiBentoTile title="今日调用" :value="overview.loading ? undefined : String(overview.todayCalls)" :icon="TimeOutline" tone="brand">
        <NSkeleton v-if="overview.loading" text />
      </UiBentoTile>
      <UiBentoTile title="历史总量" :value="overview.loading ? undefined : String(overview.totalCalls)" :icon="HardwareChipOutline">
        <NSkeleton v-if="overview.loading" text />
      </UiBentoTile>
      <UiBentoTile title="Key 使用" :value="keyState.loading ? undefined : `${keyState.count}/${keyState.limit}`" :icon="KeyOutline" :action="goToApiKeys">
        <NSkeleton v-if="keyState.loading" text />
        <UiMetricRing v-else :value="`${keyUsagePercent}%`" :progress="keyUsagePercent / 100" caption="配额使用率" />
        <p>{{ keyState.count < keyState.limit ? `剩余可创建 ${keyState.limit - keyState.count} 个 Key` : '配额已耗尽' }}</p>
      </UiBentoTile>
      <UiBentoTile title="上次活跃" :value="overview.loading ? undefined : formatDate(overview.lastCalledAt)" :icon="SpeedometerOutline" tone="muted">
        <NSkeleton v-if="overview.loading" text />
      </UiBentoTile>
    </UiBento>
    <NAlert v-if="overviewError || keyError" type="warning" :show-icon="false">
      {{ overviewError || keyError }}<NButton text type="primary" @click="fetchOverview(); fetchKeyStats()">
        重试
      </NButton>
    </NAlert>
    <section class="board__section">
      <header class="dashboard-header">
        <h2>最近调用日志</h2><NButton :loading="tableState.loading" @click="refreshLogs">
          刷新
        </NButton>
      </header>
      <UiRecordBoard :items="tableState.data" :loading="tableState.loading" :error="logsError" empty="暂无调用日志">
        <template #error>
          {{ logsError }}<NButton text type="primary" @click="fetchLogs">
            重试
          </NButton>
        </template>
        <template #default="{ item }">
          <UiRecordCard :headline="item.endpoint" :supporting="formatDate(item.timestamp)" :status="{ text: String(item.status), tone: item.status >= 200 && item.status < 300 ? 'success' : 'danger' }" :fields="[{ name: 'IP', value: item.ip || '-', numeric: false }]" />
        </template>
        <template #footer>
          <NPagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-sizes="pagination.pageSizes" show-size-picker :page-slot="3" @update:page="handlePageChange" @update:page-size="handlePageSizeChange">
            <template #prefix>
              共 {{ pagination.itemCount }} 条
            </template>
          </NPagination>
        </template>
      </UiRecordBoard>
    </section>
  </UiBoard>
</template>

<style scoped>
.ui-page-title { color: var(--board-text); }
.ui-page-subtitle { color: var(--board-text-muted); }
.dashboard-page { padding-bottom: 60px; }
.dashboard-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
h2, p { margin: 0; }
</style>
