<script setup lang="ts">
import { h, onMounted, ref, reactive, computed } from 'vue'
import {
  NButton, NCard, NDataTable, NInput, NModal, NForm, NFormItem, NIcon,
  useMessage, useDialog, NTag
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import {
  AddOutline,
  TrashOutline,
  TimeOutline,
  AlertCircleOutline,
  SearchOutline,
  RefreshOutline,
  CheckmarkCircleOutline
} from '@vicons/ionicons5'
import {
  fetchIpBlacklist,
  addIpBlacklist,
  removeIpBlacklist,
  type BlacklistIpItem
} from '@/api/admin'

const message = useMessage()
const dialog = useDialog()

// ==========================
// 1. 数据加载与前端搜索逻辑
// ==========================
const loading = ref(false)
const fullList = ref<BlacklistIpItem[]>([])
const searchText = ref('')
const checkedRowKeys = ref<DataTableRowKey[]>([]) // 存储选中的 IP

const filteredList = computed(() => {
  if (!searchText.value) return fullList.value
  const lowerText = searchText.value.toLowerCase()
  return fullList.value.filter(item =>
    item.ip.includes(lowerText) ||
    (item.reason && item.reason.toLowerCase().includes(lowerText))
  )
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }: any) => `共 ${itemCount} 条记录`
})

