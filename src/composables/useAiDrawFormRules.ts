import type { AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import { firstNumber, firstText } from '@/composables/useAiAssets'

export const AI_DRAW_NSFW_LORA_STRENGTHS: Record<AiNsfwVisibilityLevel, number> = {
  LIGHT: 0.65,
  STANDARD: 0.6,
  STRONG: 0.55,
}

export interface AiDrawFormRuleState {
  generationMode: AiGenerationMode
  nsfwMode: boolean
  nsfwVisibilityLevel: AiNsfwVisibilityLevel
  loraName: string
  loraStrength: number
  characterId: string
  secondLoraName: string
  secondLoraStrength: number
  secondCharacterId: string
  triggerWords: string
  styleTags: string
}

export interface AiDrawLoraStrengthSnapshot {
  primary: number
  secondary: number
}

export type AiDrawAssetTarget = 'primary' | 'secondary'

export function getAiDrawNsfwLoraStrength(level: AiNsfwVisibilityLevel) {
  return AI_DRAW_NSFW_LORA_STRENGTHS[level]
}

export function applyAiDrawNsfwModeChange(
  form: AiDrawFormRuleState,
  enabled: boolean,
  savedStrengths: AiDrawLoraStrengthSnapshot,
) {
  form.nsfwMode = enabled

  if (enabled) {
    const nextSavedStrengths = {
      primary: form.loraStrength,
      secondary: form.secondLoraStrength,
    }
    if (form.loraName)
      form.loraStrength = getAiDrawNsfwLoraStrength(form.nsfwVisibilityLevel)
    if (form.secondLoraName)
      form.secondLoraStrength = getAiDrawNsfwLoraStrength(form.nsfwVisibilityLevel)
    return nextSavedStrengths
  }

  if (form.loraName)
    form.loraStrength = savedStrengths.primary
  if (form.secondLoraName)
    form.secondLoraStrength = savedStrengths.secondary
  return savedStrengths
}

export function applyAiDrawNsfwVisibilityChange(form: AiDrawFormRuleState, level: AiNsfwVisibilityLevel) {
  form.nsfwVisibilityLevel = level
  if (!form.nsfwMode)
    return

  if (form.loraName)
    form.loraStrength = getAiDrawNsfwLoraStrength(level)
  if (form.secondLoraName)
    form.secondLoraStrength = getAiDrawNsfwLoraStrength(level)
}

export function getAiDrawCharacterLoraStrength(
  metadata: Record<string, unknown>,
  nsfwMode: boolean,
  level: AiNsfwVisibilityLevel,
  fallback: number,
) {
  if (nsfwMode)
    return getAiDrawNsfwLoraStrength(level)

  return firstNumber(
    metadata.lora_strength,
    metadata.loraStrength,
    metadata.recommended_strength,
    metadata.recommendedStrength,
  ) || fallback
}

export function applyAiDrawCharacterMetadata(
  form: AiDrawFormRuleState,
  metadata: Record<string, unknown>,
  target: AiDrawAssetTarget = 'primary',
) {
  const loraName = firstText(metadata.lora_name, metadata.loraName)
  if (target === 'secondary') {
    if (loraName) {
      form.secondLoraName = loraName
      form.secondLoraStrength = getAiDrawCharacterLoraStrength(metadata, form.nsfwMode, form.nsfwVisibilityLevel, 0.65)
    }
    return
  }

  form.triggerWords = firstText(metadata.trigger_words, metadata.triggerWords)
  form.styleTags = firstText(metadata.style_tags, metadata.styleTags) || form.styleTags
  if (loraName) {
    form.loraName = loraName
    form.loraStrength = getAiDrawCharacterLoraStrength(metadata, form.nsfwMode, form.nsfwVisibilityLevel, 1)
  }
}

export function clearAiDrawLora(form: AiDrawFormRuleState, target: AiDrawAssetTarget = 'primary') {
  if (target === 'secondary') {
    form.secondLoraName = ''
    form.secondLoraStrength = form.nsfwMode ? getAiDrawNsfwLoraStrength(form.nsfwVisibilityLevel) : 0.65
    return
  }

  form.loraName = ''
  form.loraStrength = form.nsfwMode ? getAiDrawNsfwLoraStrength(form.nsfwVisibilityLevel) : 1
  form.triggerWords = ''
}

export function clearAiDrawCharacter(form: AiDrawFormRuleState, target: AiDrawAssetTarget = 'primary') {
  if (target === 'secondary') {
    form.secondCharacterId = ''
    form.secondLoraName = ''
    form.secondLoraStrength = 0.65
    return
  }

  form.characterId = ''
  form.triggerWords = ''
}

export function applyAiDrawGenerationModeChange(form: AiDrawFormRuleState, selectedSize: string) {
  if (form.generationMode === 'SINGLE') {
    form.secondCharacterId = ''
    form.secondLoraName = ''
    form.secondLoraStrength = 0.65
    return null
  }

  return selectedSize === 'portrait' ? 'landscape' : null
}
