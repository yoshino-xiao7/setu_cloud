import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { useDialog, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useGalleryUploadDraftState } from '@/composables/useGalleryUploadDraftState'
import { useGalleryUploadErrorHandling } from '@/composables/useGalleryUploadErrorHandling'
import { useGalleryUploadFileDrafts } from '@/composables/useGalleryUploadFileDrafts'
import { useGalleryUploadFileSelection } from '@/composables/useGalleryUploadFileSelection'
import { useGalleryUploadFormState } from '@/composables/useGalleryUploadFormState'
import { useGalleryUploadLocalItems } from '@/composables/useGalleryUploadLocalItems'
import { useGalleryUploadPageEffects } from '@/composables/useGalleryUploadPageEffects'
import { useGalleryUploadRecords } from '@/composables/useGalleryUploadRecords'
import { useGalleryUploadRunner } from '@/composables/useGalleryUploadRunner'
import { useGalleryUploadSession } from '@/composables/useGalleryUploadSession'
import { useGalleryUploadSubmitFlow } from '@/composables/useGalleryUploadSubmitFlow'
import { useGalleryUploadSubmitValidation } from '@/composables/useGalleryUploadSubmitValidation'
import { GALLERY_UPLOAD_MAX_FILES } from '@/constants/galleryUpload'
import {
  getLocalUploadStatusText,
  getPublicImageLabel,
} from '@/utils/galleryUploadStatus'

