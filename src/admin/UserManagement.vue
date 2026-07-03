<script setup lang="ts">
import {
  ChevronDown,
  LaptopOutline,
  RefreshOutline,
  SearchOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import { NButton, NDataTable, NEmpty, NForm, NFormItem, NIcon, NInput, NInputNumber, NModal, NSelect, NSpin, NTag } from 'naive-ui'
import { useUserManagement } from '@/composables/useUserManagement'
import { formatDateOnly } from '@/utils/dateFormat'

const {
  canSubmitPointsGrant,
  columns,
  detailFor,
  expandedRowKeys,
  handleBan,
  handleDelete,
  handlePageChange,
  handleReset,
  handleSearch,
  handleUnban,
  handleUpdateExpanded,
  hasNextPage,
  isDetailLoading,
  isMobile,
  list,
  loading,
  mobileExpandedId,
  openPointsGrant,
  pagination,
  pointsForm,
  pointsModalVisible,
  pointsSubmitting,
  pointsTarget,
  rowProps,
  searchForm,
  submitPointsGrant,
  toggleMobileExpand,
} = useUserManagement()
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="title">
        用户管理
      </h2>
      <p class="subtitle">
        管理注册用户、权限与状态
      </p>
    </div>

    <div class="glass-card filter-card">
      <div class="filter-grid">
        <div class="filter-item search-input">
          <NInput v-model:value="searchForm.keyword" placeholder="搜邮箱 / 昵称" clearable @keydown.enter="handleSearch">
            <template #prefix>
              <NIcon><SearchOutline /></NIcon>
            </template>
          </NInput>
        </div>
        <div class="filter-item select-box">
          <NSelect v-model:value="searchForm.role" :options="[{ label: '管理员', value: 1 }, { label: '用户', value: 0 }]" placeholder="角色" clearable />
        </div>
        <div class="filter-item select-box">
          <NSelect v-model:value="searchForm.status" :options="[{ label: '正常', value: 1 }, { label: '封禁', value: 0 }]" placeholder="状态" clearable />
        </div>
        <div class="filter-actions">
          <NButton type="primary" color="#f586a9" @click="handleSearch">
            查询
          </NButton>
          <NButton quaternary @click="handleReset">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
          </NButton>
        </div>
      </div>
    </div>

    <div v-if="!isMobile" class="glass-card table-wrapper">
      <NDataTable
        remote
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row) => row.id"
        :expanded-row-keys="expandedRowKeys"
        :row-props="rowProps"
        class="glass-table"
        size="large"
        @update:expanded-row-keys="handleUpdateExpanded"
        @update:page="handlePageChange"
      />
    </div>

    <div v-else class="mobile-list">
      <div v-if="loading && list.length === 0" class="loading-state">
        <NSpin />
      </div>
      <div v-else-if="list.length === 0" class="empty-state">
        <NEmpty description="没有找到用户" />
      </div>

      <div v-else class="card-grid">
        <div
          v-for="row in list"
          :key="row.id"
          class="glass-card mobile-user-card"
          :class="{ 'is-expanded': mobileExpandedId === row.id }"
          @click="toggleMobileExpand(row.id)"
        >
          <div class="card-main">
            <div class="card-left">
              <div class="nick-row">
                <span class="nick">{{ row.nickname || '未命名' }}</span>
                <NTag size="tiny" :type="row.status === 1 ? 'success' : 'error'" round :bordered="false">
                  {{ row.status === 1 ? '正常' : '封禁' }}
                </NTag>
              </div>
              <div class="email">
                {{ row.email }}
              </div>
            </div>
            <div class="card-right">
              <NIcon class="expand-icon" :class="{ rotate: mobileExpandedId === row.id }">
                <ChevronDown />
              </NIcon>
            </div>
          </div>

          <div v-if="mobileExpandedId === row.id" class="card-expand-area" @click.stop>
            <div class="divider" />

            <div v-if="isDetailLoading(row.id)" class="p-4 text-center">
              <NSpin size="small" />
            </div>
            <div v-else-if="detailFor(row.id)" class="detail-content">
              <div class="action-bar">
                <div class="info-tag">
                  ID: {{ row.id }}
                </div>
                <div class="info-tag">
                  {{ row.role === 1 ? '管理员' : '普通用户' }}
                </div>
                <NButton
                  size="tiny" type="warning" secondary
                  @click="openPointsGrant(row)"
                >
                  加积分
                </NButton>
                <NButton
                  size="tiny" :type="row.status === 1 ? 'error' : 'success'" secondary
                  @click="row.status === 1 ? handleBan(row) : handleUnban(row)"
                >
                  {{ row.status === 1 ? '封禁用户' : '解封用户' }}
                </NButton>
                <NButton
                  size="tiny" type="error" secondary
                  @click="handleDelete(row)"
                >
                  删除
                </NButton>
              </div>

              <div class="info-grid-mobile">
                <div class="info-i">
                  <NIcon><LaptopOutline /></NIcon> {{ detailFor(row.id)?.registerIp || '未知IP' }}
                </div>
                <div class="info-i">
                  <NIcon><TimeOutline /></NIcon> {{ formatDateOnly(detailFor(row.id)?.createdAt) }}
                </div>
              </div>

              <div class="key-section-mobile">
                <div class="sec-head">
                  API Keys
                </div>
                <div v-if="detailFor(row.id)?.apiKeys?.length === 0" class="text-xs text-gray-400">
                  无 API Key
                </div>
                <div v-else class="key-list-mobile">
                  <div v-for="k in (detailFor(row.id)?.apiKeys || [])" :key="k.id" class="m-key-item">
                    <div class="flex justify-between">
                      <span class="font-bold">{{ k.name }}</span>
                      <span :class="k.status === 1 ? 'text-green-500' : 'text-red-500'">{{ k.status === 1 ? '●' : '●' }}</span>
                    </div>
                    <div class="text-xs opacity-70 mt-1">
                      用量: {{ k.totalCalls }} / {{ k.dailyQuota }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="list.length > 0" class="mobile-pagination">
        <NButton size="small" :disabled="pagination.page <= 1" @click="handlePageChange(pagination.page - 1)">
          上一页
        </NButton>
        <span>{{ pagination.page }}</span>
        <NButton size="small" :disabled="!hasNextPage" @click="handlePageChange(pagination.page + 1)">
          下一页
        </NButton>
      </div>
    </div>

    <!-- 积分发放弹窗 -->
    <NModal
      v-model:show="pointsModalVisible"
      preset="dialog"
      title="发放积分"
      :positive-text="pointsSubmitting ? '发放中...' : '确认发放'"
      negative-text="取消"
      :loading="pointsSubmitting"
      :disabled="!canSubmitPointsGrant"
      @positive-click="submitPointsGrant"
    >
      <NForm v-if="pointsTarget" label-placement="left" label-width="80" style="margin-top: 16px">
        <NFormItem label="目标用户">
          <NTag type="info" round :bordered="false">
            {{ pointsTarget.nickname || pointsTarget.email }}
          </NTag>
        </NFormItem>
        <NFormItem label="积分数量" required>
          <NInputNumber
            v-model:value="pointsForm.amount"
            :min="1"
            :max="999999"
            placeholder="请输入积分数量"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="发放原因">
          <NInput
            v-model:value="pointsForm.reason"
            type="textarea"
            :rows="2"
            placeholder="可选，如：活动奖励、补偿等"
          />
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped>
/* 全局布局复用 */
.page-container { display: flex; flex-direction: column; gap: 20px; padding-bottom: 60px; }
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

/* 筛选区 */
.filter-card { padding: 16px; }
.filter-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.filter-item { min-width: 140px; }
.search-input { flex: 1; min-width: 200px; }
.filter-actions { display: flex; gap: 8px; margin-left: auto; }
@media (max-width: 640px) {
  .filter-grid { flex-direction: column; }
  .filter-item, .filter-actions { width: 100%; margin: 0; }
  .filter-actions { display: grid; grid-template-columns: 1fr 40px; }
}

/* === PC 表格自定义 === */
.table-wrapper { padding: 0; overflow: hidden; }

.glass-table :deep(.n-data-table-th) {
  background-color: rgba(249, 250, 251, 0.5) !important;
  font-weight: 600; color: #4b5563;
  border-bottom: 1px solid rgba(0,0,0,0.05) !important;
}
.glass-table :deep(.n-data-table-td) {
  background-color: transparent !important;
  border-bottom: 1px solid rgba(0,0,0,0.03) !important;
}
/* 增加行 hover 效果，提示可点击 */
.glass-table :deep(.n-data-table-tr) { transition: background-color 0.2s; }
.glass-table :deep(.n-data-table-tr:hover .n-data-table-td) {
  background-color: rgba(245, 134, 169, 0.08) !important;
}

/* 用户列样式 */
:deep(.user-col) { display: flex; flex-direction: column; line-height: 1.4; }
:deep(.u-nick) { font-weight: 700; color: #374151; }
:deep(.u-email) { font-size: 12px; color: #6b7280; }

/* === PC 展开详情区域样式 (Global/Deep) === */
:deep(.expand-container) {
  display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px;
  padding: 20px 24px;
  background: rgba(249, 250, 251, 0.5); /* 展开区域稍深一点 */
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.02); /* 内阴影 */
}
:deep(.expand-loading) { padding: 20px; display: flex; justify-content: center; color: #6b7280; }
:deep(.expand-section) { display: flex; flex-direction: column; gap: 12px; }
:deep(.sec-title) { font-size: 14px; font-weight: 700; color: #6b7280; display: flex; align-items: center; gap: 6px; }

:deep(.info-grid) { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
:deep(.info-cell) { display: flex; flex-direction: column; font-size: 13px; }
:deep(.info-cell span) { color: #6b7280; font-size: 12px; }
:deep(.info-cell strong) { color: #374151; font-weight: 600; }

:deep(.expand-key-grid) { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
:deep(.mini-key-card) {
  background: #fff; border: 1px solid rgba(0,0,0,0.05); border-radius: 8px;
  padding: 8px 12px; display: flex; flex-direction: column; gap: 4px;
}
:deep(.key-top) { display: flex; justify-content: space-between; align-items: center; }
:deep(.k-name) { font-weight: 700; font-size: 13px; color: #4b5563; }
:deep(.key-info) { font-size: 11px; color: #6b7280; }

/* === 展开动画 === */
.slide-in-top {
  animation: slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top center;
}
@keyframes slideInDown {
  0% { opacity: 0; transform: translateY(-15px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* === 移动端卡片样式 === */
.mobile-list { display: flex; flex-direction: column; gap: 16px; }
.card-grid { display: grid; gap: 12px; }

.mobile-user-card {
  padding: 0; /* 内部布局自己控制 padding */
  transition: all 0.3s;
  overflow: hidden;
}
.mobile-user-card.is-expanded {
  background: rgba(255,255,255,0.9) !important;
  border-color: #f586a9;
  box-shadow: 0 8px 24px rgba(245, 134, 169, 0.15);
}

.card-main {
  padding: 16px;
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer;
}
.card-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.nick-row { display: flex; align-items: center; gap: 8px; }
.nick { font-weight: 700; font-size: 15px; color: #1f2937; }
.email { font-size: 12px; color: #6b7280; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.expand-icon { color: #6b7280; transition: transform 0.3s; }
.rotate { transform: rotate(180deg); color: #f586a9; }

/* 展开区域 */
.card-expand-area {
  background: rgba(249, 250, 251, 0.6);
  border-top: 1px solid rgba(0,0,0,0.05);
  padding: 16px;
  animation: slideDown 0.3s ease;
}
/* 复用上面的动画 */

.detail-content { display: flex; flex-direction: column; gap: 12px; }
.action-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.info-tag { font-size: 12px; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; color: #6b7280; }
.ml-auto { margin-left: auto; }

.info-grid-mobile { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #4b5563; }
.info-i { display: flex; align-items: center; gap: 4px; }

.key-section-mobile { margin-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px; }
.sec-head { font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px; }
.key-list-mobile { display: flex; flex-direction: column; gap: 8px; }
.m-key-item { background: #fff; padding: 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.05); font-size: 13px; }

.mobile-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 10px; color: #6b7280; font-size: 13px; }

@media (prefers-reduced-motion: reduce) {
  .slide-in-top,
  .card-expand-area {
    animation: none;
  }

  .mobile-user-card,
  .expand-icon {
    transition: none;
  }
}
</style>
