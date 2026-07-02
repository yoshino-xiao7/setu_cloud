import type { AiGenerationJob } from '@/api/aiGeneration'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import type { AiDrawDraftState } from '@/stores/aiDrawDraft'
import { applyAiDrawDraftToForm } from '@/composables/useAiDrawDraftForm'
import { applyAiDrawJobSize, getAiDrawSizePresetValue } from '@/composables/useAiDrawSizePresets'

export interface ApplyAiDrawHistoryJobOptions {
  defaultNegative: string
  restoreCharacterMask: (maskJson: string) => void
}

export function applyAiDrawHistoryJobToForm(
  form: AiDrawDraftForm,
  job: AiGenerationJob,
  options: ApplyAiDrawHistoryJobOptions,
) {
  form.promptCn = job.promptCn
  form.promptPositive = job.promptPositive || ''
  form.promptNegative = job.promptNegative || options.defaultNegative
  form.styleNotes = job.styleNotes || ''
  const selectedSize = applyAiDrawJobSize(form, job.width, job.height)
  form.steps = job.steps || 35
  form.cfg = job.cfg || 4.5
  form.seed = null
  form.checkpoint = job.checkpoint || ''
  form.generationMode = job.generationMode || 'SINGLE'
  form.nsfwMode = job.nsfwMode === true
  form.nsfwVisibilityLevel = job.nsfwVisibilityLevel || 'STANDARD'
  form.loraName = job.loraName || ''
  form.loraStrength = job.loraStrength || 1
  form.characterId = job.characterId || ''
  form.secondLoraName = job.secondLoraName || ''
  form.secondLoraStrength = job.secondLoraStrength || 0.65
  form.secondCharacterId = job.secondCharacterId || ''
  form.triggerWords = ''
  form.styleTags = ''
  form.stylePresetIds = []
  options.restoreCharacterMask(job.characterMaskJson || '')
  return selectedSize
}

export function applyAiDrawDraftRestore(
  form: AiDrawDraftForm,
  draft: AiDrawDraftState,
  defaultNegative: string,
) {
  applyAiDrawDraftToForm(form, draft, defaultNegative)
  return getAiDrawSizePresetValue(form.width, form.height)
}

export function readAiDrawPrefillJob(sessionStorage: Pick<Storage, 'getItem' | 'removeItem'>) {
  const raw = sessionStorage.getItem('ai-draw-prefill')
  if (!raw)
    return null
  sessionStorage.removeItem('ai-draw-prefill')
  const job = JSON.parse(raw) as AiGenerationJob & { clearSeed?: boolean }
  return {
    ...job,
    seed: job.clearSeed ? null : job.seed,
  }
}
