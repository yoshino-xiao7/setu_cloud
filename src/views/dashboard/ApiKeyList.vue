<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import {
  useMessage,
  useDialog,
  NButton,
  NCard,
  NDataTable,
  NModal,
  NInput,
  NInputNumber,
  NTag,
  NSpace,
  NIcon,
  type DataTableColumns
} from 'naive-ui'
import {
  CreateOutline,
  Pencil,
  TrashOutline,
  PowerOutline,
  CopyOutline,
  CheckmarkCircleOutline
} from '@vicons/ionicons5'
import type { ApiKeyItem } from '@/api/apiKey.ts'
import {
  fetchMyApiKeys,
  createApiKey,
  setApiKeyStatus,
  renameApiKey,
  deleteApiKey
} from '@/api/apiKey.ts'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const items = ref<ApiKeyItem[]>([])

// —— 表格列定义 ——
const columns: DataTableColumns<ApiKeyItem> = [
  { title: '名称', key: 'name', width: 150, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          type: row.status === 1 ? 'success' : 'error',
          bordered: false,
          round: true,
          size: 'small'
        },
        { default: () => (row.status === 1 ? '启用' : '禁用') }
      )
    }
  },
  { title: '今日调用', key: 'callsToday', width: 100 },
  { title: '总调用', key: 'totalCalls', width: 100 },
  { title: '每日配额', key: 'dailyQuota', width: 100 },
  {
    title: '总配额',
    key: 'totalQuota',
    width: 100,
    render(row) {
      return row.totalQuota ? row.totalQuota : '无限制'
    }
  },
  { title: '创建时间', key: 'createdAt', width: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          // 重命名按钮
          h(NButton, {
            size: 'tiny',
            quaternary: true,
            circle: true,
            type: 'info',
            onClick: () => openRename(row)
          }, { icon: () => h(NIcon, null, { default: () => h(Pencil) }) }),

          // 状态切换按钮
          h(NButton, {
            size: 'tiny',
            quaternary: true,
            circle: true,
            type: row.status === 1 ? 'warning' : 'success',
            onClick: () => toggleStatus(row)
          }, { icon: () => h(NIcon, null, { default: () => h(PowerOutline) }) }),

          // 删除按钮
          h(NButton, {
            size: 'tiny',
            quaternary: true,
            circle: true,
            type: 'error',
            onClick: () => handleDelete(row)
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
      })
    }
  }
]

// —— 数据加载 ——
const loadData = async () => {
  loading.value = true
  try {
    const list = await fetchMyApiKeys()
    items.value = list
  } catch (e: any) {
    console.error(e)
    message.error(e?.response?.data?.message || '加载 API Key 列表失败')
  } finally {
    loading.value = false
  }
}

// —— 新建相关 ——
const showCreateModal = ref(false)
const createForm = ref({
  name: '',
  dailyQuota: 1000,
  totalQuota: null as number | null
})
const creating = ref(false)

const openCreate = () => {
  createForm.value = { name: '', dailyQuota: 1000, totalQuota: null }
  showCreateModal.value = true
}

const handleCreate = async () => {
  if (!createForm.value.name.trim()) {
    message.warning('请填写 Key 名称')
    return
  }
  creating.value = true
  try {
    const payload = {
      name: createForm.value.name.trim(),
      dailyQuota: createForm.value.dailyQuota,
      totalQuota: createForm.value.totalQuota
    }
    const plainKey = await createApiKey(payload)
    lastCreatedKey.value = plainKey

    // 成功流程
    message.success('创建成功')
    showCreateModal.value = false
    showKeyResultModal.value = true
    await loadData()
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '创建失败'
    message.error(msg)
  } finally {
    creating.value = false
  }
}

// —— Key 结果展示 ——
const lastCreatedKey = ref<string | null>(null)
const showKeyResultModal = ref(false)

