import type { AiGenerationMode, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'

export const AI_DRAW_COST_PER_IMAGE = 50
export const AI_DRAW_DUAL_CHARACTER_COST_MULTIPLIER = 2
export const AI_DRAW_PROMPT_TRANSLATION_POLL_MS = 1500
export const AI_DRAW_PROMPT_TRANSLATION_TIMEOUT_MS = 120000
export const AI_DRAW_SERVICE_STATUS_POLL_MS = 60000
export const AI_DRAW_DEFAULT_NEGATIVE = 'low quality, worst quality, bad anatomy, bad hands, extra fingers, missing fingers, deformed, blurry, text, watermark, logo, cropped'

export function createAiDrawDefaultForm(): AiDrawDraftForm {
  return {
    generationMode: 'SINGLE' as AiGenerationMode,
    nsfwMode: false,
    nsfwVisibilityLevel: 'STANDARD' as AiNsfwVisibilityLevel,
    promptCn: '',
    promptPositive: '',
    promptNegative: AI_DRAW_DEFAULT_NEGATIVE,
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

export function getAiDrawGenerationCost(isDualMode: boolean) {
  return AI_DRAW_COST_PER_IMAGE * (isDualMode ? AI_DRAW_DUAL_CHARACTER_COST_MULTIPLIER : 1)
}

export function getAiDrawGenerateButtonText(options: {
  isAdmin: boolean
  isDualMode: boolean
  selectedCost: number
}) {
  if (options.isAdmin)
    return options.isDualMode ? '生成双角色图，管理员免费' : '生成一张图，管理员免费'

  return options.isDualMode
    ? `生成双角色图，消耗 ${options.selectedCost} 积分`
    : `生成一张图，消耗 ${AI_DRAW_COST_PER_IMAGE} 积分`
}

export function getAiDrawAssetCompactSummary(asset: AssetOption | null, emptyText: string) {
  if (!asset)
    return emptyText

  const parts = [
    asset.triggerWords ? `触发词：${asset.triggerWords}` : '',
    asset.recommendedStrength !== null ? `强度：${asset.recommendedStrength}` : '',
  ].filter(Boolean)

  return parts.join(' · ') || asset.fileName
}
