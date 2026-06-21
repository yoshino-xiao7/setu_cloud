<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { OperationLogDetail, OperationLogItem, OperationLogStatus } from '@/api/operationLog'
import {
  CopyOutline,
  EyeOutline,
  RefreshOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NDataTable,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  fetchOperationLogDetail,
  fetchOperationLogs,
} from '@/api/operationLog'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const detail = ref<OperationLogDetail | null>(null)
const list = ref<OperationLogItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  traceId: '',
  userId: null as number | null,
  userEmail: '',
  eventType: '',
  status: '' as OperationLogStatus | '',
  code: '',
  targetType: '',
  targetId: '',
  startTime: '',
  endTime: '',
})

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '部分成功', value: 'PARTIAL' },
]

const eventTypeOptions = [
  { label: '全部事件', value: '' },
  'GALLERY_UPLOAD_BATCH_CREATE',
  'GALLERY_UPLOAD_FILE_SIGN',
  'GALLERY_UPLOAD_FILE_COMPLETE',
  'GALLERY_UPLOAD_COMPLETE',
  'GALLERY_UPLOAD_RECOVER',
  'IMAGE_AUDIT_SUBMIT',
  'IMAGE_AUDIT_BATCH_SUBMIT',
  'IMAGE_DELETE_REQUEST_SUBMIT',
  'IMAGE_DELETE_REVIEW',
  'IMAGE_DELETE_BATCH_REVIEW',
  'IMAGE_AVAILABILITY_CHECK',
  'DOWNLOAD_SIGN',
  'USER_NOTIFICATION_CREATE',
].map(item => typeof item === 'string' ? { label: item, value: item } : item)

const statusTagType: Record<OperationLogStatus, 'success' | 'error' | 'warning'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  PARTIAL: 'warning',
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function buildQuery() {
  return {
    page: page.value,
    pageSize: pageSize.value,
    traceId: filters.traceId.trim() || undefined,
    userId: filters.userId ?? undefined,
    userEmail: filters.userEmail.trim() || undefined,
    eventType: filters.eventType || undefined,
    status: filters.status || undefined,
    code: filters.code.trim() || undefined,
    targetType: filters.targetType.trim() || undefined,
    targetId: filters.targetId.trim() || undefined,
    startTime: filters.startTime.trim() || undefined,
    endTime: filters.endTime.trim() || undefined,
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const data = unwrapApiData(await fetchOperationLogs(buildQuery()), {
      total: 0,
      page: page.value,
      pageSize: pageSize.value,
      list: [],
    })
    list.value = data.list || []
    total.value = data.total || 0
    page.value = data.page || page.value
    pageSize.value = data.pageSize || pageSize.value
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '加载操作日志失败'))
  }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  void loadLogs()
}

function resetFilters() {
  filters.traceId = ''
  filters.userId = null
  filters.userEmail = ''
  filters.eventType = ''
  filters.status = ''
  filters.code = ''
  filters.targetType = ''
  filters.targetId = ''
  filters.startTime = ''
  filters.endTime = ''
  handleSearch()
}

async function copyText(text?: string | null) {
  if (!text)
    return
  await navigator.clipboard.writeText(text)
  message.success('已复制')
}

async function openDetail(row: OperationLogItem) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = unwrapApiData(await fetchOperationLogDetail(row.id), null)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '加载日志详情失败'))
  }
  finally {
    detailLoading.value = false
  }
}

function formatJson(value: unknown) {
  if (value === null || value === undefined || value === '')
    return '-'
  if (typeof value === 'string')
    return value
  return JSON.stringify(value, null, 2)
}

const columns: DataTableColumns<OperationLogItem> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 170,
    render: row => formatDate(row.createdAt),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: row => h(NTag, {
      type: statusTagType[row.status],
      bordered: false,
      size: 'small',
    }, { default: () => row.status }),
  },
  {
    title: '事件',
    key: 'eventType',
    minWidth: 220,
    ellipsis: { tooltip: true },
  },
  {
    title: '用户',
    key: 'userEmail',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: row => row.userEmail || (row.userId ? `用户 #${row.userId}` : '-'),
  },
  {
    title: '目标',
    key: 'target',
    minWidth: 160,
    ellipsis: { tooltip: true },
    render: row => row.targetType || row.targetId ? `${row.targetType || '-'} / ${row.targetId || '-'}` : '-',
  },
  {
    title: 'Trace',
    key: 'traceId',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render(row) {
      if (!row.traceId)
        return '-'
      return h(NSpace, { size: 4, align: 'center', wrap: false }, {
        default: () => [
          h('span', row.traceId),
          h(NButton, {
            text: true,
            size: 'tiny',
            onClick: () => copyText(row.traceId),
          }, { icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) }),
        ],
      })
    },
  },
  {
    title: '耗时',
    key: 'durationMs',
    width: 90,
    render: row => row.durationMs == null ? '-' : `${row.durationMs}ms`,
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 90,
    render(row) {
      return h(NButton, {
        size: 'small',
        tertiary: true,
        onClick: () => openDetail(row),
      }, {
        icon: () => h(NIcon, null, { default: () => h(EyeOutline) }),
        default: () => '详情',
      })
    },
  },
]

