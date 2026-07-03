import type {
  GallerySubmissionBatchDetail,
  GallerySubmissionBatchSummary,
  GalleryUploadStatus,
} from '@/api/galleryUpload'
import { useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import {
  approveAdminGallerySubmissionBatch,
  fetchAdminGallerySubmissionBatchDetail,
  fetchAdminGallerySubmissionBatches,
  rejectAdminGallerySubmissionBatch,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { GALLERY_UPLOAD_STATUS_OPTIONS, parseTagsInput } from '@/utils/galleryUploadStatus'

type R18Override = 'KEEP' | 'SAFE' | 'R18'

const DESKTOP_PAGE_SIZE = 10
const MOBILE_PAGE_SIZE = 5

export function useGallerySubmissionReview() {
  const message = useMessage()
  const { isCompact } = useBreakpoint()

  const loading = ref(false)
  const list = shallowRef<GallerySubmissionBatchSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const status = ref<GalleryUploadStatus>('WAITING_MANUAL_REVIEW')
  const statusOptions = GALLERY_UPLOAD_STATUS_OPTIONS
  const pageSize = computed(() => isCompact.value ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE)

  const detailModal = ref(false)
  const detailLoading = ref(false)
  const detailData = shallowRef<GallerySubmissionBatchDetail | null>(null)

  const approveModal = ref(false)
  const rejectModal = ref(false)
  const submitting = ref(false)
  const currentBatch = ref<GallerySubmissionBatchSummary | GallerySubmissionBatchDetail | null>(null)

  const approveForm = reactive({
    remark: '人工审核通过',
    publishNow: true,
    r18: 'KEEP' as R18Override,
    aiType: -1,
    tagsText: '',
  })

  const rejectForm = reactive({
    reason: '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  })

  const aiTypeOptions = [
    { label: '不覆盖', value: -1 },
    { label: '未知', value: 0 },
    { label: '非 AI', value: 1 },
    { label: 'AI 生成', value: 2 },
  ]

  const r18Options = [
    { label: '不覆盖', value: 'KEEP' },
    { label: '全年龄', value: 'SAFE' },
    { label: 'R18', value: 'R18' },
  ]

  const severityOptions = [
    { label: '低', value: 'LOW' },
    { label: '中', value: 'MEDIUM' },
    { label: '高', value: 'HIGH' },
  ]

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  let listRequestSeq = 0
  let detailRequestSeq = 0

  async function loadData() {
    const requestId = ++listRequestSeq
    loading.value = true
    try {
      const queryStatus = status.value === 'ALL' ? undefined : status.value
      const data = unwrapApiData(await fetchAdminGallerySubmissionBatches({
        status: queryStatus,
        page: page.value,
        pageSize: pageSize.value,
      }), {
        total: 0,
        page: page.value,
        pageSize: pageSize.value,
        list: [],
      })
      if (requestId !== listRequestSeq)
        return
      list.value = data.list || []
      total.value = data.total || 0
      page.value = data.page || page.value
    }
    catch (error) {
      if (requestId === listRequestSeq && !shouldIgnoreApiError(error))
        showApiError(message, error, '加载投稿审核列表失败')
    }
    finally {
      if (requestId === listRequestSeq)
        loading.value = false
    }
  }

  function handleStatusChange() {
    page.value = 1
    void loadData()
  }

  function handlePageChange(nextPage: number) {
    page.value = nextPage
    void loadData()
  }

  async function openDetail(batch: GallerySubmissionBatchSummary) {
    const requestId = ++detailRequestSeq
    detailModal.value = true
    detailLoading.value = true
    detailData.value = null
    try {
      const data = unwrapApiData(await fetchAdminGallerySubmissionBatchDetail(batch.batchId), null)
      if (requestId !== detailRequestSeq || !detailModal.value)
        return
      detailData.value = data
    }
    catch (error) {
      if (requestId === detailRequestSeq) {
        if (!shouldIgnoreApiError(error))
          showApiError(message, error, '加载投稿详情失败')
        detailModal.value = false
      }
    }
    finally {
      if (requestId === detailRequestSeq)
        detailLoading.value = false
    }
  }

  function openApprove(batch: GallerySubmissionBatchSummary | GallerySubmissionBatchDetail) {
    currentBatch.value = batch
    approveForm.remark = '人工审核通过'
    approveForm.publishNow = true
    approveForm.r18 = 'KEEP'
    approveForm.aiType = -1
    approveForm.tagsText = Array.isArray(batch.tags) ? batch.tags.join(', ') : ''
    approveModal.value = true
  }

  function openReject(batch: GallerySubmissionBatchSummary | GallerySubmissionBatchDetail) {
    currentBatch.value = batch
    rejectForm.reason = ''
    rejectForm.severity = 'MEDIUM'
    rejectModal.value = true
  }

  function settleReviewedBatch(batchId: number, nextStatus: Exclude<GalleryUploadStatus, 'ALL'>) {
    if (status.value === 'ALL') {
      list.value = list.value.map(batch =>
        batch.batchId === batchId
          ? { ...batch, status: nextStatus, reviewedAt: new Date().toISOString() }
          : batch,
      )
      return
    }

    const nextList = list.value.filter(batch => batch.batchId !== batchId)
    if (nextList.length === list.value.length)
      return

    list.value = nextList
    total.value = Math.max(0, total.value - 1)

    if (nextList.length === 0 && total.value > 0) {
      page.value = Math.min(page.value, pageCount.value)
      void loadData()
    }
  }

  async function submitApprove() {
    if (!currentBatch.value)
      return

    const batchId = currentBatch.value.batchId
    submitting.value = true
    try {
      const tags = parseTagsInput(approveForm.tagsText)
      await approveAdminGallerySubmissionBatch(batchId, {
        remark: approveForm.remark.trim() || undefined,
        publishNow: approveForm.publishNow,
        r18: approveForm.r18 === 'KEEP' ? undefined : approveForm.r18 === 'R18',
        aiType: approveForm.aiType < 0 ? undefined : approveForm.aiType,
        normalizedTags: tags.length > 0 ? tags : undefined,
      })
      message.success('已审核通过')
      approveModal.value = false
      detailModal.value = false
      detailData.value = null
      currentBatch.value = null
      settleReviewedBatch(batchId, 'APPROVED')
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '审核通过失败')
    }
    finally {
      submitting.value = false
    }
  }

  async function submitReject() {
    if (!currentBatch.value)
      return
    if (!rejectForm.reason.trim()) {
      message.warning('请填写拒绝原因')
      return
    }

    const batchId = currentBatch.value.batchId
    submitting.value = true
    try {
      await rejectAdminGallerySubmissionBatch(batchId, {
        reason: rejectForm.reason.trim(),
        severity: rejectForm.severity,
      })
      message.success('已拒绝投稿')
      rejectModal.value = false
      detailModal.value = false
      detailData.value = null
      currentBatch.value = null
      settleReviewedBatch(batchId, 'REJECTED')
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '拒绝失败')
    }
    finally {
      submitting.value = false
    }
  }

  function publicImageLabel(item: { publicPid?: number | null, publicP?: number | null }) {
    if (item.publicPid === null || item.publicPid === undefined)
      return '-'
    return `${item.publicPid}_p${item.publicP ?? 0}`
  }

  onMounted(() => {
    void loadData()
  })

  watch(pageSize, () => {
    page.value = 1
    void loadData()
  })

  watch(detailModal, (show) => {
    if (show)
      return

    detailRequestSeq += 1
    detailLoading.value = false
    detailData.value = null
  })

  watch(approveModal, (show) => {
    if (show)
      return

    approveForm.remark = '人工审核通过'
    approveForm.publishNow = true
    approveForm.r18 = 'KEEP'
    approveForm.aiType = -1
    approveForm.tagsText = ''
    if (!rejectModal.value)
      currentBatch.value = null
  })

  watch(rejectModal, (show) => {
    if (show)
      return

    rejectForm.reason = ''
    rejectForm.severity = 'MEDIUM'
    if (!approveModal.value)
      currentBatch.value = null
  })

  onUnmounted(() => {
    listRequestSeq += 1
    detailRequestSeq += 1
    loading.value = false
    detailLoading.value = false
    submitting.value = false
    list.value = []
    detailData.value = null
    currentBatch.value = null
  })

  return {
    aiTypeOptions,
    approveForm,
    approveModal,
    detailData,
    detailLoading,
    detailModal,
    handlePageChange,
    handleStatusChange,
    list,
    loadData,
    loading,
    openApprove,
    openDetail,
    openReject,
    page,
    pageCount,
    pageSize,
    publicImageLabel,
    r18Options,
    rejectForm,
    rejectModal,
    severityOptions,
    status,
    statusOptions,
    submitApprove,
    submitReject,
    submitting,
    total,
  }
}
