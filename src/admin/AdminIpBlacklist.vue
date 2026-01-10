<script setup lang="ts">
import { h, onMounted, onUnmounted, ref, reactive, computed } from 'vue'
import {
  NButton, NCard, NDataTable, NInput, NModal, NForm, NFormItem, NIcon,
  useMessage, useDialog, NTag, NEmpty, NSpin, NTooltip, NBadge
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import {
  AddOutline, TrashOutline, TimeOutline, AlertCircleOutline,
  SearchOutline, RefreshOutline, CheckmarkCircleOutline,
  BanOutline, GlobeOutline, WarningOutline
} from '@vicons/ionicons5'
import {
  fetchIpBlacklist, addIpBlacklist, removeIpBlacklist, type BlacklistIpItem,
  fetchTempBlockList, clearAllTempBlocks, clearTempBlock, type TempBlockItem
} from '@/api/admin'

const message = useMessage()
const dialog = useDialog()

// ==========================
// 1. 响应式与设备检测
// ==========================
const isMobile = ref(false)
const checkMobile = () => { isMobile.value = window.innerWidth <= 768 }

// ==========================
// 2. 数据加载与筛选
// ==========================
const loading = ref(false)
const fullList = ref<BlacklistIpItem[]>([])
const searchText = ref('')
const checkedRowKeys = ref<DataTableRowKey[]>([])

// 前端过滤逻辑
const filteredList = computed(() => {
  if (!searchText.value) return fullList.value
  const lowerText = searchText.value.toLowerCase()
  return fullList.value.filter(item =>
    item.ip.includes(lowerText) ||
    (item.reason && item.reason.toLowerCase().includes(lowerText))
  )
})

const pagination = reactive({
  page: 1, pageSize: 10,
  prefix: ({ itemCount }: any) => `共 ${itemCount} 条`
})

const loadData = async () => {
  loading.value = true
  checkedRowKeys.value = []
  try {
    const res = await fetchIpBlacklist()
    // 兼容后端可能返回 List 或 PageResult
    fullList.value = Array.isArray(res) ? res : ((res as any).data || [])
    pagination.page = 1
  } catch (e) {
    message.error('加载黑名单失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => { searchText.value = '' }

// ==========================
// 2.5 临时封禁数据
// ==========================
const tempBlockList = ref<TempBlockItem[]>([])
const tempBlockLoading = ref(false)

const loadTempBlocks = async () => {
  tempBlockLoading.value = true
  try {
    const res = await fetchTempBlockList()
    tempBlockList.value = Array.isArray(res) ? res : ((res as any).data || [])
  } catch (e) {
    // 静默失败，可能接口不可用
    tempBlockList.value = []
  } finally {
    tempBlockLoading.value = false
  }
}

const handleClearTempBlock = (ip: string) => {
  dialog.warning({
    title: '解除确认',
    content: `确定解除 IP「${ip}」的临时封禁吗？`,
    positiveText: '解除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await clearTempBlock(ip)
        message.success('已解除临时封禁')
        loadTempBlocks()
      } catch (e) { message.error('操作失败') }
    }
  })
}

const handleClearAllTempBlocks = () => {
  if (tempBlockList.value.length === 0) return
  dialog.warning({
    title: '清空确认',
    content: `确定清除所有 ${tempBlockList.value.length} 个临时封禁吗？`,
    positiveText: '全部清除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await clearAllTempBlocks()
        message.success('已清除所有临时封禁')
        loadTempBlocks()
      } catch (e) { message.error('操作失败') }
    }
  })
}

