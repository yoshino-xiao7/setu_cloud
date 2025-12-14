<script setup lang="ts">
import { h, onMounted, onUnmounted, ref, reactive } from 'vue'
import {
  NButton, NDataTable, NInput, NSelect, NTag, NSpace, NIcon,
  useMessage, useDialog, NEmpty, NSpin,
  type DataTableColumns
} from 'naive-ui'
import {
  SearchOutline, RefreshOutline, BanOutline, CheckmarkCircleOutline,
  PersonOutline, KeyOutline, TimeOutline, LaptopOutline, ChevronDown
} from '@vicons/ionicons5'
import {
  fetchAdminUserList, banUser, unbanUser, fetchAdminUserDetail,
  type AdminUserItem, type AdminUserDetail
} from '@/api/admin'

const message = useMessage()
const dialog = useDialog()

// ==========================
// 1. 响应式与基础数据
// ==========================
const isMobile = ref(false)
const checkMobile = () => { isMobile.value = window.innerWidth <= 768 }

const loading = ref(false)
const list = ref<AdminUserItem[]>([])
const pagination = reactive({
  page: 1, pageSize: 10, itemCount: 0,
  prefix: ({ itemCount }: any) => `共 ${itemCount} 人`
})
const searchForm = reactive({ keyword: '', role: null as number | null, status: null as number | null })

// ==========================
// 2. 详情缓存与加载逻辑
// ==========================
const detailsCache = reactive<Record<number, AdminUserDetail>>({})
const detailsLoading = reactive<Record<number, boolean>>({})

const loadDetailData = async (userId: number) => {
  if (detailsCache[userId]) return
  detailsLoading[userId] = true
  try {
    const res = await fetchAdminUserDetail(userId)
    detailsCache[userId] = res.data
  } catch (e) {
    message.error('加载详情失败')
  } finally {
    detailsLoading[userId] = false
  }
}

// ==========================
// 3. PC 表格展开逻辑
// ==========================
const expandedRowKeys = ref<number[]>([])

// ✅ 修复类型报错：接受 (string | number)[]
const handleUpdateExpanded = (keys: (string | number)[]) => {
  expandedRowKeys.value = keys as number[]
  const lastKey = keys[keys.length - 1]
  if (lastKey) {
    loadDetailData(lastKey as number)
  }
}

// ✅ 新增：行属性 (实现点击整行展开)
const rowProps = (row: AdminUserItem) => {
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      // 如果已展开则收起，否则展开当前行 (手风琴模式)
      if (expandedRowKeys.value.includes(row.id)) {
        expandedRowKeys.value = []
      } else {
        expandedRowKeys.value = [row.id]
        loadDetailData(row.id)
      }
    }
  }
}

// ==========================
// 4. 移动端展开逻辑
// ==========================
const mobileExpandedId = ref<number | null>(null)

const toggleMobileExpand = (id: number) => {
  if (mobileExpandedId.value === id) {
    mobileExpandedId.value = null
  } else {
    mobileExpandedId.value = id
    loadDetailData(id)
  }
}

// ==========================
// 5. 数据加载与操作
// ==========================
const loadData = async () => {
  loading.value = true
  expandedRowKeys.value = []
  mobileExpandedId.value = null

  try {
    const res = await fetchAdminUserList({
      page: pagination.page, pageSize: pagination.pageSize,
      email: searchForm.keyword || undefined,
      role: searchForm.role ?? undefined,
      status: searchForm.status ?? undefined
    })
    list.value = res.data.list
    pagination.itemCount = res.data.total
  } catch (e) { message.error('加载失败') }
  finally { loading.value = false }
}

const handlePageChange = (page: number) => { pagination.page = page; loadData() }
const handleSearch = () => { pagination.page = 1; loadData() }
const handleReset = () => { searchForm.keyword = ''; searchForm.role = null; searchForm.status = null; handleSearch() }

