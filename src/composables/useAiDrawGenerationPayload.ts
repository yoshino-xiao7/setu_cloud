import type { AiGenerationCreateRequest } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import { firstText } from '@/composables/useAiAssets'

export interface CreateAiDrawGenerationPayloadOptions {
  characterMaskJson?: string
  effectiveNegativePrompt: string
  effectivePositivePrompt: string
  form: AiDrawDraftForm
  isDualMode: boolean
  selectedCharacterAsset: AssetOption | null
  selectedLoraAsset: AssetOption | null
  selectedSecondCharacterAsset: AssetOption | null
  selectedSecondLoraAsset: AssetOption | null
}

export function createAiDrawGenerationPayload(options: CreateAiDrawGenerationPayloadOptions): AiGenerationCreateRequest {
  const promptCn = firstText(
    options.form.promptCn,
    options.selectedCharacterAsset?.displayName,
    options.selectedSecondCharacterAsset?.displayName,
    options.selectedLoraAsset?.displayName,
    options.selectedSecondLoraAsset?.displayName,
    options.effectivePositivePrompt,
  )

  return {
    promptCn,
    promptPositive: options.effectivePositivePrompt,
    promptNegative: options.effectiveNegativePrompt.trim(),
    styleNotes: options.form.styleNotes || undefined,
    width: options.form.width,
    height: options.form.height,
    steps: options.form.steps,
    cfg: options.form.cfg,
    seed: options.form.seed || undefined,
    checkpoint: options.form.checkpoint || undefined,
    generationMode: options.form.generationMode,
    loraName: options.form.loraName || undefined,
    loraStrength: options.form.loraName ? options.form.loraStrength : 0,
    nsfwMode: options.form.nsfwMode,
    nsfwVisibilityLevel: options.form.nsfwVisibilityLevel,
    characterId: options.form.characterId || undefined,
    secondLoraName: options.isDualMode ? options.form.secondLoraName || undefined : undefined,
    secondLoraStrength: options.isDualMode && options.form.secondLoraName ? options.form.secondLoraStrength : 0,
    secondCharacterId: options.isDualMode ? options.form.secondCharacterId || undefined : undefined,
    triggerWords: undefined,
    styleTags: undefined,
    characterMaskJson: options.characterMaskJson,
  }
}

export function canSubmitAiDrawGeneration(
  serviceReady: boolean,
  hasDrawablePrompt: boolean,
  isAdmin: boolean,
  points: number,
  selectedGenerationCost: number,
) {
  return serviceReady && hasDrawablePrompt && (isAdmin || points >= selectedGenerationCost)
}
