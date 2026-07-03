import type { MessageApi } from 'naive-ui'
import type { Ref } from 'vue'
import type { AiGenerationJob } from '@/api/aiGeneration'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import type { AiDrawDraftState } from '@/stores/aiDrawDraft'
import {
  applyAiDrawDraftRestore,
  applyAiDrawHistoryJobToForm,
  readAiDrawPrefillJob,
} from '@/composables/useAiDrawHistoryRestore'

interface AiDrawDraftStoreLike {
  hasDraft: boolean
  $state: AiDrawDraftState
  resetDraft: () => void
}

export interface UseAiDrawRestoreOptions {
  defaultNegative: string
  draftStore: AiDrawDraftStoreLike
  form: AiDrawDraftForm
  message: MessageApi
  redrawCharacterMaskSoon: () => void
  restoringDraft: Ref<boolean>
  restoreCharacterMask: (maskJson: string) => void
  selectedSize: Ref<string>
  storage: Pick<Storage, 'getItem' | 'removeItem'>
}

export function useAiDrawRestore(options: UseAiDrawRestoreOptions) {
  function fillAgain(job: AiGenerationJob) {
    options.selectedSize.value = applyAiDrawHistoryJobToForm(options.form, job, {
      defaultNegative: options.defaultNegative,
      restoreCharacterMask: options.restoreCharacterMask,
    })
    options.redrawCharacterMaskSoon()
  }

  function restoreDraft() {
    if (!options.draftStore.hasDraft)
      return

    options.restoringDraft.value = true
    options.selectedSize.value = applyAiDrawDraftRestore(
      options.form,
      options.draftStore.$state,
      options.defaultNegative,
    )
    options.restoringDraft.value = false
    options.draftStore.resetDraft()
    options.redrawCharacterMaskSoon()
  }

  function restorePrefill() {
    try {
      const job = readAiDrawPrefillJob(options.storage)
      if (!job)
        return
      fillAgain(job)
      options.message.success(job.clearSeed ? '已复用参数并清空 Seed' : '已复用历史参数')
    }
    catch {
      options.message.warning('历史参数读取失败')
    }
  }

  return {
    fillAgain,
    restoreDraft,
    restorePrefill,
  }
}