const handleBan = (row: AdminUserItem, e?: Event) => {
  e?.stopPropagation()
  dialog.warning({
    title: '封禁确认', content: `确定要封禁「${row.nickname || row.email}」吗？`,
    positiveText: '确认封禁', negativeText: '取消',
    onPositiveClick: async () => { await banUser(row.id); message.success('已封禁'); loadData() }
  })
}
const handleUnban = (row: AdminUserItem, e?: Event) => {
  e?.stopPropagation()
  dialog.success({
    title: '解封确认', content: `确定要解封「${row.nickname || row.email}」吗？`,
    positiveText: '解封',
    onPositiveClick: async () => { await unbanUser(row.id); message.success('已解封'); loadData() }
  })
}

// ==========================
// 6. PC 表格渲染配置 (Render Functions)
// ==========================
const renderExpandedRow = (row: AdminUserItem) => {
  const detail = detailsCache[row.id]
  const isLoading = detailsLoading[row.id]

  // ✅ 加上 slide-in-top 动画类
  if (isLoading) {
    return h('div', { class: 'expand-loading slide-in-top' }, h(NSpin, { size: 'small' }))
  }

  if (!detail) {
    return h('div', { class: 'expand-loading slide-in-top' }, '加载失败')
  }

  const keyNodes = detail.apiKeys.length === 0
    ? h(NEmpty, { description: '该用户暂无 API Key', size: 'small' })
    : h('div', { class: 'expand-key-grid' }, detail.apiKeys.map(k => {
        return h('div', { class: 'mini-key-card' }, [
          h('div', { class: 'key-top' }, [
            h('span', { class: 'k-name' }, k.name),
            h(NTag, { type: k.status === 1 ? 'success' : 'error', size: 'tiny', bordered: false, round: true }, { default: () => k.status === 1 ? '启用' : '禁用' })
          ]),
          h('div', { class: 'key-info' }, `调用: ${k.totalCalls} | 限额: ${k.dailyQuota}`)
        ])
      }))

  // ✅ 最外层加上 slide-in-top 动画类
  return h('div', { class: 'expand-container slide-in-top' }, [
    h('div', { class: 'expand-section info-section' }, [
      h('div', { class: 'sec-title' }, [ h(NIcon, null, {default:()=>h(PersonOutline)}), ' 详细信息' ]),
      h('div', { class: 'info-grid' }, [
        h('div', { class: 'info-cell' }, [ h('span', 'ID'), h('strong', detail.id) ]),
        h('div', { class: 'info-cell' }, [ h('span', '注册IP'), h('strong', detail.registerIp || '-') ]),
        h('div', { class: 'info-cell' }, [ h('span', '最后登录'), h('strong', detail.lastLoginIp || '-') ]),
        h('div', { class: 'info-cell' }, [ h('span', '注册时间'), h('strong', detail.createdAt) ]),
      ])
    ]),
    h('div', { class: 'expand-section key-section' }, [
      h('div', { class: 'sec-title' }, [ h(NIcon, null, {default:()=>h(KeyOutline)}), ` API Keys (${detail.apiKeys.length})` ]),
      keyNodes
    ])
  ])
}