const copyCreatedKey = async () => {
  if (!lastCreatedKey.value) return
  try {
    await navigator.clipboard.writeText(lastCreatedKey.value)
    message.success('已复制')
  } catch {
    message.warning('复制失败，请手动选择复制')
  }
}

// —— 重命名 ——
const showRenameModal = ref(false)
const renameForm = ref({ id: 0, name: '' })
const renaming = ref(false)

const openRename = (item: ApiKeyItem) => {
  renameForm.value = { id: item.id, name: item.name }
  showRenameModal.value = true
}

const handleRename = async () => {
  if (!renameForm.value.name.trim()) {
    message.warning('名称不能为空')
    return
  }
  renaming.value = true
  try {
    await renameApiKey(renameForm.value.id, renameForm.value.name.trim())
    message.success('修改成功')
    showRenameModal.value = false
    await loadData()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '修改失败')
  } finally {
    renaming.value = false
  }
}

// —— 状态切换与删除 ——
const toggleStatus = (item: ApiKeyItem) => {
  const targetStatus = item.status === 1 ? 0 : 1
  const actionText = targetStatus === 1 ? '启用' : '禁用'

  dialog.warning({
    title: `${actionText} API Key`,
    content: `确定要${actionText}「${item.name}」吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await setApiKeyStatus(item.id, targetStatus === 1)
        message.success(`${actionText}成功`)
        await loadData()
      } catch (e: any) {
        message.error(e?.response?.data?.message || `${actionText}失败`)
      }
    }
  })
}

const handleDelete = (item: ApiKeyItem) => {
  dialog.error({
    title: '删除 API Key',
    content: `确定要删除「${item.name}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteApiKey(item.id)
        message.success('删除成功')
        await loadData()
      } catch (e: any) {
        message.error(e?.response?.data?.message || '删除失败')
      }
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">

    <div class="page-header">
      <div class="title-block">
        <h2 class="title">我的 API Key</h2>
        <p class="subtitle">管理您的访问凭证与配额</p>
      </div>
      <n-button
        type="primary"
        round
        color="#8b5cf6"
        @click="openCreate"
        class="glass-btn"
      >
        <template #icon>
          <n-icon><CreateOutline /></n-icon>
        </template>
        新建 API Key
      </n-button>
    </div>

    <n-card :bordered="false" class="glass-card table-card">
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :row-key="(row) => row.id"
        class="glass-table"
        size="small"
      />
    </n-card>

    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="新建 API Key"
      class="glass-modal"
      :style="{ width: '450px' }"
    >
      <div class="form-item">
        <label>名称 / 备注</label>
        <n-input v-model:value="createForm.name" placeholder="例如：博客调用" />
      </div>
      <div class="form-item">
        <label>每日调用配额</label>
        <n-input-number v-model:value="createForm.dailyQuota" :min="1" />
      </div>
      <div class="form-item">
        <label>总调用配额 (可选)</label>
        <n-input-number
          v-model:value="createForm.totalQuota"
          :min="1"
          placeholder="留空则为无限制"
        />
      </div>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="showCreateModal = false" quaternary>取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="creating" @click="handleCreate">
            创建
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showKeyResultModal"
      preset="card"
      title="Key 创建成功"
      class="glass-modal result-modal"
      :style="{ width: '450px' }"
      :mask-closable="false"
      :close-on-esc="false"
    >
      <div class="result-body">
        <n-icon size="48" color="#10b981"><CheckmarkCircleOutline /></n-icon>
        <p class="warn-text">
          请立即复制并妥善保存您的 API Key。<br/>
          出于安全考虑，<strong>您将无法再次查看此 Key。</strong>
        </p>
        <div class="key-display">
          <code>{{ lastCreatedKey }}</code>
          <n-button size="small" secondary type="primary" @click="copyCreatedKey">
            <template #icon><n-icon><CopyOutline /></n-icon></template>
            复制
          </n-button>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer center">
          <n-button type="primary" @click="showKeyResultModal = false">
            我已保存
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showRenameModal"
      preset="card"
      title="重命名"
      class="glass-modal"
      :style="{ width: '400px' }"
    >
      <div class="form-item">
        <label>新的名称</label>
        <n-input v-model:value="renameForm.name" placeholder="请输入新名称" />
      </div>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showRenameModal = false" quaternary>取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="renaming" @click="handleRename">
            保存
          </n-button>
        </div>
      </template>
    </n-modal>

  </div>
</template>

<style scoped>
/* 页面容器 */
.page-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 4px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #6b7280;
}

/* 按钮毛玻璃投影 */
.glass-btn {
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
}

/* --- 核心：毛玻璃卡片 --- */
.glass-card {
  /* 确保卡片本身是半透明的 */
  background: rgba(255, 255, 255, 0.6) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  /* 关键：重置 Card 组件内部变量，防止 Card 自带的白色背景影响 */
  --n-color: transparent !important;
}

/* --- ⚡️⚡️ 重点修复：表格样式透光处理 ⚡️⚡️ --- */

/* 1. 在表格根节点强制重写 CSS 变量 */
.glass-table {
  /* 单元格背景透明 */
  --n-td-color: transparent !important;
  /* 表头背景半透明 */
  --n-th-color: rgba(255, 255, 255, 0.3) !important;
  /* 边框颜色变淡 */
  --n-border-color: rgba(0, 0, 0, 0.05) !important;
  /* 悬浮时行的颜色 */
  --n-td-color-hover: rgba(139, 92, 246, 0.1) !important;
  /* ⚠️ Naive UI 内部合并后的变量，必须覆盖 */
  --n-merged-th-color: rgba(255, 255, 255, 0.3) !important;
  --n-merged-td-color: transparent !important;
  --n-merged-border-color: rgba(0, 0, 0, 0.05) !important;
}

/* 2. 强行覆盖表格本身背景 */
.glass-table :deep(.n-data-table) {
  background-color: transparent !important;
}

/* 3. 强行覆盖表头 (th) */
.glass-table :deep(.n-data-table-th) {
  background-color: var(--n-merged-th-color) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4) !important;
  font-weight: 600;
  color: #4b5563;
}

