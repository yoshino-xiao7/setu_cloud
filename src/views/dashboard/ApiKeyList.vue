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
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NSpin,
  NTag,
} from 'naive-ui'
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
  <div class="page-container ui-page">
    <div class="page-header ui-page-header ui-card">
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

    <div class="overview-grid">
      <div class="overview-card ui-card">
        <div class="overview-icon pink">
          <NIcon><KeyOutline /></NIcon>
        </div>
        <div>
          <div class="overview-label">
            全部 Key
          </div>
          <div class="overview-value">
            {{ keyStats.total }}
          </div>
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-icon mint">
          <NIcon><CheckmarkCircleOutline /></NIcon>
        </div>
        <div>
          <div class="overview-label">
            启用中
          </div>
          <div class="overview-value">
            {{ keyStats.enabled }}
          </div>
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-icon blue">
          <NIcon><TimeOutline /></NIcon>
        </div>
        <div>
          <div class="overview-label">
            今日调用
          </div>
          <div class="overview-value">
            {{ keyStats.callsToday }}
          </div>
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-icon violet">
          <NIcon><StatsChartOutline /></NIcon>
        </div>
        <div>
          <div class="overview-label">
            历史总量
          </div>
          <div class="overview-value">
            {{ keyStats.totalCalls }}
          </div>
        </div>
      </div>
    </div>

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

      <NGrid v-else-if="items.length > 0" :x-gap="20" :y-gap="20" cols="1 s:1 m:2 l:3 xl:4" responsive="screen">
        <NGridItem v-for="item in items" :key="item.id">
          <div class="api-card ui-card ui-card-hover">
            <div class="card-top">
              <div class="icon-wrapper">
                <NIcon :component="KeyOutline" />
              </div>
              <div class="info-wrapper">
                <div class="key-name" :title="item.name">
                  {{ item.name }}
                </div>
                <div class="key-date">
                  {{ formatDateOnly(item.createdAt) }}
                </div>
              </div>
              <NTag
                :type="item.status === 1 ? 'success' : 'error'"
                size="small"
                round
                :bordered="false"
                class="status-tag"
              >
                {{ item.status === 1 ? '启用' : '禁用' }}
              </NTag>
            </div>

            <div class="divider" />

            <div class="stats-grid">
              <div class="stat-cell">
                <span class="label">今日调用</span>
                <span class="value">{{ item.callsToday }}</span>
              </div>
              <div class="stat-cell">
                <span class="label">每日限额</span>
                <span class="value">{{ item.dailyQuota }}</span>
              </div>
              <div class="stat-cell">
                <span class="label">总调用</span>
                <span class="value">{{ item.totalCalls }}</span>
              </div>
              <div class="stat-cell">
                <span class="label">总限额</span>
                <span class="value">{{ item.totalQuota || '∞' }}</span>
              </div>
            </div>

            <div class="card-actions">
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
            </div>
          </div>
        </NGridItem>
      </NGrid>
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
  </div>
</template>

<style scoped>
/* 全局容器 */
.page-container {
  display: flex; flex-direction: column; gap: 22px;
  padding-bottom: 60px;
}

/* 头部样式 */
.page-header {
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

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.overview-card {
  min-height: 104px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.overview-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.overview-icon.pink { color: #f26d99; background: rgba(245, 134, 169, 0.15); }
.overview-icon.mint { color: #0f9f8a; background: rgba(32, 191, 169, 0.14); }
.overview-icon.blue { color: #3b82f6; background: rgba(59, 130, 246, 0.13); }
.overview-icon.violet { color: #8b5cf6; background: rgba(139, 92, 246, 0.13); }

.overview-label {
  color: var(--ui-text-muted);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}

.overview-value {
  color: var(--ui-text);
  font-size: 24px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
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

.api-card {
  display: flex; flex-direction: column;
  position: relative;
  overflow: hidden;
  height: 100%; /* 撑满 Grid 高度 */
}

/* 悬浮微交互：上浮 + 阴影加深 */
.api-card:hover {
  border-color: rgba(245, 134, 169, 0.28);
}

/* 1. 卡片顶部 */
.card-top {
  padding: 16px 16px 12px 16px;
  display: flex; align-items: center; gap: 12px;
}
.icon-wrapper {
  width: 42px; height: 42px; border-radius: 12px;
  background: rgba(245, 134, 169, 0.13);
  color: #f26d99;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.info-wrapper {
  flex: 1; min-width: 0; /* 防止文本溢出 */
}
.key-name {
  font-weight: 800; color: var(--ui-text); font-size: 15px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.key-date {
  font-size: 12px; color: #6b7280; margin-top: 2px;
}
.status-tag { flex-shrink: 0; }

/* 分割线 */
.divider {
  height: 1px; background: var(--ui-border-subtle); margin: 0 16px;
}

/* 2. 数据统计 Grid */
.stats-grid {
  padding: 16px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px 8px;
}
.stat-cell { display: flex; flex-direction: column; }
.stat-cell {
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.72);
}
.stat-cell .label { font-size: 12px; color: var(--ui-text-soft); margin-bottom: 3px; }
.stat-cell .value { font-size: 15px; font-weight: 800; color: var(--ui-text); font-family: monospace; }

/* 3. 底部操作栏 */
.card-actions {
  margin-top: auto; /* 推到底部 */
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.62);
  border-top: 1px solid rgba(255, 255, 255, 0.78);
  display: flex; justify-content: space-between; align-items: center;
}
.action-btn { color: var(--ui-text-muted); }
.action-btn:hover { color: #f586a9; }

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
:global(.glass-modal.n-modal) { background: #fff !important; border: 1px solid var(--ui-border) !important; }

@media (max-width: 640px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .page-container {
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }

  .action-create-btn {
    display: none;
  }

  .card-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .v-line {
    display: none;
  }
}
</style>
