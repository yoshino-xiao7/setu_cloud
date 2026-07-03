import type { DataTableColumns, PaginationProps } from 'naive-ui'
import type { KeyState, OverviewData, UsageLogItem, UsageLogsPayload } from '@/api/dashboard'
import { useMessage } from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchMyApiKeys } from '@/api/apiKey'
import { fetchUsageLogs, fetchUsageOverview, normalizeUsageLogsResponse } from '@/api/dashboard'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'
import { safePush } from '@/utils/navigation'

export function useUserDashboard() {
  const router = useRouter()
  const message = useMessage()

  const keyState = reactive<KeyState>({
    count: 0,
    limit: 10,
    loading: false,
  })
  const keyError = ref('')

  const overview = reactive<OverviewData & { loading: boolean }>({
    totalCalls: 0,
    todayCalls: 0,
    lastCalledAt: null,
    loading: false,
  })
  const overviewError = ref('')

  const tableState = reactive({
    loading: false,
    data: [] as UsageLogItem[],
  })
  const logsError = ref('')

  const pagination = reactive<PaginationProps>({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    prefix: info => `共 ${info.itemCount} 条`,
  })

  const keyUsagePercent = computed(() => {
    if (keyState.limit <= 0)
      return 0
    const raw = (keyState.count / keyState.limit) * 100
    return Math.round(Math.min(Math.max(raw, 0), 100))
  })

  const keyProgressColor = computed(() => {
    const used = keyState.count
    if (used < 5)
      return '#f586a9'
    if (used < 8)
      return '#ec4899'
    return '#ef4444'
  })

  const columns: DataTableColumns<UsageLogItem> = [
    { title: '时间', key: 'timestamp', width: 160, ellipsis: { tooltip: true }, render: row => formatDate(row.timestamp) },
    {
      title: '请求路径',
      key: 'endpoint',
      ellipsis: { tooltip: true },
      render: row => h('span', { style: 'font-family: monospace;' }, row.endpoint),
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render(row) {
        const isSuccess = row.status >= 200 && row.status < 300
        return h(
          'span',
          {
            style: {
              color: isSuccess ? '#10b981' : '#ef4444',
              fontWeight: '600',
              background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            },
          },
          row.status,
        )
      },
    },
    { title: 'IP', key: 'ip', width: 130, ellipsis: { tooltip: true } },
  ]

  function goToApiKeys() {
    void safePush(router, '/dashboard/api-keys')
  }

  async function fetchKeyStats() {
    keyState.loading = true
    keyError.value = ''
    try {
      const list = await fetchMyApiKeys()
      keyState.count = list.length
      // 后端如果返回配额上限，统一在这里同步 keyState.limit。
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      keyError.value = getApiErrorMessage(e, 'Key 配额加载失败')
    }
    finally {
      keyState.loading = false
    }
  }

  async function fetchOverview() {
    overview.loading = true
    overviewError.value = ''
    try {
      const res = await fetchUsageOverview()
      const data = unwrapApiData<Partial<OverviewData>>(res, {})
      overview.totalCalls = data.totalCalls ?? 0
      overview.todayCalls = data.todayCalls ?? 0
      overview.lastCalledAt = data.lastCalledAt || null
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      overviewError.value = getApiErrorMessage(e, '调用概览加载失败')
    }
    finally {
      overview.loading = false
    }
  }

  async function fetchLogs() {
    tableState.loading = true
    logsError.value = ''
    try {
      const res = await fetchUsageLogs({ page: pagination.page!, limit: pagination.pageSize! })
      const raw = unwrapApiData<UsageLogItem[] | UsageLogsPayload>(res, [])
      const { list, total } = normalizeUsageLogsResponse(raw)

      tableState.data = list
      pagination.itemCount = total
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      logsError.value = getApiErrorMessage(e, '日志加载失败')
      showApiError(message, e, '日志加载失败')
    }
    finally {
      tableState.loading = false
    }
  }

  function handlePageChange(page: number) {
    pagination.page = page
    void fetchLogs()
  }

  function handlePageSizeChange(size: number) {
    pagination.pageSize = size
    pagination.page = 1
    void fetchLogs()
  }

  function refreshLogs() {
    pagination.page = 1
    void fetchLogs()
  }

  onMounted(() => {
    void fetchKeyStats()
    void fetchOverview()
    void fetchLogs()
  })

  return {
    columns,
    formatDate,
    goToApiKeys,
    handlePageChange,
    handlePageSizeChange,
    keyError,
    keyProgressColor,
    keyState,
    keyUsagePercent,
    logsError,
    overview,
    overviewError,
    pagination,
    refreshLogs,
    tableState,
  }
}
