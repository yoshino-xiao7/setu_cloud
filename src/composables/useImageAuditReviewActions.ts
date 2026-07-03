import type { DialogApi, MessageApi } from 'naive-ui'
import type { ComputedRef, ShallowRef } from 'vue'
import type { ImageAuditListDTO } from '@/api/admin'
import { ref } from 'vue'

interface UseImageAuditReviewActionsOptions {
  dialog: DialogApi
  list: ShallowRef<ImageAuditListDTO[]>
  message: MessageApi
  runAvailabilityCheck: (imageIds: number[]) => void
  runBatchAudit: (auditStatus: 1 | 2, remark?: string) => Promise<boolean>
  selectedAuditableImages: ComputedRef<ImageAuditListDTO[]>
  submitPassReview: (imageId: number) => Promise<boolean>
  submitRejectReview: (imageId: number, remark: string) => Promise<boolean>
}

export function useImageAuditReviewActions(options: UseImageAuditReviewActionsOptions) {
  const showRejectModal = ref(false)
  const rejectReason = ref('')
  const currentRejectId = ref<number | null>(null)
  const submitting = ref(false)

  const showBatchRejectModal = ref(false)
  const batchRejectReason = ref('')

  function handlePass(row: ImageAuditListDTO) {
    options.dialog.success({
      title: '确认审核通过',
      content: `确认将图片 (PID: ${row.pid}) 标记为“正常”吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => options.submitPassReview(row.id),
    })
  }

  function openRejectModal(row: ImageAuditListDTO) {
    currentRejectId.value = row.id
    rejectReason.value = ''
    showRejectModal.value = true
  }

  async function handleSubmitReject() {
    if (!rejectReason.value.trim()) {
      options.message.warning('请填写问题描述')
      return
    }

    if (!currentRejectId.value)
      return

    const reviewedImageId = currentRejectId.value
    const reviewedRemark = rejectReason.value.trim()
    submitting.value = true
    try {
      const changed = await options.submitRejectReview(reviewedImageId, reviewedRemark)
      if (changed)
        showRejectModal.value = false
    }
    finally {
      submitting.value = false
    }
  }

  function checkCurrentPageAvailability() {
    void options.runAvailabilityCheck(options.list.value.map(item => item.id))
  }

  function checkSelectedAvailability() {
    void options.runAvailabilityCheck(options.selectedAuditableImages.value.map(item => item.id))
  }

  function handleBatchPass() {
    if (options.selectedAuditableImages.value.length === 0) {
      options.message.warning('请先选择要审核的图片')
      return
    }

    const count = options.selectedAuditableImages.value.length
    options.dialog.success({
      title: '确认批量审核正常',
      content: `确认将 ${count} 张图片批量标记为“正常”吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => options.runBatchAudit(1),
    })
  }

  function openBatchRejectModal() {
    if (options.selectedAuditableImages.value.length === 0) {
      options.message.warning('请先选择要审核的图片')
      return
    }

    batchRejectReason.value = ''
    showBatchRejectModal.value = true
  }

  async function handleSubmitBatchReject() {
    if (!batchRejectReason.value.trim()) {
      options.message.warning('请填写问题描述')
      return
    }

    const remark = batchRejectReason.value.trim()
    submitting.value = true
    try {
      const changed = await options.runBatchAudit(2, remark)
      if (changed)
        showBatchRejectModal.value = false
    }
    finally {
      submitting.value = false
    }
  }

  function clearRejectState() {
    rejectReason.value = ''
    currentRejectId.value = null
  }

  function clearBatchRejectState() {
    batchRejectReason.value = ''
  }

  return {
    batchRejectReason,
    checkCurrentPageAvailability,
    checkSelectedAvailability,
    clearBatchRejectState,
    clearRejectState,
    handleBatchPass,
    handlePass,
    handleSubmitBatchReject,
    handleSubmitReject,
    openBatchRejectModal,
    openRejectModal,
    rejectReason,
    showBatchRejectModal,
    showRejectModal,
    submitting,
  }
}
