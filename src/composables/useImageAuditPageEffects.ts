import type { Ref } from 'vue'
import { onMounted, onUnmounted, watch } from 'vue'

export interface UseImageAuditPageEffectsOptions {
  clearBatchRejectState: () => void
  clearDeleteRequestState: () => void
  clearRejectState: () => void
  clearSelectedImages: () => void
  disposeImageAuditData: () => void
  fetchData: () => void | Promise<void>
  isMobile: Ref<boolean>
  pagination: { page: number }
  showBatchRejectModal: Ref<boolean>
  showDeleteRequestModal: Ref<boolean>
  showRejectModal: Ref<boolean>
  submitting: Ref<boolean>
}

export function useImageAuditPageEffects(options: UseImageAuditPageEffectsOptions) {
  onMounted(() => {
    void options.fetchData()
  })

  watch(options.isMobile, () => {
    options.pagination.page = 1
    options.clearSelectedImages()
    void options.fetchData()
  })

  watch(options.showRejectModal, (show) => {
    if (!show)
      options.clearRejectState()
  })

  watch(options.showBatchRejectModal, (show) => {
    if (!show)
      options.clearBatchRejectState()
  })

  watch(options.showDeleteRequestModal, (show) => {
    if (!show)
      options.clearDeleteRequestState()
  })

  onUnmounted(() => {
    options.submitting.value = false
    options.disposeImageAuditData()
    options.clearRejectState()
    options.clearBatchRejectState()
    options.clearDeleteRequestState()
  })
}