// ==========================
// 3. PC 表格列定义
// ==========================
const columns: DataTableColumns<BlacklistIpItem> = [
  { type: 'selection' },
  {
    title: '被封禁 IP',
    key: 'ip',
    width: 180,
    render(row) {
      return h(NTag, { type: 'error', bordered: false, style: { fontFamily: 'monospace' } }, {
        default: () => row.ip,
        icon: () => h(NIcon, null, { default: () => h(GlobeOutline) })
      })
    }
  },
  {
    title: '封禁原因',
    key: 'reason',
    render(row) {
      return row.reason
        ? h('span', { class: 'text-gray' }, row.reason)
        : h('span', { class: 'text-light-gray' }, '未填写原因')
    }
  },
  {
    title: '封禁时间',
    key: 'createdAt',
    width: 200,
    render(row) {
      if (!row.createdAt) return '-'
      return h('div', { class: 'flex-center text-sm text-gray-500' }, [
        h(NIcon, { class: 'mr-1' }, { default: () => h(TimeOutline) }),
        row.createdAt
      ])
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render(row) {
      return h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h(NButton, {
          size: 'small', circle: true, type: 'error', quaternary: true,
          onClick: () => handleRemove(row)
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
        default: () => '移除该 IP'
      })
    }
  }
]

// ==========================
// 4. 操作逻辑 (添加/移除)
// ==========================
const showAddModal = ref(false)
const addLoading = ref(false)
const formRef = ref()
const formModel = reactive({ ips: '', reason: '' })

const openAddModal = () => {
  formModel.ips = ''
  formModel.reason = ''
  showAddModal.value = true
}

const handleAdd = () => {
  formRef.value?.validate(async (errors: any) => {
    if (!errors) {
      const ipList = formModel.ips.split(/[\n,]+/).map(ip => ip.trim()).filter(ip => ip.length > 0)
      if (ipList.length === 0) return message.warning('请输入有效的 IP')

      addLoading.value = true
      try {
        await Promise.all(ipList.map(ip => addIpBlacklist(ip, formModel.reason)))
        message.success(`已封禁 ${ipList.length} 个 IP`)
        showAddModal.value = false
        loadData()
      } catch (e) { message.error('操作失败') }
      finally { addLoading.value = false }
    }
  })
}

const handleRemove = (row: BlacklistIpItem) => {
  dialog.warning({
    title: '移除确认',
    content: `确定解封 IP「${row.ip}」吗？`,
    positiveText: '移除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await removeIpBlacklist(row.ip)
        message.success('已移除')
        loadData()
      } catch (e) { message.error('移除失败') }
    }
  })
}

const batchRemoveLoading = ref(false)
const handleBatchRemove = () => {
  const count = checkedRowKeys.value.length
  if (count === 0) return
  dialog.warning({
    title: '批量解封',
    content: `确定移除选中的 ${count} 个 IP 吗？`,
    positiveText: `确定移除 (${count})`,
    onPositiveClick: async () => {
      batchRemoveLoading.value = true
      try {
        await Promise.all(checkedRowKeys.value.map(ip => removeIpBlacklist(ip as string)))
        message.success(`成功移除 ${count} 个 IP`)
        loadData()
      } catch (e) { message.error('部分移除失败') }
      finally { batchRemoveLoading.value = false }
    }
  })
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadData()
  loadTempBlocks()
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))
</script>