export function useGalleryUploadPage() {
  const message = useMessage()
  const dialog = useDialog()
  const route = useRoute()
  const activeTab = ref<'upload' | 'records'>('upload')
  const includeSha256 = ref(true)
  const uploading = ref(false)
  const submitError = ref('')

  const formState = useGalleryUploadFormState()
  let getUploadItemsForDraft = (): LocalUploadItem[] => []
  let getRestoringDraftFilesForDraft = () => false
  let restoreLocalDraftFilesForDraft = async () => ({ restoredCount: 0, totalCount: 0 })

  const fileDraftsState = useGalleryUploadFileDrafts({
    onPersistError: () => {
      message.warning('浏览器没有保存图片草稿，刷新后可能需要重新选择图片')
    },
  })
  const draftState = useGalleryUploadDraftState({
    clearPersistedUploadFiles: fileDraftsState.clearPersistedUploadFiles,
    form: formState.form,
    getRestoringDraftFiles: () => getRestoringDraftFilesForDraft(),
    getUploadItems: () => getUploadItemsForDraft(),
    includeSha256,
    restoreLocalDraftFiles: () => restoreLocalDraftFilesForDraft(),
    storage: localStorage,
    uploading,
  })
  const localItemsState = useGalleryUploadLocalItems({
    draftItemMap: draftState.draftItemMap,
    getFileDraftKey: fileDraftsState.getFileDraftKey,
    getPersistedUploadFile: fileDraftsState.getPersistedUploadFile,
    pidMode: computed(() => formState.form.pidMode),
  })
  getUploadItemsForDraft = () => localItemsState.uploadItems.value
  getRestoringDraftFilesForDraft = () => localItemsState.restoringDraftFiles.value
  restoreLocalDraftFilesForDraft = localItemsState.restoreDraftFiles

  const totalSize = computed(() => localItemsState.uploadItems.value.reduce((sum, item) => sum + item.sizeBytes, 0))
  const selectedCount = computed(() => localItemsState.uploadItems.value.length)
  const canStartUpload = computed(() => selectedCount.value > 0 && !uploading.value)
  const canPickFiles = computed(() => !uploading.value && selectedCount.value < GALLERY_UPLOAD_MAX_FILES)

  const recordsState = useGalleryUploadRecords({
    dialog,
    message,
  })
  const validationState = useGalleryUploadSubmitValidation({
    form: formState.form,
    totalSize,
    uploadItems: localItemsState.uploadItems,
    warning: content => message.warning(content),
  })
  const sessionState = useGalleryUploadSession({
    createInitRequest: () => ({
      pidMode: formState.form.pidMode,
      defaults: formState.buildUploadDefaults(),
      items: validationState.buildInitItems(),
    }),
    onRecoverDraftBatchError: (errorMessage) => {
      draftState.draftRestoredNotice.value = true
      draftState.draftRestoreMessage.value = `${draftState.draftRestoreMessage.value || '已恢复本地草稿。'} 但暂时无法同步后端批次状态：${errorMessage}`
    },
    onResetExpiredUploadDraft: (messageText) => {
      submitError.value = messageText
    },
    saveUploadDraft: draftState.saveUploadDraft,
    uploadItems: localItemsState.uploadItems,
  })
  draftState.setSessionState({
    activeBatchId: sessionState.activeBatchId,
    createBatchAttempted: sessionState.createBatchAttempted,
    renewUploadSessionAfterEdit: sessionState.renewUploadIntentAfterEdit,
    uploadIntentKey: sessionState.uploadIntentKey,
  })

  const runnerState = useGalleryUploadRunner({
    ensureInitResponse: sessionState.ensureInitResponse,
    getPreparedUploadItem: sessionState.getPreparedUploadItem,
    includeSha256,
    isExpiredUploadStatus: sessionState.isExpiredUploadStatus,
    isInitResponseExpiring: sessionState.isInitResponseExpiring,
    onShaCalculationWarning: () => {
      message.warning('手机端计算 SHA-256 失败，已跳过校验值继续上传')
    },
    refreshInitResponseForUploadRetry: sessionState.refreshInitResponseForUploadRetry,
    resetExpiredUploadDraft: sessionState.resetExpiredUploadDraft,
    saveUploadDraft: draftState.saveUploadDraft,
    uploadItems: localItemsState.uploadItems,
  })
  const errorHandlingState = useGalleryUploadErrorHandling({
    message,
    saveUploadDraft: draftState.saveUploadDraft,
    submitError,
    uploadItems: localItemsState.uploadItems,
  })
  const fileSelectionState = useGalleryUploadFileSelection({
    canPickFiles,
    createUploadFileInfo: localItemsState.createUploadFileInfo,
    deletePersistedUploadFile: fileDraftsState.deletePersistedUploadFile,
    draftItemMap: draftState.draftItemMap,
    draftRestoredNotice: draftState.draftRestoredNotice,
    fileList: localItemsState.fileList,
    findDraftItem: localItemsState.findDraftItem,
    persistUploadFiles: fileDraftsState.persistUploadFiles,
    renewUploadIntentAfterEdit: draftState.renewUploadIntentAfterEdit,
    restoringDraftFiles: localItemsState.restoringDraftFiles,
    revokePreviewUrl: localItemsState.revokePreviewUrl,
    syncUploadItems: localItemsState.syncUploadItems,
    totalSize,
    uploadItems: localItemsState.uploadItems,
    warning: content => message.warning(content),
  })
  const submitFlowState = useGalleryUploadSubmitFlow({
    activeTab,
    clearUploadDraft: draftState.clearUploadDraft,
    fileList: localItemsState.fileList,
    handleFailedUpload: errorHandlingState.handleFailedUpload,
    handleGalleryUploadIncomplete: errorHandlingState.handleGalleryUploadIncomplete,
    isExpiredUploadError: errorHandlingState.isExpiredUploadError,
    isExpiredUploadStatus: sessionState.isExpiredUploadStatus,
    loadRecords: recordsState.loadRecords,
    message,
    resetExpiredUploadDraft: sessionState.resetExpiredUploadDraft,
    resetRecordsFilter: recordsState.resetRecordsFilter,
    resetUploadIntentKey: sessionState.resetUploadIntentKey,
    revokePreviewUrl: localItemsState.revokePreviewUrl,
    runUpload: runnerState.runUpload,
    saveUploadDraft: draftState.saveUploadDraft,
    submitError,
    uploading,
    uploadItems: localItemsState.uploadItems,
    validateBeforeSubmit: validationState.validateBeforeSubmit,
  })

  useGalleryUploadPageEffects({
    activeBatchId: sessionState.activeBatchId,
    activeTab,
    createBatchAttempted: sessionState.createBatchAttempted,
    draftReady: draftState.draftReady,
    getRouteBatchId: () => route.query.batchId,
    getUploadDraftWatchSource: draftState.getUploadDraftWatchSource,
    loadRecords: recordsState.loadRecords,
    loadUploadDraft: draftState.loadUploadDraft,
    openRecordDetailFromQuery: recordsState.openDetailFromQuery,
    recoverDraftBatch: sessionState.recoverDraftBatch,
    restoreDraftFiles: draftState.restoreDraftFiles,
    revokeAllPreviewUrls: localItemsState.revokeAllPreviewUrls,
    renewUploadIntentAfterEdit: draftState.renewUploadIntentAfterEdit,
    saveUploadDraft: draftState.saveUploadDraft,
    submitError,
    uploadIntentKey: sessionState.uploadIntentKey,
    uploadItems: localItemsState.uploadItems,
  })

  return {
    ...formState,
    ...draftState,
    ...localItemsState,
    ...recordsState,
    ...fileSelectionState,
    ...submitFlowState,
    activeTab,
    canPickFiles,
    canStartUpload,
    GALLERY_UPLOAD_MAX_FILES,
    getItemStatusText: getLocalUploadStatusText,
    isExpiredUploadStatus: sessionState.isExpiredUploadStatus,
    includeSha256,
    publicImageLabel: getPublicImageLabel,
    selectedCount,
    submitError,
    totalSize,
    uploading,
  }
}
