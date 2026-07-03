import type { MessageApi } from 'naive-ui'
import type { ImageDeleteRequestDetail, ImageDeleteRequestItem } from '@/api/imageDeleteRequest'
import { onMounted, ref, watch } from 'vue'
import {
  fetchMyDeleteRequestDetail,
  fetchMyDeleteRequests,
} from '@/api/imageDeleteRequest'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useRequestGuard } from '@/composables/useRequestGuard'

export interface UseMyDeleteRequestsOptions {
  getRouteRequestId: () => unknown
  message: MessageApi
}

export function parsePositiveId(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function useMyDeleteRequests(options: UseMyDeleteRequestsOptions) {
  const listGuard = useRequestGuard()
  const detailGuard = useRequestGuard()
  const loading = ref(false)
  const list = ref<ImageDeleteRequestItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const detailModal = ref(false)
  const detailLoading = ref(false)
  const detailData = ref<ImageDeleteRequestDetail | null>(null)

  async function loadData() {
    const requestId = listGuard.next()
    loading.value = true
    try {
      const res = await fetchMyDeleteRequests(page.value, pageSize.value)
      if (!listGuard.isCurrent(requestId))
        return

      const data = unwrapApiData(res, {
        list: [] as ImageDeleteRequestItem[],
        page: page.value,
        pageSize: pageSize.value,
        total: 0,
      })
      list.value = data.list || []
      total.value = data.total || 0
    }
    catch (error) {
      if (!listGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '加载失败')
    }
    finally {
      if (listGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  function handlePageChange(nextPage: number) {
    page.value = nextPage
    void loadData()
  }

  async function showDetailById(id: number) {
    const requestId = detailGuard.next()
    detailModal.value = true
    detailLoading.value = true
    detailData.value = null
    try {
      const res = await fetchMyDeleteRequestDetail(id)
      if (!detailGuard.isCurrent(requestId))
        return
      detailData.value = unwrapApiData<ImageDeleteRequestDetail | null>(res, null)
    }
    catch (error) {
      if (!detailGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '加载详情失败')
      detailModal.value = false
    }
    finally {
      if (detailGuard.isCurrent(requestId))
        detailLoading.value = false
    }
  }

  async function showDetail(item: ImageDeleteRequestItem) {
    await showDetailById(item.id)
  }

  function showDetailFromQuery() {
    const requestId = parsePositiveId(options.getRouteRequestId())
    if (requestId)
      void showDetailById(requestId)
  }

  onMounted(() => {
    void loadData()
  })

  watch(
    options.getRouteRequestId,
    () => showDetailFromQuery(),
    { immediate: true },
  )

  return {
    detailData,
    detailLoading,
    detailModal,
    handlePageChange,
    list,
    loadData,
    loading,
    page,
    pageSize,
    showDetail,
    total,
  }
}