/* 4. 强行覆盖单元格 (td) */
.glass-table :deep(.n-data-table-td) {
  background-color: transparent !important; /* 必须透明，透出卡片背景 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: #374151;
}

/* 5. 去除表格外层边框 */
.glass-table :deep(.n-data-table-wrapper) {
  border: none !important;
  border-radius: 0 !important;
}

/* 6. 修复分页器背景（防止分页器底色是白的） */
.glass-table :deep(.n-pagination .n-pagination-item) {
  background-color: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
}
.glass-table :deep(.n-pagination .n-pagination-item--active) {
  background-color: #8b5cf6 !important;
  color: #fff !important;
  border: none !important;
}
.glass-table :deep(.n-pagination .n-pagination-item:hover) {
  color: #8b5cf6 !important;
  border-color: #8b5cf6 !important;
}

/* --- 弹窗样式 --- */
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.form-item label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.modal-footer.center {
  justify-content: center;
}

/* 结果弹窗 */
.result-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: 10px 0;
}
.warn-text {
  font-size: 14px;
  color: #ef4444;
  background: rgba(254, 242, 242, 0.8);
  padding: 12px;
  border-radius: 8px;
  line-height: 1.6;
}
.key-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(243, 244, 246, 0.8);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  width: 100%;
  justify-content: space-between;
}
.key-display code {
  font-family: monospace;
  font-size: 14px;
  color: #111827;
  word-break: break-all;
}

/* 全局弹窗样式 */
:global(.glass-modal.n-modal) {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.7) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15) !important;
}
:global(.glass-modal .n-card-header__main) {
  color: #1f2937 !important;
}
</style>