import type { AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import { defineStore } from 'pinia'

export interface AiDrawDraftState {
  hasDraft: boolean
  generationMode: AiGenerationMode
  nsfwMode: boolean
  nsfwVisibilityLevel: AiNsfwVisibilityLevel
  promptCn: string
  promptPositive: string
  promptNegative: string
  styleNotes: string
  width: number
  height: number
  steps: number
  cfg: number
  seed: number | null
  checkpoint: string
  loraName: string
  loraStrength: number
  characterId: string
  secondLoraName: string
  secondLoraStrength: number
  secondCharacterId: string
  triggerWords: string
  styleTags: string
  stylePresetIds: string[]
}

export interface AiDrawDraftPatch {
  generationMode?: AiGenerationMode
  nsfwMode?: boolean
  nsfwVisibilityLevel?: AiNsfwVisibilityLevel
  promptCn?: string
  promptPositive?: string
  promptNegative?: string
  styleNotes?: string
  width?: number
  height?: number
  steps?: number
  cfg?: number
  seed?: number | null
  checkpoint?: string
  loraName?: string
  loraStrength?: number
  characterId?: string
  secondLoraName?: string
  secondLoraStrength?: number
  secondCharacterId?: string
  triggerWords?: string
  styleTags?: string
  stylePresetIds?: string[]
}

function defaultState(): AiDrawDraftState {
  return {
    hasDraft: false,
    generationMode: 'SINGLE',
    nsfwMode: false,
    nsfwVisibilityLevel: 'STANDARD',
    promptCn: '',
    promptPositive: '',
    promptNegative: '',
    styleNotes: '',
    width: 832,
    height: 1216,
    steps: 35,
    cfg: 4.5,
    seed: null,
    checkpoint: '',
    loraName: '',
    loraStrength: 1,
    characterId: '',
    secondLoraName: '',
    secondLoraStrength: 0.65,
    secondCharacterId: '',
    triggerWords: '',
    styleTags: '',
    stylePresetIds: [],
  }
}

export const useAiDrawDraftStore = defineStore('aiDrawDraft', {
  state: defaultState,
  actions: {
    capture(draft: AiDrawDraftPatch) {
      this.$patch({
        ...draft,
        stylePresetIds: [...(draft.stylePresetIds || this.stylePresetIds)],
        hasDraft: true,
      })
    },
    commitAssetSelection(selection: AiDrawDraftPatch) {
      this.$patch({
        ...selection,
        stylePresetIds: [...(selection.stylePresetIds || this.stylePresetIds)],
        hasDraft: true,
      })
    },
    resetDraft() {
      this.$reset()
    },
  },
})
