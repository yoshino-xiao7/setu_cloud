import type { ImageDeleteRequestDetail, ImageDeleteRequestItem, PageResult } from '@/api/imageDeleteRequest'
import { useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import {
  batchReviewDeleteRequests,
  fetchAdminDeleteRequestDetail,
  fetchAdminDeleteRequestList,
  REQUEST_STATUS,
  reviewDeleteRequest,
  STATUS_CONFIG,
} from '@/api/imageDeleteRequest'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useRequestGuard } from '@/composables/useRequestGuard'

const imageFallbackSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22240%22%20height%3D%22240%22%20viewBox%3D%220%200%20240%20240%22%3E%3Crect%20width%3D%22240%22%20height%3D%22240%22%20rx%3D%2216%22%20fill%3D%22%23f1f5f9%22/%3E%3Cpath%20d%3D%22M66%20162l36-42%2027%2030%2018-21%2027%2033H66z%22%20fill%3D%22%23cbd5e1%22/%3E%3Ccircle%20cx%3D%2294%22%20cy%3D%2288%22%20r%3D%2217%22%20fill%3D%22%23cbd5e1%22/%3E%3C/svg%3E'

export function useAdminImageDeleteRequests() {
  const message = useMessage()
  const dialog = useDialog()
  const listGuard = useRequestGuard()
  const detailGuard = useRequestGuard()
  const detailCache = new Map<number, ImageDeleteRequestDetail>()

  const loading = ref(false)
  const list = shallowRef<ImageDeleteRequestItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const statusFilter = ref<number | undefined>(undefined)
  const selectedRequestIds = ref<number[]>([])
  const bulkReviewLoading = ref(false)

  const statusOptions = [
    { label: '全部', value: undefined },
    { label: '待审核', value: REQUEST_STATUS.PENDING },
    { label: '已批准', value: REQUEST_STATUS.APPROVED },
    { label: '已拒绝', value: REQUEST_STATUS.REJECTED },
  ]

  const pendingCount = computed(() => {
    return list.value.filter(item => item.status === REQUEST_STATUS.PENDING).length
  })
  const pendingItems = computed(() => list.value.filter(item => item.status === REQUEST_STATUS.PENDING))
  const selectedPendingItems = computed(() => {
    const selectedIds = new Set(selectedRequestIds.value)
    return pendingItems.value.filter(item => selectedIds.has(item.id))
  })
  const allCurrentPendingSelected = computed(() => {
    return pendingItems.value.length > 0 && pendingItems.value.every(item => selectedRequestIds.value.includes(item.id))
  })
  const currentPendingIndeterminate = computed(() => {
    return selectedPendingItems.value.length > 0 && !allCurrentPendingSelected.value
  })

  const detailModal = ref(false)
  const detailLoading = ref(false)
  const detailData = ref<ImageDeleteRequestDetail | null>(null)
  const reviewRemark = ref('')
  const reviewLoading = ref(false)

  function syncSelectedRequestIds() {
    const currentPendingIds = new Set(pendingItems.value.map(item => item.id))
    selectedRequestIds.value = selectedRequestIds.value.filter(id => currentPendingIds.has(id))
  }

  function setRequestSelected(item: ImageDeleteRequestItem, checked: boolean) {
    if (item.status !== REQUEST_STATUS.PENDING)
      return

    const selectedIds = new Set(selectedRequestIds.value)
    if (checked)
      selectedIds.add(item.id)
    else
      selectedIds.delete(item.id)
    selectedRequestIds.value = [...selectedIds]
  }

  function toggleCurrentPendingSelection(checked: boolean) {
    selectedRequestIds.value = checked
      ? pendingItems.value.map(item => item.id)
      : []
  }

  function clearSelection() {
    selectedRequestIds.value = []
  }

  async function loadData() {
    const requestId = listGuard.next()
    loading.value = true
    try {
      const res = await fetchAdminDeleteRequestList(statusFilter.value, page.value, pageSize.value)
      if (!listGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<PageResult<ImageDeleteRequestItem>>(res, {
        list: [],
        total: 0,
        page: page.value,
        pageSize: pageSize.value,
      })
      list.value = data.list || []
      total.value = data.total || 0
      syncSelectedRequestIds()
    }
    catch (error) {
      if (!listGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
        return
      showApiError(message, error, '加载失败')
    }
    finally {
      if (listGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  function handlePageChange(p: number) {
    page.value = p
    clearSelection()
    void loadData()
  }

  function handleFilterChange() {
    page.value = 1
    clearSelection()
    void loadData()
  }

  async function showDetail(item: ImageDeleteRequestItem) {
    detailModal.value = true
    reviewRemark.value = ''
    const cached = detailCache.get(item.id)
    if (cached) {
      detailData.value = cached
      detailLoading.value = false
      return
    }

    const requestId = detailGuard.next()
    detailLoading.value = true
    detailData.value = null
    try {
      const res = await fetchAdminDeleteRequestDetail(item.id)
      if (!detailGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<ImageDeleteRequestDetail | null>(res, null)
      detailData.value = data
      if (data)
        detailCache.set(item.id, data)
    }
    catch (error) {
      if (!detailGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
        return
      showApiError(message, error, '加载详情失败')
      detailModal.value = false
    }
    finally {
      if (detailGuard.isCurrent(requestId))
        detailLoading.value = false
    }
  }

  function handleReview(approve: boolean) {
    if (!detailData.value)
      return

    const action = approve ? '批准删除' : '拒绝'
    const content = approve
      ? `确定批准删除图片 PID: ${detailData.value.pid}_p${detailData.value.p} 吗？此操作将永久删除该图片！`
      : `确定拒绝此删除申请吗？`

    dialog.warning({
      title: `确认${action}`,
      content,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: async () => {
        reviewLoading.value = true
        try {
          await reviewDeleteRequest(detailData.value!.id, approve, reviewRemark.value)
          message.success(approve ? '已批准删除，图片已从数据库移除' : '已拒绝删除申请')
          detailCache.delete(detailData.value!.id)
          selectedRequestIds.value = selectedRequestIds.value.filter(id => id !== detailData.value!.id)
          detailModal.value = false
          void loadData()
        }
        catch (e: unknown) {
          if (shouldIgnoreApiError(e))
            return
          showApiError(message, e, '操作失败')
        }
        finally {
          reviewLoading.value = false
        }
      },
    })
  }

  function quickReview(item: ImageDeleteRequestItem, approve: boolean, e: Event) {
    e.stopPropagation()
    if (bulkReviewLoading.value)
      return

    const action = approve ? '批准删除' : '拒绝'

    dialog.warning({
      title: `确认${action}`,
      content: approve
        ? `确定批准删除图片 PID: ${item.pid}_p${item.p} 吗？`
        : `确定拒绝此删除申请吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await reviewDeleteRequest(item.id, approve, '')
          message.success(approve ? '已批准删除' : '已拒绝')
          detailCache.delete(item.id)
          selectedRequestIds.value = selectedRequestIds.value.filter(id => id !== item.id)
          void loadData()
        }
        catch (e: unknown) {
          if (shouldIgnoreApiError(e))
            return
          showApiError(message, e, '操作失败')
        }
      },
    })
  }

  async function runBatchReview(approve: boolean) {
    const targets = [...selectedPendingItems.value]
    if (targets.length === 0) {
      message.warning('请先选择待审核申请')
      return
    }

    bulkReviewLoading.value = true

    try {
      const res = await batchReviewDeleteRequests(targets.map(item => item.id), approve, '')
      const data = unwrapApiData(res, {
        total: targets.length,
        successCount: 0,
        failureCount: targets.length,
        results: [],
      })
      const successIds = new Set(data.results.filter(item => item.success).map(item => item.requestId))
      const failures = data.results.filter(item => !item.success)

      for (const id of successIds)
        detailCache.delete(id)

      selectedRequestIds.value = selectedRequestIds.value.filter(id => !successIds.has(id))

      if (data.failureCount === 0) {
        message.success(approve ? `已批量同意 ${data.successCount} 条申请` : `已批量拒绝 ${data.successCount} 条申请`)
      }
      else if (data.successCount > 0) {
        const firstFailure = failures[0]
        message.warning(`已处理 ${data.successCount} 条，${data.failureCount} 条失败${firstFailure?.message ? `：${firstFailure.message}` : ''}`)
      }
      else {
        message.error(failures[0]?.message || '批量操作失败')
      }

      await loadData()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '批量操作失败')
    }
    finally {
      bulkReviewLoading.value = false
    }
  }

  function handleBatchReview(approve: boolean) {
    if (selectedPendingItems.value.length === 0) {
      message.warning('请先选择待审核申请')
      return
    }

    const count = selectedPendingItems.value.length
    dialog.warning({
      title: approve ? '确认批量同意' : '确认批量拒绝',
      content: approve
        ? `确定批量同意 ${count} 条删除申请吗？同意后对应图片将被永久删除。`
        : `确定批量拒绝 ${count} 条删除申请吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => runBatchReview(approve),
    })
  }

  function getStatusConfig(status: number) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[REQUEST_STATUS.PENDING]
  }

  onMounted(() => {
    void loadData()
  })

  return {
    REQUEST_STATUS,
    allCurrentPendingSelected,
    bulkReviewLoading,
    clearSelection,
    currentPendingIndeterminate,
    detailData,
    detailLoading,
    detailModal,
    getStatusConfig,
    handleBatchReview,
    handleFilterChange,
    handlePageChange,
    handleReview,
    imageFallbackSrc,
    list,
    loadData,
    loading,
    page,
    pageSize,
    pendingCount,
    pendingItems,
    quickReview,
    reviewLoading,
    reviewRemark,
    selectedPendingItems,
    selectedRequestIds,
    setRequestSelected,
    showDetail,
    statusFilter,
    statusOptions,
    toggleCurrentPendingSelection,
    total,
  }
}
