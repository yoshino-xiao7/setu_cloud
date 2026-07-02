import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAiDrawDraftStore } from '@/stores/aiDrawDraft'

describe('ai draw draft store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('captures draft data and marks it as restorable', () => {
    const draft = useAiDrawDraftStore()

    draft.capture({
      promptCn: '一只白发少女',
      stylePresetIds: ['soft-light', 'anime'],
      width: 1216,
      height: 832,
    })

    expect(draft.hasDraft).toBe(true)
    expect(draft.promptCn).toBe('一只白发少女')
    expect(draft.stylePresetIds).toEqual(['soft-light', 'anime'])
    expect(draft.width).toBe(1216)
    expect(draft.height).toBe(832)
  })

  it('copies style preset arrays when saving asset selections', () => {
    const draft = useAiDrawDraftStore()
    const stylePresetIds = ['cinematic']

    draft.commitAssetSelection({ stylePresetIds })
    stylePresetIds.push('mutated')

    expect(draft.stylePresetIds).toEqual(['cinematic'])
  })
})
