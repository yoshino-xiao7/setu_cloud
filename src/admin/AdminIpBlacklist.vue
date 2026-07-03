<script setup lang="ts">
import {
  AlertCircleOutline,
  BanOutline,
  GlobeOutline,
  RefreshOutline,
  SearchOutline,
  TimeOutline,
  TrashOutline,
  WarningOutline,
} from '@vicons/ionicons5'
import {
  NBadge,
  NButton,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSpin,
} from 'naive-ui'
import { useAdminIpBlacklist } from '@/composables/useAdminIpBlacklist'
import { formatDate } from '@/utils/dateFormat'

const {
  addLoading,
  batchRemoveLoading,
  checkedRowKeys,
  columns,
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
  <div class="page-container">
    <div class="page-header">
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

    <div class="glass-card toolbar">
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

    <div v-if="!isCompact" class="glass-card table-wrapper">
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="filteredList"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row) => row.ip"
        class="glass-table"
      />
    </div>

    <div v-else class="mobile-list">
      <div v-if="loading && filteredList.length === 0" class="p-8 text-center">
        <NSpin />
      </div>
      <div v-else-if="filteredList.length === 0" class="empty-state">
        <NEmpty description="暂无封禁记录" />
      </div>

      <transition-group name="list" tag="div" class="card-grid">
        <div v-for="item in pagedList" :key="item.ip" class="glass-card mobile-card">
          <div class="card-header">
            <div class="ip-tag">
              <NIcon><GlobeOutline /></NIcon>
              <span>{{ item.ip }}</span>
            </div>
            <NButton size="tiny" circle type="error" secondary @click="handleRemove(item)">
              <template #icon>
                <NIcon><TrashOutline /></NIcon>
              </template>
            </NButton>
          </div>

          <div class="card-body">
            <div class="reason-row">
              <NIcon class="icon-warn">
                <WarningOutline />
              </NIcon>
              <span>{{ item.reason || '无封禁原因' }}</span>
            </div>
            <div class="time-row">
              <NIcon><TimeOutline /></NIcon>
              <span>{{ formatDate(item.createdAt) || '未知时间' }}</span>
            </div>
          </div>
        </div>
      </transition-group>
      <div v-if="filteredList.length > pagination.pageSize" class="mobile-pagination">
        <NPagination
          v-model:page="pagination.page"
          :item-count="filteredList.length"
          :page-size="pagination.pageSize"
          size="small"
        />
      </div>
    </div>

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

    <div class="glass-card temp-block-wrapper">
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
  </div>
</template>

<style scoped>
/* ========================
   全局布局与通用样式
   ======================== */
.page-container { display: flex; flex-direction: column; gap: 20px; padding-bottom: 80px; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }
.add-btn { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }

/* ========================
   工具栏 (Toolbar)
   ======================== */
.toolbar { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.search-box { flex: 1; max-width: 300px; }
.actions-box { display: flex; align-items: center; gap: 12px; }

/* ========================
   PC 表格样式 (透明化)
   ======================== */
.glass-table :deep(.n-data-table-th) {
  background-color: rgba(249, 250, 251, 0.5); border-bottom: 1px solid rgba(0,0,0,0.05); font-weight: 600; color: #4b5563;
}
.glass-table :deep(.n-data-table-td) { background-color: transparent; border-bottom: 1px solid rgba(0,0,0,0.03); }
.glass-table :deep(.n-data-table-tr:hover .n-data-table-td) { background-color: rgba(239, 68, 68, 0.05) !important; }

/* ========================
   移动端卡片样式
   ======================== */
.mobile-list { display: flex; flex-direction: column; gap: 12px; }
.mobile-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: all 0.3s; }
.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; }
.ip-tag { display: flex; align-items: center; gap: 6px; font-family: monospace; font-weight: 700; color: #ef4444; font-size: 16px; }
.card-body { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #4b5563; }
.reason-row, .time-row { display: flex; align-items: center; gap: 6px; }
.icon-warn { color: #f59e0b; }
.time-row { color: #6b7280; font-size: 12px; }
.mobile-pagination { display: flex; justify-content: center; margin-top: 4px; }

/* ========================
   动画
   ======================== */
.scale-enter-active, .scale-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.8); }

.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(20px); }
.list-leave-active { position: absolute; width: 100%; } /* 确保移除时布局平滑 */

/* ========================
   其他细节
   ======================== */
.modal-tip { background: #fffbeb; color: #b45309; padding: 10px; border-radius: 8px; font-size: 13px; display: flex; gap: 8px; margin-bottom: 16px; }
:global(.glass-modal) { background: rgba(255, 255, 255, 0.85) !important; backdrop-filter: blur(20px); border: 1px solid #fff; }
.flex-center { display: flex; align-items: center; }
.mr-1 { margin-right: 4px; }

/* ========================
   临时封禁区块样式
   ======================== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  margin-top: 12px;
}
.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f59e0b;
}
.section-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #6b7280;
}
.temp-block-wrapper {
  padding: 16px;
  min-height: 80px;
}
.empty-state-inline {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
}
.temp-block-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.temp-block-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  font-size: 13px;
}
.temp-ip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: monospace;
  font-weight: 600;
  color: #d97706;
}
.ip-icon {
  color: #f59e0b;
}
.temp-info {
  font-size: 12px;
}
.text-gray-500 {
  color: #6b7280;
}
</style>
