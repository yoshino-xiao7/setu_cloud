<script setup lang="ts">
import {
  CheckmarkCircleOutline,
  CopyOutline,
  CreateOutline,
  KeyOutline,
  Pencil,
  PowerOutline,
  StatsChartOutline,
  TimeOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NSpin,
} from 'naive-ui'
import { UiBento, UiBentoTile, UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useApiKeyList } from '@/composables/useApiKeyList'

const {
  copyCreatedKey,
  createForm,
  creating,
  formatDateOnly,
  handleCreate,
  handleDelete,
  handleRename,
  items,
  keyStats,
  lastCreatedKey,
  loadData,
  loadError,
  loading,
  openCreate,
  openRename,
  renameForm,
  renaming,
  showCreateModal,
  showKeyResultModal,
  showRenameModal,
  toggleStatus,
} = useApiKeyList()
</script>

<template>
  <UiBoard class="page-container ui-page">
    <div class="board-page-header ui-page-header ui-card">
      <div class="title-block">
        <h2 class="title ui-page-title">
          API 凭证
        </h2>
        <p class="subtitle ui-page-subtitle">
          管理你的访问密钥、调用配额与启用状态
        </p>
      </div>
      <NButton
        type="primary"
        round
        color="#f586a9"
        class="glass-btn action-create-btn"
        @click="openCreate"
      >
        <template #icon>
          <NIcon><CreateOutline /></NIcon>
        </template>
        新建 Key
      </NButton>
    </div>

    <UiBento><UiBentoTile title="全部 Key" :value="String(keyStats.total)" :icon="KeyOutline" tone="brand" /><UiBentoTile title="启用中" :value="String(keyStats.enabled)" :icon="CheckmarkCircleOutline" /><UiBentoTile title="今日调用" :value="String(keyStats.callsToday)" :icon="TimeOutline" /><UiBentoTile title="历史总量" :value="String(keyStats.totalCalls)" :icon="StatsChartOutline" /></UiBento>

    <div class="mobile-action-bar api-mobile-actions">
      <NButton type="primary" color="#f586a9" class="mobile-primary-action" @click="openCreate">
        <template #icon>
          <NIcon><CreateOutline /></NIcon>
        </template>
        新建 Key
      </NButton>
    </div>

    <div class="content-area">
      <NAlert v-if="loadError" type="error" class="load-alert" :show-icon="false">
        {{ loadError }}
        <NButton text type="primary" size="small" class="inline-retry" @click="loadData">
          重试
        </NButton>
      </NAlert>

      <div v-if="loading" class="loading-box ui-card">
        <NSpin size="large" />
      </div>

      <div v-else-if="!loadError && items.length === 0" class="empty-box ui-card">
        <NEmpty description="暂无 API Key，去创建一个吧">
          <template #extra>
            <NButton type="primary" color="#f586a9" @click="openCreate">
              <template #icon>
                <NIcon><CreateOutline /></NIcon>
              </template>
              新建 Key
            </NButton>
          </template>
        </NEmpty>
      </div>

      <UiRecordBoard v-else-if="items.length > 0" :items="items" :item-key="item => item.id">
        <template #default="{ item }">
          <UiRecordCard :headline="item.name" :supporting="formatDateOnly(item.createdAt)" :status="{ tone: item.status === 1 ? 'success' : 'danger', text: item.status === 1 ? '启用' : '禁用' }" :fields="[{ name: '今日调用', value: String(item.callsToday) }, { name: '每日限额', value: String(item.dailyQuota) }, { name: '总调用', value: String(item.totalCalls) }, { name: '总限额', value: String(item.totalQuota || '∞') }]">
            <template #actions>
              <NButton
                text
                size="tiny"
                class="action-btn"
                @click="openRename(item)"
              >
                <template #icon>
                  <NIcon :component="Pencil" />
                </template>
                重命名
              </NButton>

              <div class="v-line" />

              <NButton
                text
                size="tiny"
                :type="item.status === 1 ? 'warning' : 'success'"
                class="action-btn"
                @click="toggleStatus(item)"
              >
                <template #icon>
                  <NIcon :component="PowerOutline" />
                </template>
                {{ item.status === 1 ? '禁用' : '启用' }}
              </NButton>

              <div class="v-line" />

              <NButton
                text
                size="tiny"
                type="error"
                class="action-btn"
                @click="handleDelete(item)"
              >
                <template #icon>
                  <NIcon :component="TrashOutline" />
                </template>
                删除
              </NButton>
            </template>
          </UiRecordCard>
        </template>
      </UiRecordBoard>
    </div>

    <NModal
      v-model:show="showCreateModal"
      preset="card"
      title="新建 API Key"
      class="glass-modal"
      :style="{ width: 'min(92vw, 450px)' }"
    >
      <div class="form-item">
        <label>名称 / 备注</label>
        <NInput v-model:value="createForm.name" placeholder="例如：博客调用" />
      </div>
      <div class="form-item">
        <label>每日调用配额</label>
        <NInputNumber v-model:value="createForm.dailyQuota" :min="1" />
      </div>
      <div class="form-item">
        <label>总调用配额 (可选)</label>
        <NInputNumber v-model:value="createForm.totalQuota" :min="1" placeholder="留空则为无限制" />
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showCreateModal = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="creating" @click="handleCreate">
            创建
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="showKeyResultModal"
      preset="card"
      title="Key 创建成功"
      class="glass-modal result-modal"
      :style="{ width: 'min(92vw, 450px)' }"
      :mask-closable="false"
      :close-on-esc="false"
    >
      <div class="result-body">
        <NIcon size="48" color="#10b981">
          <CheckmarkCircleOutline />
        </NIcon>
        <p class="warn-text">
          请立即复制并妥善保存您的 API Key。<br>出于安全考虑，<strong>无法再次查看。</strong>
        </p>
        <div class="key-display">
          <code>{{ lastCreatedKey }}</code>
          <NButton size="small" secondary type="primary" @click="copyCreatedKey">
            <template #icon>
              <NIcon><CopyOutline /></NIcon>
            </template>
            复制
          </NButton>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer center">
          <NButton type="primary" @click="showKeyResultModal = false">
            我已保存
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="showRenameModal"
      preset="card"
      title="重命名"
      class="glass-modal"
      :style="{ width: 'min(92vw, 400px)' }"
    >
      <div class="form-item">
        <label>新的名称</label>
        <NInput v-model:value="renameForm.name" placeholder="请输入新名称" />
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showRenameModal = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="renaming" @click="handleRename">
            保存
          </NButton>
        </div>
      </template>
    </NModal>
  </UiBoard>