const columns: DataTableColumns<AdminUserItem> = [
  { type: 'expand', renderExpand: renderExpandedRow },
  { title: 'ID', key: 'id', width: 60, align: 'center' },
  {
    title: '用户', key: 'email', width: 200,
    render(row) {
      return h('div', { class: 'user-col' }, [
        h('span', { class: 'u-nick' }, row.nickname || '-'),
        h('span', { class: 'u-email' }, row.email)
      ])
    }
  },
  {
    title: '角色', key: 'role', width: 100, align: 'center',
    render(row) {
      return h(NTag, { type: row.role === 1 ? 'error' : 'info', bordered: false, round: true, size: 'small' }, { default: () => row.role === 1 ? '管理员' : '用户' })
    }
  },
  {
    title: '状态', key: 'status', width: 90, align: 'center',
    render(row) {
      return h(NTag, { type: row.status === 0 ? 'error' : 'success', bordered: false, size: 'small' }, { default: () => row.status === 0 ? '封禁' : '正常' })
    }
  },
  { title: '注册时间', key: 'createdAt', width: 160, render: (row) => row.createdAt?.split(' ')[0] },
  {
    title: '操作', key: 'actions', width: 100, fixed: 'right', align: 'center',
    render(row) {
      return h(NSpace, { justify: 'center' }, { default: () => [
        row.status === 1
          ? h(NButton, { size: 'tiny', text: true, type: 'error', onClick: (e) => handleBan(row, e) }, { icon: () => h(NIcon, null, { default: () => h(BanOutline) }), default: () => '封禁' })
          : h(NButton, { size: 'tiny', text: true, type: 'success', onClick: (e) => handleUnban(row, e) }, { icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }), default: () => '解封' })
      ]})
    }
  }
]

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadData()
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="title">用户管理</h2>
      <p class="subtitle">管理注册用户、权限与状态</p>
    </div>

    <div class="glass-card filter-card">
      <div class="filter-grid">
        <div class="filter-item search-input">
          <n-input v-model:value="searchForm.keyword" placeholder="搜邮箱 / 昵称" clearable @keydown.enter="handleSearch">
            <template #prefix><n-icon><SearchOutline /></n-icon></template>
          </n-input>
        </div>
        <div class="filter-item select-box">
          <n-select v-model:value="searchForm.role" :options="[{label:'管理员',value:1},{label:'用户',value:0}]" placeholder="角色" clearable />
        </div>
        <div class="filter-item select-box">
          <n-select v-model:value="searchForm.status" :options="[{label:'正常',value:1},{label:'封禁',value:0}]" placeholder="状态" clearable />
        </div>
        <div class="filter-actions">
          <n-button type="primary" color="#8b5cf6" @click="handleSearch">查询</n-button>
          <n-button quaternary @click="handleReset"><template #icon><n-icon><RefreshOutline /></n-icon></template></n-button>
        </div>
      </div>
    </div>

    <div v-if="!isMobile" class="glass-card table-wrapper">
      <n-data-table
        remote
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row) => row.id"
        :expanded-row-keys="expandedRowKeys"
        :row-props="rowProps"
        @update:expanded-row-keys="handleUpdateExpanded"
        @update:page="handlePageChange"
        class="glass-table"
        size="large"
      />
    </div>

    <div v-else class="mobile-list">
      <div v-if="loading && list.length===0" class="loading-state"><n-spin /></div>
      <div v-else-if="list.length === 0" class="empty-state"><n-empty description="没有找到用户" /></div>

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
                <n-tag size="tiny" :type="row.status===1?'success':'error'" round :bordered="false">
                  {{ row.status===1?'正常':'封禁' }}
                </n-tag>
              </div>
              <div class="email">{{ row.email }}</div>
            </div>
            <div class="card-right">
              <n-icon class="expand-icon" :class="{ 'rotate': mobileExpandedId === row.id }">
                <ChevronDown />
              </n-icon>
            </div>
          </div>

          <div class="card-expand-area" v-if="mobileExpandedId === row.id" @click.stop>
            <div class="divider"></div>

            <div v-if="detailsLoading[row.id]" class="p-4 text-center"><n-spin size="small"/></div>
            <div v-else-if="detailsCache[row.id]" class="detail-content">

              <div class="action-bar">
                <div class="info-tag">ID: {{ row.id }}</div>
                <div class="info-tag">{{ row.role===1?'管理员':'普通用户' }}</div>
                <n-button
                  size="tiny" :type="row.status===1?'error':'success'" secondary
                  class="ml-auto" @click="row.status===1?handleBan(row):handleUnban(row)"
                >
                  {{ row.status===1?'封禁用户':'解封用户' }}
                </n-button>
              </div>

              <div class="info-grid-mobile">
                <div class="info-i">
                  <n-icon><LaptopOutline/></n-icon> {{ detailsCache[row.id]?.registerIp || '未知IP' }}
                </div>
                <div class="info-i">
                  <n-icon><TimeOutline/></n-icon> {{ detailsCache[row.id]?.createdAt?.split(' ')[0] }}
                </div>
              </div>

              <div class="key-section-mobile">
                <div class="sec-head">API Keys</div>
                <div v-if="detailsCache[row.id]?.apiKeys?.length === 0" class="text-xs text-gray-400">无 API Key</div>
                <div v-else class="key-list-mobile">
                  <div v-for="k in (detailsCache[row.id]?.apiKeys || [])" :key="k.id" class="m-key-item">
                     <div class="flex justify-between">
                       <span class="font-bold">{{ k.name }}</span>
                       <span :class="k.status===1?'text-green-500':'text-red-500'">{{ k.status===1?'●':'●' }}</span>
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

      <div class="mobile-pagination" v-if="list.length > 0">
         <n-button size="small" :disabled="pagination.page <= 1" @click="handlePageChange(pagination.page - 1)">上一页</n-button>
         <span>{{ pagination.page }}</span>
         <n-button size="small" :disabled="list.length < pagination.pageSize" @click="handlePageChange(pagination.page + 1)">下一页</n-button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 全局布局复用 */
