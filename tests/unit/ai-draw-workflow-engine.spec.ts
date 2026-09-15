import { describe, expect, it } from 'vitest'
import { AI_DRAW_DEFAULT_STEPS } from '@/composables/useAiDrawDefaults'
import {
  AI_DRAW_ANIMA_DEFAULT_CFG,
  AI_DRAW_ANIMA_DEFAULT_STEPS,
  applyAiDrawWorkflowEngine,
  filterAiDrawCheckpointOptions,
  getAiDrawWorkflowEngine,
  isAiDrawAnimaCheckpoint,
} from '@/composables/useAiDrawWorkflowEngine'

describe('ai draw workflow engine helpers', () => {
  it('detects anima checkpoints without matching animagine', () => {
    expect(isAiDrawAnimaCheckpoint('anima-base-v1.0.safetensors')).toBe(true)
    expect(isAiDrawAnimaCheckpoint('anima-aesthetic-v1.1.safetensors')).toBe(true)
    expect(isAiDrawAnimaCheckpoint('animagine-xl-4.0-opt.safetensors')).toBe(false)
    expect(isAiDrawAnimaCheckpoint('waiIllustriousSDXL_v170.safetensors')).toBe(false)
    expect(getAiDrawWorkflowEngine('anima-base-v1.0.safetensors')).toBe('anima')
    expect(getAiDrawWorkflowEngine('')).toBe('classic')
  })

  it('filters checkpoint options by engine', () => {
    const options = [
      { label: '默认模型', value: '' },
      { label: 'WAI', value: 'waiIllustriousSDXL_v170.safetensors' },
      { label: 'Anima', value: 'anima-base-v1.0.safetensors' },
    ]
    expect(filterAiDrawCheckpointOptions(options, 'classic').map(item => item.value)).toEqual([
      '',
      'waiIllustriousSDXL_v170.safetensors',
    ])
    expect(filterAiDrawCheckpointOptions(options, 'anima').map(item => item.value)).toEqual([
      'anima-base-v1.0.safetensors',
    ])
  })

  it('switches engine and default sampler settings', () => {
    const form = {
      checkpoint: '',
      steps: AI_DRAW_DEFAULT_STEPS,
      cfg: 4.5,
    }
    const checkpoints = [
      { name: 'waiIllustriousSDXL_v170.safetensors' },
      { name: 'anima-base-v1.0.safetensors' },
    ]
    applyAiDrawWorkflowEngine(form, 'anima', checkpoints)
    expect(form.checkpoint).toBe('anima-base-v1.0.safetensors')
    expect(form.steps).toBe(AI_DRAW_ANIMA_DEFAULT_STEPS)
    expect(form.cfg).toBe(AI_DRAW_ANIMA_DEFAULT_CFG)

    applyAiDrawWorkflowEngine(form, 'classic', checkpoints)
    expect(form.checkpoint).toBe('')
    expect(form.steps).toBe(AI_DRAW_DEFAULT_STEPS)
    expect(form.cfg).toBe(4.5)
  })
})
