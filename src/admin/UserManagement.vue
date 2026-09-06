<script setup lang="ts">
import {
  RefreshOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import { NButton, NForm, NFormItem, NIcon, NInput, NInputNumber, NModal, NPagination, NSelect, NSpin, NTag } from 'naive-ui'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useUserManagement } from '@/composables/useUserManagement'
import { formatDate } from '@/utils/dateFormat'

const {
  loadError,
  loadData,
  canSubmitPointsGrant,
  detailFor,
  expandedRowKeys,
  handleUpdateExpanded,
  isMobile,
  handleBan,
  handleDelete,
  handlePageChange,
  handleReset,
  handleSearch,
  handleUnban,
  isDetailLoading,
  list,
  loading,
  mobileExpandedId,
  openPointsGrant,
  pagination,
  pointsForm,
  pointsModalVisible,
  pointsSubmitting,
  pointsTarget,
  searchForm,
  submitPointsGrant,
  toggleMobileExpand,
} = useUserManagement()
function isExpanded(id: number) {
  return isMobile.value ? mobileExpandedId.value === id : expandedRowKeys.value.includes(id)
}
function toggleDetail(id: number) {
  if (isMobile.value) {
    toggleMobileExpand(id)
    return
  }
  handleUpdateExpanded(expandedRowKeys.value.includes(id) ? expandedRowKeys.value.filter(key => key !== id) : [...expandedRowKeys.value, id])
}
</script>

<template>
  <UiBoard class="page-container">
    <div class="board-page-header">
      <h2 class="title">
        用户管理
      </h2>
      <p class="subtitle">
        管理注册用户、权限与状态
      </p>
    </div>

    <div class="filter-card">
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

    <UiRecordBoard :error="loadError" :items="list" :loading="loading" empty="没有找到用户" :item-key="row => row.id">
      <template #error>
        {{ loadError }}<NButton @click="loadData()">
          重试
        </NButton>
      </template>
      <template #default="{ item: row }">
        <UiRecordCard :headline="row.nickname || '未命名'" :supporting="row.email" :status="{ text: row.status === 0 ? '封禁' : row.emailVerified ? '正常' : '待验证', tone: row.status === 0 ? 'danger' : row.emailVerified ? 'success' : 'warning' }" :fields="[{ name: 'ID', value: String(row.id) }, { name: '角色', value: row.role === 1 ? '管理员' : '用户' }, { name: '邮箱', value: row.emailVerified ? '✓ 已验证' : '✗ 未验证' }, { name: '注册时间', value: formatDate(row.createdAt) }]" density="compact" :on-activate="() => toggleDetail(row.id)" :aria-expanded="isExpanded(row.id)">
          <section v-if="isExpanded(row.id)" class="user-detail" @click.stop>
            <NSpin v-if="isDetailLoading(row.id)" size="small" />
            <template v-else-if="detailFor(row.id)">
              <h3>详细信息</h3>
              <dl class="user-detail-fields">
                <div><dt>注册 IP</dt><dd>{{ detailFor(row.id)?.registerIp || '-' }}</dd></div>
                <div><dt>最后登录 IP</dt><dd>{{ detailFor(row.id)?.lastLoginIp || '-' }}</dd></div>
                <div><dt>注册时间</dt><dd>{{ formatDate(detailFor(row.id)?.createdAt) }}</dd></div>
              </dl>
              <h3>API Keys ({{ detailFor(row.id)?.apiKeys.length || 0 }})</h3>
              <p v-if="!detailFor(row.id)?.apiKeys.length">
                该用户暂无 API Key
              </p>
              <dl v-for="key in detailFor(row.id)?.apiKeys" :key="key.id" class="user-detail-fields">
                <div><dt>{{ key.name }}</dt><dd>{{ key.status === 1 ? '启用' : '禁用' }}</dd></div>
                <div><dt>调用 / 限额</dt><dd>{{ key.totalCalls }} / {{ key.dailyQuota }}</dd></div>
              </dl>
            </template>
            <p v-else role="alert">
              加载失败，请收起后重新展开
            </p>
          </section>
          <template #actions>
            <NButton :aria-expanded="isExpanded(row.id)" @click="toggleDetail(row.id)">
              {{ isExpanded(row.id) ? '收起详情' : '展开详情' }}
            </NButton>
            <NButton type="warning" secondary @click="openPointsGrant(row)">
              加积分
            </NButton>
            <NButton :type="row.status === 1 ? 'error' : 'success'" secondary @click="row.status === 1 ? handleBan(row) : handleUnban(row)">
              {{ row.status === 1 ? '封禁' : '解封' }}
            </NButton>
            <NButton type="error" secondary @click="handleDelete(row)">
              删除
            </NButton>
          </template>
        </UiRecordCard>
      </template>
      <template #footer>
        <NPagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-slot="3" @update:page="handlePageChange">
          <template #prefix>
            共 {{ pagination.itemCount }} 人
          </template>
        </NPagination>
      </template>
    </UiRecordBoard>

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
 .user-detail { border-top: 1px solid var(--board-border); padding-top: 12px; min-width: 0; } .user-detail h3 { font-size: 1rem; } .user-detail-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: 12px; } .user-detail-fields dd { margin: 4px 0 0; overflow-wrap: anywhere; } .user-detail-fields dt { color: var(--board-text-muted); }
</style>
