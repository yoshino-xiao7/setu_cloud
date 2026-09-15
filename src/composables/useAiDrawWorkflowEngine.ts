import type { AiCapabilityItem } from '@/api/aiGeneration'
import { AI_DRAW_DEFAULT_STEPS } from '@/composables/useAiDrawDefaults'

export type AiDrawWorkflowEngine = 'classic' | 'anima'

export const AI_DRAW_ANIMA_DEFAULT_STEPS = 30
export const AI_DRAW_ANIMA_DEFAULT_CFG = 4

export interface AiDrawCheckpointOption {
  label: string
  value: string
}

export interface AiDrawWorkflowEngineForm {
  checkpoint: string
  steps: number
  cfg: number
}

export function isAiDrawAnimaCheckpoint(checkpoint?: string | null) {
  const name = (checkpoint || '').replace(/\\/g, '/').split('/').pop() || ''
  return name.toLowerCase().startsWith('anima-')
}

export function getAiDrawWorkflowEngine(checkpoint?: string | null): AiDrawWorkflowEngine {
  return isAiDrawAnimaCheckpoint(checkpoint) ? 'anima' : 'classic'
}

export function filterAiDrawCheckpointOptions(
  options: AiDrawCheckpointOption[],
  engine: AiDrawWorkflowEngine,
) {
  return options.filter((item) => {
    if (!item.value)
      return engine === 'classic'
    return engine === 'anima'
      ? isAiDrawAnimaCheckpoint(item.value)
      : !isAiDrawAnimaCheckpoint(item.value)
  })
}

export function hasAiDrawAnimaCheckpoints(checkpoints: Pick<AiCapabilityItem, 'name'>[]) {
  return checkpoints.some(item => isAiDrawAnimaCheckpoint(item.name))
}

export function applyAiDrawWorkflowEngine(
  form: AiDrawWorkflowEngineForm,
  engine: AiDrawWorkflowEngine,
  checkpoints: Pick<AiCapabilityItem, 'name'>[],
) {
  const animaName = checkpoints.find(item => isAiDrawAnimaCheckpoint(item.name))?.name || ''
  if (engine === 'anima') {
    if (!isAiDrawAnimaCheckpoint(form.checkpoint))
      form.checkpoint = animaName
    if (form.steps === AI_DRAW_DEFAULT_STEPS && form.cfg === 4.5) {
      form.steps = AI_DRAW_ANIMA_DEFAULT_STEPS
      form.cfg = AI_DRAW_ANIMA_DEFAULT_CFG
    }
    return
  }
  if (isAiDrawAnimaCheckpoint(form.checkpoint))
    form.checkpoint = ''
  if (form.steps === AI_DRAW_ANIMA_DEFAULT_STEPS && form.cfg === AI_DRAW_ANIMA_DEFAULT_CFG) {
    form.steps = AI_DRAW_DEFAULT_STEPS
    form.cfg = 4.5
  }
}