<template>
  <div class="page-container">

    <div class="page-header">
      <div>
        <h2 class="title">IP 黑名单</h2>
        <p class="subtitle">拦截恶意请求，维护系统安全</p>
      </div>
      <n-button type="error" class="add-btn" @click="openAddModal">
        <template #icon><n-icon><BanOutline /></n-icon></template>
        {{ isMobile ? '封禁' : '添加封禁' }}
      </n-button>
    </div>

    <div class="glass-card toolbar">
      <div class="search-box">
        <n-input v-model:value="searchText" placeholder="搜索 IP 或原因..." clearable round>
          <template #prefix><n-icon class="text-gray-400"><SearchOutline /></n-icon></template>
        </n-input>
      </div>

      <div class="actions-box">
        <n-button quaternary circle @click="loadData">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
        </n-button>

        <transition name="scale">
          <n-badge :value="checkedRowKeys.length" v-if="checkedRowKeys.length > 0">
            <n-button type="warning" size="small" secondary @click="handleBatchRemove" :loading="batchRemoveLoading">
              批量解封
            </n-button>
          </n-badge>
        </transition>
      </div>
    </div>

    <div v-if="!isMobile" class="glass-card table-wrapper">
      <n-data-table
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
      <div v-if="loading && filteredList.length === 0" class="p-8 text-center"><n-spin /></div>
      <div v-else-if="filteredList.length === 0" class="empty-state"><n-empty description="暂无封禁记录" /></div>

      <transition-group name="list" tag="div" class="card-grid">
        <div v-for="item in filteredList" :key="item.ip" class="glass-card mobile-card">
          <div class="card-header">
            <div class="ip-tag">
              <n-icon><GlobeOutline /></n-icon>
              <span>{{ item.ip }}</span>
            </div>
            <n-button size="tiny" circle type="error" secondary @click="handleRemove(item)">
              <template #icon><n-icon><TrashOutline /></n-icon></template>
            </n-button>
          </div>

          <div class="card-body">
            <div class="reason-row">
              <n-icon class="icon-warn"><WarningOutline /></n-icon>
              <span>{{ item.reason || '无封禁原因' }}</span>
            </div>
            <div class="time-row">
              <n-icon><TimeOutline /></n-icon>
              <span>{{ item.createdAt || '未知时间' }}</span>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- ======================== -->
    <!-- 临时封禁列表 -->
    <!-- ======================== -->
    <div class="section-header">
      <div>
        <h3 class="section-title">临时封禁</h3>
        <p class="section-subtitle">因频繁请求被自动封禁的 IP（自动过期）</p>
      </div>
      <n-button 
        v-if="tempBlockList.length > 0" 
        type="warning" 
        size="small" 
        secondary 
        @click="handleClearAllTempBlocks"
      >
        <template #icon><n-icon><TrashOutline /></n-icon></template>
        全部清除
      </n-button>
    </div>

    <div class="glass-card temp-block-wrapper">
      <n-spin :show="tempBlockLoading">
        <div v-if="tempBlockList.length === 0" class="empty-state-inline">
          <n-empty description="暂无临时封禁" size="small" />
        </div>
        <div v-else class="temp-block-grid">
          <div v-for="item in tempBlockList" :key="item.ip" class="temp-block-item">
            <div class="temp-ip">
              <n-icon class="ip-icon"><GlobeOutline /></n-icon>
              <span>{{ item.ip }}</span>
            </div>
            <div class="temp-info" v-if="item.reason">
              <span class="text-gray-500">{{ item.reason }}</span>
            </div>
            <n-button size="tiny" circle type="warning" quaternary @click="handleClearTempBlock(item.ip)">
              <template #icon><n-icon><TrashOutline /></n-icon></template>
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>

    <n-modal v-model:show="showAddModal" preset="card" title="添加封禁" class="glass-modal" :style="{ maxWidth: '500px' }">
      <div class="modal-tip">
        <n-icon color="#d97706"><AlertCircleOutline /></n-icon>
        <div>支持批量输入，多个 IP 请换行分隔。</div>
      </div>
      <n-form ref="formRef" :model="formModel">
        <n-form-item label="IP 列表" path="ips" :rule="{ required: true, message: '不能为空' }">
          <n-input v-model:value="formModel.ips" type="textarea" placeholder="例如：192.168.1.1&#10;10.0.0.1" :rows="5" />
        </n-form-item>
        <n-form-item label="封禁原因" path="reason" :rule="{ required: true, message: '不能为空' }">
          <n-input v-model:value="formModel.reason" placeholder="例如：恶意扫描" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddModal=false" quaternary>取消</n-button>
          <n-button type="error" :loading="addLoading" @click="handleAdd">确认封禁</n-button>
        </div>
      </template>
    </n-modal>

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
   毛玻璃卡片基类
   ======================== */
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

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
.time-row { color: #9ca3af; font-size: 12px; }

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
  color: #9ca3af;
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