</template>

<style scoped>
/* 全局容器 */
.page-container {
  display: flex; flex-direction: column; gap: 22px;
  padding-bottom: 60px;
}

/* 头部样式 */
.board-page-header {
  display: flex; justify-content: space-between; align-items: flex-end; padding: 24px;
  flex-wrap: wrap; gap: 12px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}
.title { margin: 0; }
.subtitle { margin: 6px 0 0 0; }
.glass-btn {
  box-shadow: 0 12px 28px rgba(245, 134, 169, 0.22);
  font-weight: 700;
}

.api-mobile-actions {
  margin-top: -4px;
}

.mobile-primary-action {
  flex: 1;
}

.load-alert {
  margin-bottom: 16px;
  border-radius: var(--ui-radius-md);
}

.inline-retry {
  margin-left: 8px;
  vertical-align: baseline;
}

/* 加载与空状态 */
.loading-box, .empty-box {
  min-height: 300px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--ui-radius-xl);
}

/* =======================================================
   🔥🔥 核心卡片样式 (Grid Item) 🔥🔥
   ======================================================= */

/* 悬浮微交互：上浮 + 阴影加深 */

/* 1. 卡片顶部 */

/* 分割线 */

/* 2. 数据统计 Grid */

/* 3. 底部操作栏 */
.action-btn { color: var(--ui-text-muted); }
.action-btn:hover { color: var(--ui-primary); }

/* 竖线分隔符 */
.v-line {
  width: 1px; height: 14px; background: rgba(0,0,0,0.1);
}

/* =======================================================
   模态框样式 (复用)
   ======================================================= */
.form-item { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
.modal-footer.center { justify-content: center; }
.result-body { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 10px 0; }
.warn-text { font-size: 14px; color: #ef4444; background: rgba(254, 242, 242, 0.8); padding: 12px; border-radius: 8px; }
.key-display { display: flex; align-items: center; gap: 10px; background: rgba(243, 244, 246, 0.8); padding: 8px 12px; border-radius: 8px; width: 100%; justify-content: space-between; }
:global(.glass-modal.n-modal) { background: var(--board-surface) !important; border: 1px solid var(--ui-border) !important; }

@media (max-width: 640px) {

  .page-container {
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }

  .action-create-btn {
    display: none;
  }

  .v-line {
    display: none;
  }
}

.board-page-header { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.ui-card, .header { background: var(--board-surface); color: var(--board-text); }
</style>
