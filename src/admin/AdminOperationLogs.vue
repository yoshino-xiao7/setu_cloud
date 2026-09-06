<script setup lang="ts">
import {
  RefreshOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpin,
} from 'naive-ui'
import { UiBoard, UiFilterBar, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useAdminOperationLogs } from '@/composables/useAdminOperationLogs'
import { formatDate } from '@/utils/dateFormat'

const {
  loadError,
  copyText,
  openDetail,
  detail,
  detailLoading,
  detailVisible,
  eventTypeOptions,
  filters,
  formatJson,
  handleSearch,
  list,
  loadLogs,
  loading,
  page,
  pageCount,
  resetFilters,
  statusOptions,
} = useAdminOperationLogs()
</script>

<template>
  <UiBoard class="operation-log-page">
    <div class="board-page-header">
      <div>
        <h2>操作日志</h2>
        <p>通过 traceId、用户、事件和目标对象定位后台与投稿链路问题</p>
      </div>
      <NButton :loading="loading" @click="loadLogs">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard :bordered="false" class="filter-card">
      <UiFilterBar v-model="filters.status" :options="statusOptions.map(option => ({ title: option.label, value: option.value }))" label="日志状态" />
      <div class="filter-grid">
        <NInput v-model:value="filters.traceId" placeholder="traceId" clearable @keyup.enter="handleSearch" />
        <NInputNumber v-model:value="filters.userId" placeholder="用户 ID" :precision="0" :min="1" :show-button="false" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.userEmail" placeholder="用户邮箱" clearable @keyup.enter="handleSearch" />
        <NSelect v-model:value="filters.eventType" :options="eventTypeOptions" filterable />

        <NInput v-model:value="filters.code" placeholder="业务 code" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.targetType" placeholder="目标类型" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.targetId" placeholder="目标 ID" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.startTime" placeholder="开始时间 2026-06-21 00:00:00" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.endTime" placeholder="结束时间 2026-06-21 23:59:59" clearable @keyup.enter="handleSearch" />
      </div>
      <div class="filter-actions">
        <NButton type="primary" :loading="loading" @click="handleSearch">
          <template #icon>
            <NIcon><SearchOutline /></NIcon>
          </template>
          查询
        </NButton>
        <NButton :disabled="loading" @click="resetFilters">
          重置
        </NButton>
      </div>
    </NCard>

    <UiRecordBoard :error="loadError" :items="list" :loading="loading" empty="暂无操作日志" :item-key="row => row.id">
      <template #error>
        {{ loadError }}<NButton @click="loadLogs()">
          重试
        </NButton>
      </template>
      <template #default="{ item: row }">
        <UiRecordCard :headline="row.eventType" :supporting="formatDate(row.createdAt)" :status="{ text: row.status, tone: row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning' }" :fields="[{ name: '用户', value: row.userEmail || (row.userId ? `用户 #${row.userId}` : '-') }, { name: '目标', value: row.targetType || row.targetId ? `${row.targetType || '-'} / ${row.targetId || '-'}` : '-' }, { name: 'Trace', value: row.traceId || '-' }, { name: '耗时', value: row.durationMs == null ? '-' : `${row.durationMs}ms` }]" density="compact" :on-activate="() => openDetail(row)">
          <template #actions>
            <NButton v-if="row.traceId" @click="copyText(row.traceId)">
              复制 Trace
            </NButton><NButton @click="openDetail(row)">
              详情
            </NButton>
          </template>
        </UiRecordCard>
      </template>
      <template #footer>
        <NPagination v-model:page="page" :page-count="pageCount" :page-slot="3" @update:page="loadLogs" />
      </template>
    </UiRecordBoard>

    <NModal v-model:show="detailVisible">
      <NCard class="detail-card" :bordered="false" title="日志详情">
        <NSpin :show="detailLoading">
          <div v-if="detail" class="detail-grid">
            <div><span>日志 ID</span><strong>{{ detail.id }}</strong></div>
            <div><span>事件</span><strong>{{ detail.eventType }}</strong></div>
            <div><span>状态</span><strong>{{ detail.status }}</strong></div>
            <div><span>用户</span><strong>{{ detail.userEmail || detail.userId || '-' }}</strong></div>
            <div><span>目标</span><strong>{{ detail.targetType || '-' }} / {{ detail.targetId || '-' }}</strong></div>
            <div><span>路径</span><strong>{{ detail.method || '-' }} {{ detail.path || '-' }}</strong></div>
            <div><span>Trace ID</span><strong>{{ detail.traceId || '-' }}</strong></div>
            <div><span>Request ID</span><strong>{{ detail.requestId || '-' }}</strong></div>
          </div>
          <pre v-if="detail" class="json-block">{{ formatJson({ requestBody: detail.requestBody, responseBody: detail.responseBody, extra: detail.extra, message: detail.message }) }}</pre>
        </NSpin>
      </NCard>
    </NModal>
  </UiBoard>
</template>

<style scoped>
.board-panel { padding: 16px; border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); background: var(--board-surface); color: var(--board-text); }
.page-container, .admin-page, .operation-log-page { width: 100%; min-width: 0; padding-bottom: 80px; }
.board-page-header, .board-header-section, .section-header, .list-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.title, .page-title, .board-page-header h2, .section-title { margin: 0; color: var(--board-text); }
.subtitle, .board-page-header p, .section-subtitle { margin: 4px 0 0; color: var(--board-text-muted); }
.toolbar, .filter-card, .search-bar, .temp-block-wrapper { padding: 16px; border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); background: var(--board-surface); }
.toolbar, .header-actions, .actions-box, .filter-actions, .bulk-actions, .bulk-select, .token-buttons, .token-check { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.search-box { flex: 1; min-width: min(180px, 100%); }
.header-actions, .probe-input { min-width: 0; max-width: 100%; }
.probe-input { width: 180px; }
.filter-grid, .search-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.filter-actions { margin-top: 12px; }
:deep(.n-pagination) { flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 100%; }
:deep(.n-button) { min-height: 44px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
 .detail-card { width: min(920px, 92vw); max-height: 86vh; overflow: auto; } .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 12px; } .detail-grid div { display: grid; gap: 4px; min-width: 0; } .detail-grid strong { overflow-wrap: anywhere; } .json-block { white-space: pre-wrap; overflow-wrap: anywhere; max-width: 100%; }
</style>