.page-container { display: flex; flex-direction: column; gap: 20px; padding-bottom: 60px; }
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

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
  background-color: rgba(139, 92, 246, 0.08) !important;
}

/* 用户列样式 */
:deep(.user-col) { display: flex; flex-direction: column; line-height: 1.4; }
:deep(.u-nick) { font-weight: 700; color: #374151; }
:deep(.u-email) { font-size: 12px; color: #9ca3af; }

/* === PC 展开详情区域样式 (Global/Deep) === */
:deep(.expand-container) {
  display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px;
  padding: 20px 24px;
  background: rgba(249, 250, 251, 0.5); /* 展开区域稍深一点 */
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.02); /* 内阴影 */
}
:deep(.expand-loading) { padding: 20px; display: flex; justify-content: center; color: #9ca3af; }
:deep(.expand-section) { display: flex; flex-direction: column; gap: 12px; }
:deep(.sec-title) { font-size: 14px; font-weight: 700; color: #6b7280; display: flex; align-items: center; gap: 6px; }

:deep(.info-grid) { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
:deep(.info-cell) { display: flex; flex-direction: column; font-size: 13px; }
:deep(.info-cell span) { color: #9ca3af; font-size: 12px; }
:deep(.info-cell strong) { color: #374151; font-weight: 600; }

:deep(.expand-key-grid) { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
:deep(.mini-key-card) {
  background: #fff; border: 1px solid rgba(0,0,0,0.05); border-radius: 8px;
  padding: 8px 12px; display: flex; flex-direction: column; gap: 4px;
}
:deep(.key-top) { display: flex; justify-content: space-between; align-items: center; }
:deep(.k-name) { font-weight: 700; font-size: 13px; color: #4b5563; }
:deep(.key-info) { font-size: 11px; color: #9ca3af; }

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
  border-color: #8b5cf6;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
}

.card-main {
  padding: 16px;
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer;
}
.card-left { display: flex; flex-direction: column; gap: 4px; }
.nick-row { display: flex; align-items: center; gap: 8px; }
.nick { font-weight: 700; font-size: 15px; color: #1f2937; }
.email { font-size: 12px; color: #6b7280; }

.expand-icon { color: #9ca3af; transition: transform 0.3s; }
.rotate { transform: rotate(180deg); color: #8b5cf6; }

/* 展开区域 */
.card-expand-area {
  background: rgba(249, 250, 251, 0.6);
  border-top: 1px solid rgba(0,0,0,0.05);
  padding: 16px;
  animation: slideDown 0.3s ease;
}
/* 复用上面的动画 */

.detail-content { display: flex; flex-direction: column; gap: 12px; }
.action-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.info-tag { font-size: 12px; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; color: #6b7280; }
.ml-auto { margin-left: auto; }

.info-grid-mobile { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #4b5563; }
.info-i { display: flex; align-items: center; gap: 4px; }

.key-section-mobile { margin-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px; }
.sec-head { font-size: 12px; font-weight: 700; color: #9ca3af; margin-bottom: 6px; }
.key-list-mobile { display: flex; flex-direction: column; gap: 8px; }
.m-key-item { background: #fff; padding: 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.05); font-size: 13px; }

.mobile-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 10px; color: #6b7280; font-size: 13px; }
</style>