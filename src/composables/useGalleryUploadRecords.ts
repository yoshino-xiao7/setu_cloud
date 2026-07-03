import type { DialogApi, MessageApi } from 'naive-ui'
import type {
  GallerySubmissionBatchDetail,
  GallerySubmissionBatchSummary,
  GalleryUploadStatus,
} from '@/api/galleryUpload'
import { ref } from 'vue'
import {
  cancelGalleryUploadBatch,
  fetchMyGalleryUploadBatchDetail,
  fetchMyGalleryUploadBatches,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export interface UseGalleryUploadRecordsOptions {
  dialog: DialogApi
  message: MessageApi
  pageSize?: number
}

export function parseGalleryUploadBatchId(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function canCancelGalleryUploadBatch(batch: GallerySubmissionBatchSummary) {
  return batch.status === 'UPLOADING' || batch.status === 'WAITING_MANUAL_REVIEW'
}

export function useGalleryUploadRecords(options: UseGalleryUploadRecordsOptions) {
  const recordsLoading = ref(false)
  const records = ref<GallerySubmissionBatchSummary[]>([])
  const recordsTotal = ref(0)
  const recordsPage = ref(1)
  const recordsPageSize = options.pageSize ?? 10
  const recordsStatus = ref('ALL')

  const detailModal = ref(false)
  const detailLoading = ref(false)
  const detailData = ref<GallerySubmissionBatchDetail | null>(null)

  async function loadDetailData(batchId: number) {
    return unwrapApiData(await fetchMyGalleryUploadBatchDetail(batchId), null)
  }

  async function loadRecords() {
    recordsLoading.value = true
    try {
      const status = recordsStatus.value === 'ALL' ? undefined : recordsStatus.value
      const data = unwrapApiData(await fetchMyGalleryUploadBatches({
        status: status as GalleryUploadStatus | undefined,
        page: recordsPage.value,
        pageSize: recordsPageSize,
      }), {
        total: 0,
        page: recordsPage.value,
        pageSize: recordsPageSize,
        list: [],
      })
      records.value = data.list || []
      recordsTotal.value = data.total || 0
      recordsPage.value = data.page || recordsPage.value
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载投稿记录失败')
    }
    finally {
      recordsLoading.value = false
    }
  }

  function resetRecordsFilter() {
    recordsPage.value = 1
    recordsStatus.value = 'ALL'
  }

  function handleStatusChange() {
    recordsPage.value = 1
    void loadRecords()
  }

  function handleRecordPageChange(page: number) {
    recordsPage.value = page
    void loadRecords()
  }

  async function openDetailByBatchId(batchId: number) {
    detailModal.value = true
    detailLoading.value = true
    detailData.value = null
    try {
      detailData.value = await loadDetailData(batchId)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载投稿详情失败')
      detailModal.value = false
    }
    finally {
      detailLoading.value = false
    }
  }

  async function openDetail(batch: GallerySubmissionBatchSummary) {
    await openDetailByBatchId(batch.batchId)
  }

  function openDetailFromQuery(value: unknown, onFound?: () => void) {
    const batchId = parseGalleryUploadBatchId(value)
    if (!batchId)
      return false

    recordsStatus.value = 'ALL'
    onFound?.()
    void openDetailByBatchId(batchId)
    return true
  }

  function confirmCancel(batch: GallerySubmissionBatchSummary) {
    options.dialog.warning({
      title: '取消投稿',
      content: `确认取消批次 #${batch.batchId} 吗？`,
      positiveText: '确认取消',
      negativeText: '保留',
      onPositiveClick: async () => {
        try {
          await cancelGalleryUploadBatch(batch.batchId)
          options.message.success('已取消投稿批次')
          await loadRecords()
        }
        catch (error) {
          if (!shouldIgnoreApiError(error))
            showApiError(options.message, error, '取消失败')
        }
      },
    })
  }

  return {
    recordsLoading,
    records,
    recordsTotal,
    recordsPage,
    recordsPageSize,
    recordsStatus,
    detailModal,
    detailLoading,
    detailData,
    canCancel: canCancelGalleryUploadBatch,
    confirmCancel,
    handleRecordPageChange,
    handleStatusChange,
    loadRecords,
    openDetail,
    openDetailByBatchId,
    openDetailFromQuery,
    resetRecordsFilter,
  }
}
