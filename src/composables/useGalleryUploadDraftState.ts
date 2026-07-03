import type { Ref } from 'vue'
import type {
  GalleryUploadDraftForm,
  GalleryUploadDraftItem,
} from '@/composables/useGalleryUploadDraft'
import type { RestoreGalleryUploadDraftFilesResult } from '@/composables/useGalleryUploadLocalItems'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import { ref } from 'vue'
import {
  createGalleryUploadDraft,
  createGalleryUploadDraftWatchSource,
  hasMeaningfulGalleryUploadDraft,
  parseGalleryUploadDraft,
} from '@/composables/useGalleryUploadDraft'
import { GALLERY_UPLOAD_DRAFT_STORAGE_KEY } from '@/constants/galleryUpload'
import { createUploadIntentKey } from '@/utils/uploadIntentKey'

interface GalleryUploadDraftSessionState {
  activeBatchId: Ref<number | null>
  createBatchAttempted: Ref<boolean>
  renewUploadSessionAfterEdit: (canRenew: boolean) => void
  uploadIntentKey: Ref<string>
}

export interface UseGalleryUploadDraftStateOptions {
  clearPersistedUploadFiles: () => void
  form: GalleryUploadDraftForm
  getRestoringDraftFiles: () => boolean
  getUploadItems: () => LocalUploadItem[]
  includeSha256: Ref<boolean>
  restoreLocalDraftFiles: () => Promise<RestoreGalleryUploadDraftFilesResult>
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
  uploading: Ref<boolean>
}

export function useGalleryUploadDraftState(options: UseGalleryUploadDraftStateOptions) {
  const draftRestoredNotice = ref(false)
  const draftRestoreMessage = ref('')
  const draftItemMap = ref(new Map<string, GalleryUploadDraftItem>())
  const draftReady = ref(false)
  let sessionState: GalleryUploadDraftSessionState | null = null

  function setSessionState(nextSessionState: GalleryUploadDraftSessionState) {
    sessionState = nextSessionState
  }

  function buildUploadDraft() {
    return createGalleryUploadDraft({
      uploadIntentKey: sessionState?.uploadIntentKey.value || createUploadIntentKey(),
      batchId: sessionState?.activeBatchId.value || undefined,
      createBatchAttempted: sessionState?.createBatchAttempted.value || false,
      includeSha256: options.includeSha256.value,
      form: {
        pidMode: options.form.pidMode,
        title: options.form.title,
        author: options.form.author,
        r18: options.form.r18,
        aiType: options.form.aiType,
        tagsText: options.form.tagsText,
      },
      items: options.getUploadItems(),
    })
  }

  function saveUploadDraft() {
    if (!draftReady.value)
      return

    const draft = buildUploadDraft()
    if (!hasMeaningfulGalleryUploadDraft(draft)) {
      options.storage.removeItem(GALLERY_UPLOAD_DRAFT_STORAGE_KEY)
      return
    }

    options.storage.setItem(GALLERY_UPLOAD_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }

  function clearUploadDraft() {
    options.storage.removeItem(GALLERY_UPLOAD_DRAFT_STORAGE_KEY)
    draftItemMap.value = new Map()
    if (sessionState)
      sessionState.activeBatchId.value = null
    draftRestoredNotice.value = false
    draftRestoreMessage.value = ''
    options.clearPersistedUploadFiles()
  }

  function loadUploadDraft() {
    const rawDraft = options.storage.getItem(GALLERY_UPLOAD_DRAFT_STORAGE_KEY)
    if (!rawDraft)
      return

    try {
      const draft = parseGalleryUploadDraft(rawDraft)
      if (!draft)
        return

      options.form.pidMode = draft.form.pidMode === 'SINGLE_PID_MULTI_PAGE' ? draft.form.pidMode : 'MULTI_PID_P0'
      options.form.title = draft.form.title || ''
      options.form.author = draft.form.author || ''
      options.form.r18 = !!draft.form.r18
      options.form.aiType = Number.isFinite(draft.form.aiType) ? Number(draft.form.aiType) : 0
      options.form.tagsText = draft.form.tagsText || ''
      options.includeSha256.value = draft.includeSha256 ?? true

      if (sessionState) {
        sessionState.uploadIntentKey.value = draft.uploadIntentKey || createUploadIntentKey()
        sessionState.activeBatchId.value = Number.isFinite(draft.batchId) ? Number(draft.batchId) : null
        sessionState.createBatchAttempted.value = !!draft.createBatchAttempted
      }

      const draftItems = Array.isArray(draft.items) ? draft.items : []
      draftItemMap.value = new Map(
        draftItems
          .filter(item => item?.fileKey)
          .map(item => [item.fileKey, item as GalleryUploadDraftItem]),
      )
      if (draftItems.length > 0) {
        draftRestoredNotice.value = true
        draftRestoreMessage.value = '已恢复上次填写的投稿草稿，正在尝试恢复已选择的图片。'
      }
    }
    catch {
      options.storage.removeItem(GALLERY_UPLOAD_DRAFT_STORAGE_KEY)
    }
  }

  async function restoreDraftFiles() {
    const { restoredCount, totalCount } = await options.restoreLocalDraftFiles()
    if (totalCount === 0)
      return

    if (restoredCount > 0) {
      draftRestoredNotice.value = true
      draftRestoreMessage.value = restoredCount === totalCount
        ? '已自动恢复上次未完成的投稿图片和填写内容，可直接继续提交。'
        : `已自动恢复 ${restoredCount}/${totalCount} 张图片，其余图片需要重新选择。`
      return
    }

    draftRestoredNotice.value = true
    draftRestoreMessage.value = '已恢复上次填写的投稿草稿，但浏览器没有保留图片文件；请重新选择图片，同名图片会自动带回单图信息。'
  }

  function renewUploadIntentAfterEdit() {
    sessionState?.renewUploadSessionAfterEdit(
      draftReady.value && !options.uploading.value && !options.getRestoringDraftFiles(),
    )
  }

  function getUploadDraftWatchSource() {
    return createGalleryUploadDraftWatchSource(options.form, options.includeSha256.value, options.getUploadItems())
  }

  function handleDraftAlertClose() {
    draftRestoredNotice.value = false
  }

  return {
    clearUploadDraft,
    draftItemMap,
    draftReady,
    draftRestoredNotice,
    draftRestoreMessage,
    getUploadDraftWatchSource,
    handleDraftAlertClose,
    loadUploadDraft,
    renewUploadIntentAfterEdit,
    restoreDraftFiles,
    saveUploadDraft,
    setSessionState,
  }
}
