import type { OperationLogDetail, OperationLogItem, OperationLogStatus } from '@/api/operationLog'
import { useMessage } from 'naive-ui'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchOperationLogDetail,
  fetchOperationLogs,
} from '@/api/operationLog'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'

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

function getQueryString(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value
  return typeof rawValue === 'string' ? rawValue.trim() : ''
}

function getQueryNumber(value: unknown) {
  const rawValue = getQueryString(value)
  if (!rawValue)
    return null

  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getQueryStatus(value: unknown): OperationLogStatus | '' {
  const status = getQueryString(value)
  if (status === 'SUCCESS' || status === 'FAILED' || status === 'PARTIAL')
    return status
  return ''
}

export function useAdminOperationLogs() {
  const message = useMessage()
  const { copyToClipboard } = useCopyToClipboard()
  const route = useRoute()
  const loadError = ref('')
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

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  function applyRouteQueryFilters() {
    filters.traceId = getQueryString(route.query.traceId)
    filters.userId = getQueryNumber(route.query.userId)
    filters.userEmail = getQueryString(route.query.userEmail)
    filters.eventType = getQueryString(route.query.eventType)
    filters.status = getQueryStatus(route.query.status)
    filters.code = getQueryString(route.query.code)
    filters.targetType = getQueryString(route.query.targetType)
    filters.targetId = getQueryString(route.query.targetId)
    filters.startTime = getQueryString(route.query.startTime)
    filters.endTime = getQueryString(route.query.endTime)
    page.value = getQueryNumber(route.query.page) || 1
    pageSize.value = getQueryNumber(route.query.pageSize) || pageSize.value
  }

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
    loadError.value = ''
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
      if (!shouldIgnoreApiError(error)) {
        loadError.value = '加载操作日志失败'
        showApiError(message, error, '加载操作日志失败')
      }
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
    await copyToClipboard(text, { successMessage: '已复制' })
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
        showApiError(message, error, '加载日志详情失败')
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

  watch(() => route.query, () => {
    applyRouteQueryFilters()
    void loadLogs()
  }, { immediate: true })

  return {
    loadError,
    copyText,
    openDetail,
    detail,
    detailLoading,
    detailVisible,
    eventTypeOptions,
    filters,
    formatJson,
    handleSearch,
    list,
    loadLogs,
    loading,
    page,
    pageCount,
    resetFilters,
    statusOptions,
  }
}