onMounted(() => {
  void loadLogs()
})
</script>

<template>
  <div class="operation-log-page">
    <div class="page-header">
      <div>
        <h2>操作日志</h2>
        <p>通过 traceId、用户、事件和目标对象定位后台与投稿链路问题</p>
      </div>
      <NButton :loading="loading" @click="loadLogs">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard :bordered="false" class="filter-card">
      <div class="filter-grid">
        <NInput v-model:value="filters.traceId" placeholder="traceId" clearable @keyup.enter="handleSearch" />
        <NInputNumber v-model:value="filters.userId" placeholder="用户 ID" :precision="0" :min="1" :show-button="false" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.userEmail" placeholder="用户邮箱" clearable @keyup.enter="handleSearch" />
        <NSelect v-model:value="filters.eventType" :options="eventTypeOptions" filterable />
        <NSelect v-model:value="filters.status" :options="statusOptions" />
        <NInput v-model:value="filters.code" placeholder="业务 code" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.targetType" placeholder="目标类型" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.targetId" placeholder="目标 ID" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.startTime" placeholder="开始时间 2026-06-21 00:00:00" clearable @keyup.enter="handleSearch" />
        <NInput v-model:value="filters.endTime" placeholder="结束时间 2026-06-21 23:59:59" clearable @keyup.enter="handleSearch" />
      </div>
      <div class="filter-actions">
        <NButton type="primary" :loading="loading" @click="handleSearch">
          <template #icon>
            <NIcon><SearchOutline /></NIcon>
          </template>
          查询
        </NButton>
        <NButton :disabled="loading" @click="resetFilters">
          重置
        </NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="table-card">
      <NDataTable
        :columns="columns"
        :data="list"
        :loading="loading"
        :bordered="false"
        :scroll-x="1320"
        remote
      />
      <div class="pagination-wrap">
        <NPagination
          v-model:page="page"
          :page-count="pageCount"
          @update:page="loadLogs"
        />
      </div>
    </NCard>

    <NModal v-model:show="detailVisible">
      <NCard class="detail-card" :bordered="false" title="日志详情">
        <NSpin :show="detailLoading">
          <div v-if="detail" class="detail-grid">
            <div><span>日志 ID</span><strong>{{ detail.id }}</strong></div>
            <div><span>事件</span><strong>{{ detail.eventType }}</strong></div>
            <div><span>状态</span><strong>{{ detail.status }}</strong></div>
            <div><span>用户</span><strong>{{ detail.userEmail || detail.userId || '-' }}</strong></div>
            <div><span>目标</span><strong>{{ detail.targetType || '-' }} / {{ detail.targetId || '-' }}</strong></div>
            <div><span>路径</span><strong>{{ detail.method || '-' }} {{ detail.path || '-' }}</strong></div>
            <div><span>Trace ID</span><strong>{{ detail.traceId || '-' }}</strong></div>
            <div><span>Request ID</span><strong>{{ detail.requestId || '-' }}</strong></div>
          </div>
          <pre v-if="detail" class="json-block">{{ formatJson({ requestBody: detail.requestBody, responseBody: detail.responseBody, extra: detail.extra, message: detail.message }) }}</pre>
        </NSpin>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.operation-log-page {
  padding: 24px;
  max-width: 1440px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 6px;
  color: #1f2937;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.filter-card,
.table-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.filter-card {
  margin-bottom: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 12px;
}

.filter-actions,
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.detail-card {
  width: min(920px, 94vw);
  max-height: 86vh;
  overflow: auto;
  border-radius: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-grid div {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.9);
}

.detail-grid span {
  color: #64748b;
  font-size: 12px;
}

.detail-grid strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: #1f2937;
}

.json-block {
  margin: 14px 0 0;
  padding: 12px;
  overflow: auto;
  border-radius: 8px;
  color: #334155;
  background: #f8fafc;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .operation-log-page {
    padding: 16px;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
