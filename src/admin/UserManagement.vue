<script setup lang="ts">
import { h, onMounted, ref, reactive } from 'vue'
import {
  NButton, NCard, NDataTable, NInput, NSelect, NTag, NSpace, NIcon,
  useMessage, useDialog, NDrawer, NDrawerContent, NDescriptions, NDescriptionsItem, NEmpty
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  SearchOutline,
  RefreshOutline,
  EyeOutline,
  BanOutline,
  CheckmarkCircleOutline,
  PersonOutline,
  KeyOutline
} from '@vicons/ionicons5'
import {
  fetchAdminUserList,
  banUser,
  unbanUser,
  fetchAdminUserDetail,
  type AdminUserItem,
  type AdminUserDetail
} from '@/api/admin'

const message = useMessage()
const dialog = useDialog()

// ==========================
// 1. 列表与搜索逻辑
// ==========================
const loading = ref(false)
const list = ref<AdminUserItem[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  prefix: ({ itemCount }: any) => `共 ${itemCount} 名用户`
})

const searchForm = reactive({
  email: '',
  role: null as number | null,
  status: null as number | null
})

// 角色选项
const roleOptions = [
  { label: '管理员', value: 1 },
  { label: '普通用户', value: 0 }
]
// 状态选项
const statusOptions = [
  { label: '正常', value: 1 },
  { label: '已封禁', value: 0 }
]

// 加载列表
const loadData = async () => {
  loading.value = true
  try {
    const res = await fetchAdminUserList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      email: searchForm.email || undefined,
      role: searchForm.role ?? undefined,
      status: searchForm.status ?? undefined
    })
    list.value = res.data.list
    pagination.itemCount = res.data.total
  } catch (e: any) {
    message.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadData()
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.email = ''
  searchForm.role = null
  searchForm.status = null
  handleSearch()
}

// ==========================
// 2. 表格列定义
// ==========================
const columns: DataTableColumns<AdminUserItem> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '邮箱', key: 'email', width: 200, ellipsis: { tooltip: true } },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render(row) {
      return h(NTag, {
        type: row.role === 1 ? 'error' : 'info',
        bordered: false,
        round: true,
        size: 'small'
      }, { default: () => row.role === 1 ? '管理员' : '用户' })
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      const isBanned = row.status === 0
      return h(NTag, {
        type: isBanned ? 'error' : 'success',
        bordered: false,
        size: 'small'
      }, { default: () => isBanned ? '封禁中' : '正常' })
    }
  },
  { title: '注册 IP', key: 'registerIp', width: 130 },
  { title: '注册时间', key: 'createdAt', width: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          // 查看详情
          h(NButton, {
            size: 'tiny', circle: true, quaternary: true, type: 'primary',
            onClick: () => openDetail(row.id)
          }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),

          // 封禁 / 解封
          row.status === 1
            ? h(NButton, {
                size: 'tiny', circle: true, quaternary: true, type: 'error',
                onClick: () => handleBan(row)
              }, { icon: () => h(NIcon, null, { default: () => h(BanOutline) }) })
            : h(NButton, {
                size: 'tiny', circle: true, quaternary: true, type: 'success',
                onClick: () => handleUnban(row)
              }, { icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }) })
        ]
      })
    }
  }
]

// ==========================
// 3. 封禁/解封逻辑
// ==========================
const handleBan = (row: AdminUserItem) => {
  dialog.error({
    title: '封禁用户',
    content: `确定要封禁「${row.email}」吗？封禁后该用户将无法使用 API。`,
    positiveText: '确认封禁',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await banUser(row.id)
        message.success('已封禁')
        loadData()
      } catch (e: any) {
        message.error(e?.response?.data?.message || '操作失败')
      }
    }
  })
}

const handleUnban = (row: AdminUserItem) => {
  dialog.success({
    title: '解封用户',
    content: `确定要解封「${row.email}」吗？`,
    positiveText: '确认解封',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await unbanUser(row.id)
        message.success('已解封')
        loadData()
      } catch (e: any) {
        message.error('操作失败')
      }
    }
  })
}

// ==========================
// 4. 用户详情抽屉
// ==========================
const showDrawer = ref(false)
const drawerLoading = ref(false)
const userDetail = ref<AdminUserDetail | null>(null)

