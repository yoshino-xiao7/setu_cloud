<script setup lang="ts">
import {
  AlertCircleOutline,
  BanOutline,
  GlobeOutline,
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NBadge,
  NButton,
  NCheckbox,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSpin,
} from 'naive-ui'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useAdminIpBlacklist } from '@/composables/useAdminIpBlacklist'
import { formatDate } from '@/utils/dateFormat'

const {
  loadError,
  addLoading,
  batchRemoveLoading,
  checkedRowKeys,
  filteredList,
  formModel,
  formRef,
  handleAdd,
  handleBatchRemove,
  handleClearAllTempBlocks,
  handleClearTempBlock,
  handleRemove,
  isCompact,
  loadData,
  loading,
  openAddModal,
  pagedList,
  pagination,
  searchText,
  showAddModal,
  tempBlockList,
  tempBlockLoading,
} = useAdminIpBlacklist()
</script>

<template>
  <UiBoard class="page-container">
    <div class="board-page-header">
      <div>
        <h2 class="title">
          IP 黑名单
        </h2>
        <p class="subtitle">
          拦截恶意请求，维护系统安全
        </p>
      </div>
      <NButton type="error" class="add-btn" @click="openAddModal">
        <template #icon>
          <NIcon><BanOutline /></NIcon>
        </template>
        {{ isCompact ? '封禁' : '添加封禁' }}
      </NButton>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <NInput v-model:value="searchText" placeholder="搜索 IP 或原因..." clearable round>
          <template #prefix>
            <NIcon class="text-gray-400">
              <SearchOutline />
            </NIcon>
          </template>
        </NInput>
      </div>

      <div class="actions-box">
        <NButton quaternary circle @click="loadData">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
        </NButton>

        <transition name="scale">
          <NBadge v-if="checkedRowKeys.length > 0" :value="checkedRowKeys.length">
            <NButton type="warning" size="small" secondary :loading="batchRemoveLoading" @click="handleBatchRemove">
              批量解封
            </NButton>
          </NBadge>
        </transition>
      </div>
    </div>

    <UiRecordBoard :error="loadError" :items="pagedList" :loading="loading" empty="暂无封禁记录" :item-key="item => item.ip">
      <template #error>
        {{ loadError }}<NButton @click="loadData()">
          重试
        </NButton>
      </template>
      <template #filters>
        <NCheckbox :disabled="loading" :checked="pagedList.length > 0 && pagedList.every(item => checkedRowKeys.includes(item.ip))" :indeterminate="pagedList.some(item => checkedRowKeys.includes(item.ip)) && !pagedList.every(item => checkedRowKeys.includes(item.ip))" @update:checked="checked => checkedRowKeys = checked ? [...new Set([...checkedRowKeys, ...pagedList.map(item => item.ip)])] : checkedRowKeys.filter(key => !pagedList.some(item => item.ip === key))">
          选择当前页
        </NCheckbox>
      </template>
      <template #default="{ item }">
        <UiRecordCard :headline="item.ip" :supporting="item.reason || '无封禁原因'" :status="{ text: '已封禁', tone: 'danger' }" :fields="[{ name: '封禁时间', value: formatDate(item.createdAt) || '未知时间' }]" density="compact">
          <template #actions>
            <NCheckbox :checked="checkedRowKeys.includes(item.ip)" :disabled="loading" :aria-label="`选择 ${item.ip}`" @update:checked="checked => checkedRowKeys = checked ? [...checkedRowKeys, item.ip] : checkedRowKeys.filter(key => key !== item.ip)">
              选择
            </NCheckbox>
            <NButton type="error" secondary @click="handleRemove(item)">
              移除该 IP
            </NButton>
          </template>
        </UiRecordCard>
      </template>
      <template #footer>
        <NPagination v-model:page="pagination.page" :item-count="filteredList.length" :page-size="pagination.pageSize" :page-slot="3">
          <template #prefix>
            共 {{ filteredList.length }} 条
          </template>
        </NPagination>
      </template>
    </UiRecordBoard>

    <!-- ======================== -->
    <!-- 临时封禁列表 -->
    <!-- ======================== -->
    <div class="section-header">
      <div>
        <h3 class="section-title">
          临时封禁
        </h3>
        <p class="section-subtitle">
          因频繁请求被自动封禁的 IP（自动过期）
        </p>
      </div>
      <NButton
        v-if="tempBlockList.length > 0"
        type="warning"
        size="small"
        secondary
        @click="handleClearAllTempBlocks"
      >
        <template #icon>
          <NIcon><TrashOutline /></NIcon>
        </template>
        全部清除
      </NButton>
    </div>

    <div class="temp-block-wrapper">
      <NSpin :show="tempBlockLoading">
        <div v-if="tempBlockList.length === 0" class="empty-state-inline">
          <NEmpty description="暂无临时封禁" size="small" />
        </div>
        <div v-else class="temp-block-grid">
          <div v-for="item in tempBlockList" :key="item.ip" class="temp-block-item">
            <div class="temp-ip">
              <NIcon class="ip-icon">
                <GlobeOutline />
              </NIcon>
              <span>{{ item.ip }}</span>
            </div>
            <div v-if="item.reason" class="temp-info">
              <span class="text-gray-500">{{ item.reason }}</span>
            </div>
            <NButton size="tiny" circle type="warning" quaternary @click="handleClearTempBlock(item.ip)">
              <template #icon>
                <NIcon><TrashOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </div>
      </NSpin>
    </div>

    <NModal v-model:show="showAddModal" preset="card" title="添加封禁" class="glass-modal" :style="{ maxWidth: '500px' }">
      <div class="modal-tip">
        <NIcon color="#d97706">
          <AlertCircleOutline />
        </NIcon>
        <div>支持批量输入，多个 IP 请换行分隔。</div>
      </div>
      <NForm ref="formRef" :model="formModel">
        <NFormItem label="IP 列表" path="ips" :rule="{ required: true, message: '不能为空' }">
          <NInput v-model:value="formModel.ips" type="textarea" placeholder="例如：192.168.1.1&#10;10.0.0.1" :rows="5" />
        </NFormItem>
        <NFormItem label="封禁原因" path="reason" :rule="{ required: true, message: '不能为空' }">
          <NInput v-model:value="formModel.reason" placeholder="例如：恶意扫描" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton quaternary @click="showAddModal = false">
            取消
          </NButton>
          <NButton type="error" :loading="addLoading" @click="handleAdd">
            确认封禁
          </NButton>
        </div>
      </template>
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
 .temp-block-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 12px; } .temp-block-item, .temp-ip { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; } .temp-block-item { padding: 12px; border-inline-start: 4px solid var(--ui-warning); } .temp-info { overflow-wrap: anywhere; } .modal-tip { display: flex; gap: 8px; padding: 12px; margin-bottom: 16px; color: var(--ui-warning); } :global(.glass-modal) { width: min(92vw, 500px); }
</style>
