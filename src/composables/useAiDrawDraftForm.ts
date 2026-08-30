import type { AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import type { AiDrawDraftPatch, AiDrawDraftState } from '@/stores/aiDrawDraft'

export interface AiDrawDraftForm {
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
  disabledStylePresetIds: string[]
}

export interface CreateAiDrawDraftPatchOptions {
  promptPositive: string
  promptNegative: string
  defaultNegative: string
}

export function createAiDrawDraftPatch(
  form: AiDrawDraftForm,
  options: CreateAiDrawDraftPatchOptions,
): AiDrawDraftPatch {
  return {
    generationMode: form.generationMode,
    nsfwMode: form.nsfwMode,
    nsfwVisibilityLevel: form.nsfwVisibilityLevel,
    promptCn: form.promptCn,
    promptPositive: options.promptPositive,
    promptNegative: options.promptNegative || options.defaultNegative,
    styleNotes: form.styleNotes,
    width: form.width,
    height: form.height,
    steps: form.steps,
    cfg: form.cfg,
    seed: form.seed,
    checkpoint: form.checkpoint,
    loraName: form.loraName,
    loraStrength: form.loraStrength,
    characterId: form.characterId,
    secondLoraName: form.secondLoraName,
    secondLoraStrength: form.secondLoraStrength,
    secondCharacterId: form.secondCharacterId,
    triggerWords: form.triggerWords,
    styleTags: form.styleTags,
    stylePresetIds: [...form.stylePresetIds],
    disabledStylePresetIds: [...(form.disabledStylePresetIds ?? [])],
  }
}

export function applyAiDrawDraftToForm(
  form: AiDrawDraftForm,
  draft: AiDrawDraftState,
  defaultNegative: string,
) {
  form.generationMode = draft.generationMode
  form.nsfwMode = draft.nsfwMode
  form.nsfwVisibilityLevel = draft.nsfwVisibilityLevel
  form.promptCn = draft.promptCn
  form.promptPositive = draft.promptPositive
  form.promptNegative = draft.promptNegative || defaultNegative
  form.styleNotes = draft.styleNotes
  form.width = draft.width
  form.height = draft.height
  form.steps = draft.steps
  form.cfg = draft.cfg
  form.seed = draft.seed
  form.checkpoint = draft.checkpoint
  form.loraName = draft.loraName
  form.loraStrength = draft.loraStrength
  form.characterId = draft.characterId
  form.secondLoraName = draft.secondLoraName
  form.secondLoraStrength = draft.secondLoraStrength
  form.secondCharacterId = draft.secondCharacterId
  form.triggerWords = draft.triggerWords
  form.styleTags = draft.styleTags
  form.stylePresetIds = [...(draft.stylePresetIds ?? [])]
  form.disabledStylePresetIds = [...(draft.disabledStylePresetIds ?? [])]
}
