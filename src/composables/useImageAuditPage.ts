import type { ImageAuditScope } from '@/api/admin'
import { useDialog, useMessage } from 'naive-ui'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useImageAuditAvailability } from '@/composables/useImageAuditAvailability'
import { useImageAuditBatchReview } from '@/composables/useImageAuditBatchReview'
import { useImageAuditData } from '@/composables/useImageAuditData'
import { useImageAuditDeleteRequest } from '@/composables/useImageAuditDeleteRequest'
import { useImageAuditPageEffects } from '@/composables/useImageAuditPageEffects'
import { useImageAuditReviewActions } from '@/composables/useImageAuditReviewActions'
import { useImageAuditReviewSettlement } from '@/composables/useImageAuditReviewSettlement'
import { useImageAuditSelection } from '@/composables/useImageAuditSelection'
import { useImageAuditSingleReview } from '@/composables/useImageAuditSingleReview'
import {
  getImageAuditScopeLabel,
  getImageAuditScopeOptionLabel,
  IMAGE_AUDIT_SCOPE_OPTIONS,
  IMAGE_AVAILABILITY_OPTIONS,
} from '@/composables/useImageAuditViewHelpers'

export function useImageAuditPage() {
  const message = useMessage()
  const dialog = useDialog()
  const { isCompact: isMobile } = useBreakpoint()

  const dataState = useImageAuditData({
    isMobile,
    shouldIgnoreError: shouldIgnoreApiError,
    showError: (error, fallbackMessage) => showApiError(message, error, fallbackMessage),
    warn: content => message.warning(content),
  })
  const selectionState = useImageAuditSelection({
    list: dataState.list,
    scope: dataState.scope,
  })
  dataState.setSelectionHandlers({
    clearSelectedImages: selectionState.clearSelectedImages,
    syncSelectedImages: selectionState.syncSelectedImages,
  })

  const availabilityState = useImageAuditAvailability({
    list: dataState.list,
    shouldIgnoreError: shouldIgnoreApiError,
    showError: (error, fallbackMessage) => showApiError(message, error, fallbackMessage),
    success: content => message.success(content),
    warning: content => message.warning(content),
  })
  const settlementState = useImageAuditReviewSettlement({
    dueBefore: dataState.dueBefore,
    fetchData: () => {
      void dataState.fetchData()
    },
    list: dataState.list,
    pageCount: dataState.pageCount,
    pagination: dataState.pagination,
    removeSelectedImageIds: selectionState.removeSelectedImageIds,
    scope: dataState.scope,
    stats: dataState.stats,
  })
  const batchReviewState = useImageAuditBatchReview({
    selectedAuditableImages: selectionState.selectedAuditableImages,
    settleReviewedImages: settlementState.settleReviewedImages,
    shouldIgnoreError: shouldIgnoreApiError,
    showError: (error, fallbackMessage) => showApiError(message, error, fallbackMessage),
    error: content => message.error(content),
    success: content => message.success(content),
    warning: content => message.warning(content),
  })
  const singleReviewState = useImageAuditSingleReview({
    settleReviewedImage: settlementState.settleReviewedImage,
    shouldIgnoreError: shouldIgnoreApiError,
    showError: (error, fallbackMessage) => showApiError(message, error, fallbackMessage),
    success: content => message.success(content),
  })
  const reviewActionsState = useImageAuditReviewActions({
    dialog,
    list: dataState.list,
    message,
    runAvailabilityCheck: availabilityState.runAvailabilityCheck,
    runBatchAudit: batchReviewState.runBatchAudit,
    selectedAuditableImages: selectionState.selectedAuditableImages,
    submitPassReview: singleReviewState.submitPassReview,
    submitRejectReview: singleReviewState.submitRejectReview,
  })
  const deleteRequestState = useImageAuditDeleteRequest({
    shouldIgnoreError: shouldIgnoreApiError,
    showError: (error, fallbackMessage) => showApiError(message, error, fallbackMessage),
    submitting: reviewActionsState.submitting,
    success: content => message.success(content),
    warning: content => message.warning(content),
  })

  useImageAuditPageEffects({
    clearBatchRejectState: reviewActionsState.clearBatchRejectState,
    clearDeleteRequestState: deleteRequestState.clearDeleteRequestState,
    clearRejectState: reviewActionsState.clearRejectState,
    clearSelectedImages: selectionState.clearSelectedImages,
    disposeImageAuditData: dataState.dispose,
    fetchData: dataState.fetchData,
    isMobile,
    pagination: dataState.pagination,
    showBatchRejectModal: reviewActionsState.showBatchRejectModal,
    showDeleteRequestModal: deleteRequestState.showDeleteRequestModal,
    showRejectModal: reviewActionsState.showRejectModal,
    submitting: reviewActionsState.submitting,
  })

  function getScopeOptionLabel(value: ImageAuditScope) {
    return getImageAuditScopeOptionLabel(value, dataState.stats.value)
  }

  return {
    ...dataState,
    ...selectionState,
    ...availabilityState,
    ...batchReviewState,
    ...reviewActionsState,
    ...deleteRequestState,
    auditScopeOptions: IMAGE_AUDIT_SCOPE_OPTIONS,
    availabilityOptions: IMAGE_AVAILABILITY_OPTIONS,
    getScopeLabel: getImageAuditScopeLabel,
    getScopeOptionLabel,
    resetFilters: dataState.resetFilters,
  }
}