const loadData = async () => {
  loading.value = true
  checkedRowKeys.value = [] // 刷新时清空选中
  try {
    const res = await fetchIpBlacklist()
    fullList.value = Array.isArray(res) ? res : (res.data || [])
    pagination.page = 1
  } catch (e) {
    message.error('加载黑名单失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  searchText.value = ''
}

// ==========================
// 2. 表格列定义 (增加多选列)
// ==========================
const columns: DataTableColumns<BlacklistIpItem> = [
  { type: 'selection' }, // ✅ 开启多选框
  {
    title: 'IP 地址',
    key: 'ip',
    width: 160,
    sorter: (row1, row2) => row1.ip.localeCompare(row2.ip),
    render(row) {
      return h('strong', { style: { fontFamily: 'monospace', fontSize: '14px' } }, row.ip)
    }
  },
  {
    title: '封禁原因',
    key: 'reason',
    ellipsis: { tooltip: true },
    render(row) {
      return row.reason || h('span', { style: { color: '#9ca3af' } }, '未填写原因')
    }
  },
  {
    title: '封禁时间',
    key: 'createdAt',
    width: 200,
    sorter: (row1, row2) => new Date(row1.createdAt || 0).getTime() - new Date(row2.createdAt || 0).getTime(),
    render(row) {
      if (!row.createdAt) return '-'
      return h(NTag, { bordered: false, size: 'small', type: 'default' }, {
        default: () => [
          h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(TimeOutline) }),
          row.createdAt
        ]
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render(row) {
      return h(NButton, {
        size: 'small',
        type: 'error',
        secondary: true,
        onClick: () => handleRemove(row)
      }, {
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
        default: () => '移除'
      })
    }
  }
]

// ==========================
// 3. 批量添加逻辑
// ==========================
const showAddModal = ref(false)
const addLoading = ref(false)
const formRef = ref()
const formModel = reactive({
  ips: '',
  reason: ''
})
const rules = {
  ips: { required: true, message: '请输入 IP 地址', trigger: 'blur' },
  reason: { required: true, message: '请输入封禁原因', trigger: 'blur' }
}

const openAddModal = () => {
  formModel.ips = ''
  formModel.reason = ''
  showAddModal.value = true
}

const handleAdd = () => {
  formRef.value?.validate(async (errors: any) => {
    if (!errors) {
      const ipList = formModel.ips.split(/[\n,]+/).map(ip => ip.trim()).filter(ip => ip.length > 0)
      if (ipList.length === 0) {
        message.warning('请输入有效的 IP 地址')
        return
      }
      addLoading.value = true
      try {
        await Promise.all(ipList.map(ip => addIpBlacklist(ip, formModel.reason)))
        message.success(`成功封禁 ${ipList.length} 个 IP`)
        showAddModal.value = false
        loadData()
      } catch (e: any) {
        message.error('部分操作可能失败，请刷新查看')
        loadData()
      } finally {
        addLoading.value = false
      }
    }
  })
}

// ==========================
// 4. 单个移除逻辑
// ==========================
const handleRemove = (row: BlacklistIpItem) => {
  dialog.warning({
    title: '移除黑名单',
    content: `确定要移除 IP「${row.ip}」吗？`,
    positiveText: '确认移除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await removeIpBlacklist(row.ip)
        message.success('移除成功')
        loadData()
      } catch (e: any) {
        message.error('移除失败')
      }
    }
  })
}

// ==========================
// 5. 批量移除逻辑 (新增)
// ==========================
const batchRemoveLoading = ref(false)

const handleBatchRemove = () => {
  const count = checkedRowKeys.value.length
  if (count === 0) return

  dialog.warning({
    title: '批量移除黑名单',
    content: `确定要移除选中的 ${count} 个 IP 吗？`,
    positiveText: `确定移除 (${count})`,
    negativeText: '取消',
    onPositiveClick: async () => {
      batchRemoveLoading.value = true
      try {
        // 并发调用移除接口
        const promises = checkedRowKeys.value.map(ip => removeIpBlacklist(ip as string))
        await Promise.all(promises)

        message.success(`成功移除 ${count} 个 IP`)
        checkedRowKeys.value = [] // 清空选中状态
        loadData()
      } catch (e) {
        message.error('部分移除失败，请刷新重试')
        loadData()
      } finally {
        batchRemoveLoading.value = false
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
        <h2 class="title">IP 黑名单</h2>
        <p class="subtitle">管理恶意请求来源，保护接口安全</p>
      </div>
      <div class="header-actions">
        <n-button type="error" class="glass-btn" @click="openAddModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          批量封禁
        </n-button>
      </div>
    </div>

    <div class="glass-card filter-card">
      <div class="filter-row">
        <n-input
          v-model:value="searchText"
          placeholder="搜索 IP 地址..."
          clearable
          class="search-input"
        >
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>

        <n-button quaternary @click="handleReset">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          重置
        </n-button>

        <div class="divider-vertical"></div>

        <transition name="fade">
          <n-button
            v-if="checkedRowKeys.length > 0"
            type="warning"
            secondary
            :loading="batchRemoveLoading"
            @click="handleBatchRemove"
          >
            <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
            批量解封 ({{ checkedRowKeys.length }})
          </n-button>
        </transition>
      </div>
    </div>

    <n-card :bordered="false" class="glass-card table-card">
      <n-data-table
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="filteredList"
        :loading="loading"
        :pagination="pagination"
        class="glass-table"
        size="small"
        :row-key="(row) => row.ip"
      />
    </n-card>

    <n-modal
      v-model:show="showAddModal"
      preset="card"
      title="批量封禁 IP"
      class="glass-modal"
      :style="{ width: '500px' }"
    >
      <div class="modal-tip">
        <n-icon color="#f59e0b"><AlertCircleOutline /></n-icon>
        <span>被封禁的 IP 将无法调用接口。支持一次输入多个。</span>
      </div>

      <n-form
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-placement="top"
        require-mark-placement="right-hanging"
        style="margin-top: 16px;"
      >
        <n-form-item label="IP 地址列表" path="ips">
          <n-input
            v-model:value="formModel.ips"
            type="textarea"
            placeholder="请输入 IP 地址&#10;一行一个，例如：&#10;1.2.3.4&#10;5.6.7.8"
            :rows="6"
          />
        </n-form-item>

        <n-form-item label="统一封禁原因" path="reason">
          <n-input
            v-model:value="formModel.reason"
            placeholder="例如：恶意刷接口 / 爬虫"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="showAddModal = false" quaternary>取消</n-button>
          <n-button type="error" :loading="addLoading" @click="handleAdd">
            批量封禁
          </n-button>
        </div>
      </template>
    </n-modal>

  </div>
</template>

<style scoped>
/* ==========================
   布局与基础
   ========================== */
.page-container {
  display: flex; flex-direction: column; gap: 20px;
}
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end; padding: 0 4px;
}
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

.glass-btn {
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
}

/* ==========================
   筛选栏
   ========================== */
.filter-card { padding: 16px 20px; }
.filter-row { display: flex; align-items: center; gap: 12px; height: 34px; }
.search-input { width: 300px; }

.divider-vertical {
  width: 1px; height: 20px; background: #e5e7eb; margin: 0 8px;
}

/* 按钮淡入淡出动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ==========================
   毛玻璃与表格样式
   ========================== */
.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  --n-color: transparent !important;
}

/* 强制表格透明 */
.glass-table :deep(.n-data-table) {
  background-color: transparent !important;
  --n-th-color: rgba(255, 255, 255, 0.3) !important;
  --n-td-color: transparent !important;
  --n-border-color: rgba(0, 0, 0, 0.05) !important;
  --n-td-color-hover: rgba(244, 63, 94, 0.08) !important;
  --n-merged-th-color: rgba(255, 255, 255, 0.3) !important;
  --n-merged-td-color: transparent !important;
  --n-merged-border-color: rgba(0, 0, 0, 0.05) !important;
}
.glass-table :deep(.n-data-table-th) {
  background-color: var(--n-merged-th-color) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4) !important;
  font-weight: 600; color: #4b5563;
}
.glass-table :deep(.n-data-table-td) {
  background-color: transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: #374151;
}
.glass-table :deep(.n-data-table-wrapper) { border: none !important; border-radius: 0 !important; }
.glass-table :deep(.n-pagination .n-pagination-item) {
  background-color: transparent !important; border: 1px solid rgba(255, 255, 255, 0.5) !important;
}
.glass-table :deep(.n-pagination .n-pagination-item--active) {
  background-color: #f43f5e !important; color: #fff !important; border: none !important;
}
.glass-table :deep(.n-pagination .n-pagination-item:hover) {
  border-color: #f43f5e !important; color: #f43f5e !important;
}

/* ==========================
   弹窗
   ========================== */
.modal-tip {
  display: flex; align-items: flex-start; gap: 8px;
  background: rgba(254, 243, 199, 0.6);
  padding: 12px; border-radius: 8px; color: #b45309; font-size: 13px;
  margin-bottom: 10px;
}
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }

:global(.glass-modal.n-modal) {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(24px) !important;
}
</style>