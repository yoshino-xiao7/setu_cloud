import type { Ref } from 'vue'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { onMounted, onUnmounted, watch } from 'vue'

export interface UseGalleryUploadPageEffectsOptions {
  activeBatchId: Ref<number | null>
  activeTab: Ref<'upload' | 'records'>
  createBatchAttempted: Ref<boolean>
  draftReady: Ref<boolean>
  getRouteBatchId: () => unknown
  getUploadDraftWatchSource: () => unknown
  loadRecords: () => Promise<void>
  loadUploadDraft: () => void
  openRecordDetailFromQuery: (value: unknown, onFound?: () => void) => boolean
  recoverDraftBatch: () => Promise<void>
  restoreDraftFiles: () => Promise<void>
  revokeAllPreviewUrls: () => void
  renewUploadIntentAfterEdit: () => void
  saveUploadDraft: () => void
  submitError: Ref<string>
  uploadIntentKey: Ref<string>
  uploadItems: Ref<LocalUploadItem[]>
}

export function useGalleryUploadPageEffects(options: UseGalleryUploadPageEffectsOptions) {
  function openDetailFromQuery() {
    options.openRecordDetailFromQuery(options.getRouteBatchId(), () => {
      options.activeTab.value = 'records'
    })
  }

  watch(
    options.getUploadDraftWatchSource,
    () => {
      options.renewUploadIntentAfterEdit()
      options.saveUploadDraft()
    },
  )

  watch(
    () => options.activeTab.value,
    () => {
      options.submitError.value = ''
    },
  )

  watch(
    () => options.createBatchAttempted.value,
    () => options.saveUploadDraft(),
  )

  watch(
    () => options.uploadIntentKey.value,
    () => options.saveUploadDraft(),
  )

  watch(
    () => options.activeBatchId.value,
    () => options.saveUploadDraft(),
  )

  watch(
    () => options.uploadItems.value.map(item => [
      item.clientItemId,
      item.status,
      item.uploadStatus,
      item.progress,
      item.error,
      item.sha256,
      item.submissionId,
      item.objectKey,
      item.etag,
    ].join(':')),
    () => options.saveUploadDraft(),
  )

  onMounted(() => {
    options.loadUploadDraft()
    options.draftReady.value = true
    void (async () => {
      await options.restoreDraftFiles()
      await options.recoverDraftBatch()
    })()
    void options.loadRecords()
  })

  watch(
    options.getRouteBatchId,
    () => openDetailFromQuery(),
    { immediate: true },
  )

  onUnmounted(() => {
    options.revokeAllPreviewUrls()
  })
}