const openDetail = async (id: number) => {
  showDrawer.value = true
  drawerLoading.value = true
  userDetail.value = null
  try {
    const res = await fetchAdminUserDetail(id)
    userDetail.value = res.data
  } catch (e) {
    message.error('获取详情失败')
  } finally {
    drawerLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">

    <div class="page-header">
      <h2 class="title">用户管理</h2>
      <p class="subtitle">查看注册用户、管理权限与 API Key</p>
    </div>

    <div class="glass-card filter-card">
      <div class="filter-grid">
        <div class="filter-item">
          <n-input v-model:value="searchForm.email" placeholder="搜索邮箱..." clearable @keydown.enter="handleSearch">
            <template #prefix><n-icon><SearchOutline /></n-icon></template>
          </n-input>
        </div>
        <div class="filter-item">
          <n-select v-model:value="searchForm.role" :options="roleOptions" placeholder="角色筛选" clearable />
        </div>
        <div class="filter-item">
          <n-select v-model:value="searchForm.status" :options="statusOptions" placeholder="状态筛选" clearable />
        </div>
        <div class="filter-actions">
          <n-button type="primary" color="#8b5cf6" @click="handleSearch">查询</n-button>
          <n-button quaternary @click="handleReset">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            重置
          </n-button>
        </div>
      </div>
    </div>

    <n-card :bordered="false" class="glass-card table-card">
      <n-data-table
        remote
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
        class="glass-table"
        size="small"
        :row-key="(row) => row.id"
      />
    </n-card>

    <n-drawer v-model:show="showDrawer" :width="500" placement="right">
      <n-drawer-content title="用户详情" closable>
        <div v-if="drawerLoading" class="drawer-loading">
          加载中...
        </div>
        <div v-else-if="userDetail" class="detail-container">

          <div class="detail-section">
            <div class="section-title">
              <n-icon><PersonOutline /></n-icon> 基础信息
            </div>
            <n-descriptions label-placement="left" :column="1" class="desc-list">
              <n-descriptions-item label="用户 ID">{{ userDetail.id }}</n-descriptions-item>
              <n-descriptions-item label="邮箱">{{ userDetail.email }}</n-descriptions-item>
              <n-descriptions-item label="注册时间">{{ userDetail.createdAt }}</n-descriptions-item>
              <n-descriptions-item label="注册 IP">{{ userDetail.registerIp }}</n-descriptions-item>
              <n-descriptions-item label="最后登录">{{ userDetail.lastLoginIp }}</n-descriptions-item>
            </n-descriptions>
          </div>

          <div class="detail-section">
            <div class="section-title">
              <n-icon><KeyOutline /></n-icon> API Keys ({{ userDetail.apiKeys.length }})
            </div>

            <div v-if="userDetail.apiKeys.length === 0" class="empty-keys">
              <n-empty description="该用户暂无 API Key" size="small" />
            </div>

            <div v-else class="key-list">
              <div v-for="key in userDetail.apiKeys" :key="key.id" class="key-item">
                <div class="key-header">
                  <span class="key-name">{{ key.name || '未命名 Key' }}</span>
                  <n-tag size="tiny" :type="key.status === 1 ? 'success' : 'error'" round :bordered="false">
                    {{ key.status === 1 ? '启用' : '禁用' }}
                  </n-tag>
                </div>
                <div class="key-stats">
                  <span>总调用: <strong>{{ key.totalCalls }}</strong></span>
                  <span>今日: <strong>{{ key.callsToday }}</strong> / {{ key.dailyQuota }}</span>
                </div>
                <div class="key-time">创建于: {{ key.createdAt }}</div>
              </div>
            </div>
          </div>

        </div>
      </n-drawer-content>
    </n-drawer>

  </div>
</template>

<style scoped>
/* =================================
   复用全局布局样式
   ================================= */
.page-container {
  display: flex; flex-direction: column; gap: 20px;
}
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

/* 毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  --n-color: transparent !important;
}

/* =================================
   筛选区域样式
   ================================= */
.filter-card { padding: 16px 20px; }
.filter-grid {
  display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
}
.filter-item { width: 200px; }
@media (max-width: 600px) {
  .filter-item { width: 100%; }
}
.filter-actions { display: flex; gap: 12px; margin-left: auto; }


/* =================================
   表格样式透明化 (Copy from ApiKeyList)
   ================================= */
.glass-table :deep(.n-data-table) {
  background-color: transparent !important;
  --n-th-color: rgba(255, 255, 255, 0.3) !important;
  --n-td-color: transparent !important;
  --n-border-color: rgba(0, 0, 0, 0.05) !important;
  --n-td-color-hover: rgba(139, 92, 246, 0.1) !important;
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
  background-color: #8b5cf6 !important; color: #fff !important; border: none !important;
}

/* =================================
   详情抽屉样式
   ================================= */
.drawer-loading { padding: 20px; text-align: center; color: #6b7280; }

.detail-container { display: flex; flex-direction: column; gap: 24px; padding: 4px 0; }

.detail-section { display: flex; flex-direction: column; gap: 12px; }

.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600; color: #1f2937;
  padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;
}

/* API Key 列表项 */
.key-list { display: flex; flex-direction: column; gap: 12px; }

.key-item {
  background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 12px; padding: 12px 16px;
}
.key-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
}
.key-name { font-weight: 600; color: #374151; font-size: 14px; }

.key-stats {
  display: flex; gap: 16px; font-size: 13px; color: #6b7280; margin-bottom: 4px;
}
.key-stats strong { color: #8b5cf6; }

.key-time { font-size: 12px; color: #9ca3af; }
</style>