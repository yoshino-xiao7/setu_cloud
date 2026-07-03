import type { AiGenerationJob } from '@/api/aiGeneration'
import type { CreateAiDrawDraftPatchOptions } from '@/composables/useAiDrawDraftForm'
import { useMessage } from 'naive-ui'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAiDrawAssetSelection } from '@/composables/useAiDrawAssetSelection'
import { useAiDrawCharacterMask } from '@/composables/useAiDrawCharacterMask'
import {
  AI_DRAW_COST_PER_IMAGE,
  AI_DRAW_DEFAULT_NEGATIVE,
  AI_DRAW_PROMPT_TRANSLATION_POLL_MS,
  AI_DRAW_PROMPT_TRANSLATION_TIMEOUT_MS,
  AI_DRAW_SERVICE_STATUS_POLL_MS,
  createAiDrawDefaultForm,
  getAiDrawGenerateButtonText,
  getAiDrawGenerationCost,
} from '@/composables/useAiDrawDefaults'
import { createAiDrawDraftPatch } from '@/composables/useAiDrawDraftForm'
import { useAiDrawGenerationFlow } from '@/composables/useAiDrawGenerationFlow'
import { useAiDrawPageEffects } from '@/composables/useAiDrawPageEffects'
import { useAiDrawPromptTags } from '@/composables/useAiDrawPromptTags'
import { useAiDrawResources } from '@/composables/useAiDrawResources'
import { useAiDrawRestore } from '@/composables/useAiDrawRestore'
import { AI_DRAW_SIZE_PRESETS } from '@/composables/useAiDrawSizePresets'
import { useAiDrawDraftStore } from '@/stores/aiDrawDraft'
import { useAuthStore } from '@/stores/auth'

export function useAiDrawPage() {
  const message = useMessage()
  const auth = useAuthStore()
  const router = useRouter()
  const draftStore = useAiDrawDraftStore()
  const isAdmin = computed(() => auth.user?.role === 1)
  const activeJob = ref<AiGenerationJob | null>(null)
  const selectedSize = ref('portrait')
  const normalLoraStrengths = ref({ primary: 1, secondary: 0.65 })
  const restoringDraft = ref(false)
  const form = reactive(createAiDrawDefaultForm())
  let getDraftPromptPatchForCapture: () => CreateAiDrawDraftPatchOptions = () => ({
    promptPositive: form.promptPositive,
    promptNegative: form.promptNegative,
    defaultNegative: AI_DRAW_DEFAULT_NEGATIVE,
  })

  const resourcesState = useAiDrawResources({
    isAdmin,
    message,
    serviceStatusPollMs: AI_DRAW_SERVICE_STATUS_POLL_MS,
  })

  function captureDraft() {
    draftStore.capture(createAiDrawDraftPatch(form, getDraftPromptPatchForCapture()))
  }

  const assetSelectionState = useAiDrawAssetSelection({
    capabilities: resourcesState.capabilities,
    characterAssets: resourcesState.characterAssets,
    loraAssets: resourcesState.loraAssets,
    form,
    captureDraft,
    router,
  })

  const isDualMode = computed(() => form.generationMode === 'DUAL')
  const characterMaskState = useAiDrawCharacterMask({
    isEnabled: isDualMode,
    getDimensions: () => ({ width: form.width, height: form.height }),
  })
  const restoreState = useAiDrawRestore({
    defaultNegative: AI_DRAW_DEFAULT_NEGATIVE,
    draftStore,
    form,
    message,
    redrawCharacterMaskSoon: characterMaskState.redrawSoon,
    restoringDraft,
    restoreCharacterMask: characterMaskState.restore,
    selectedSize,
    storage: window.sessionStorage,
  })
  const promptTagsState = useAiDrawPromptTags({
    capabilities: resourcesState.capabilities,
    defaultNegative: AI_DRAW_DEFAULT_NEGATIVE,
    dualCharacterPromptGuard: characterMaskState.promptGuard,
    form,
    isDualMode,
    restoringDraft,
    selectedCharacterMetadata: assetSelectionState.selectedCharacterMetadata,
    selectedLoraAsset: assetSelectionState.selectedLoraAsset,
    selectedSecondCharacterMetadata: assetSelectionState.selectedSecondCharacterMetadata,
    selectedSecondLoraAsset: assetSelectionState.selectedSecondLoraAsset,
  })
  getDraftPromptPatchForCapture = promptTagsState.getDraftPromptPatch

  const hasDrawablePrompt = computed(() => {
    return !!form.promptCn.trim() || !!promptTagsState.effectivePositivePrompt.value
  })
  const selectedGenerationCost = computed(() => getAiDrawGenerationCost(isDualMode.value))
  const canGenerate = computed(() => {
    return resourcesState.serviceReady.value
      && hasDrawablePrompt.value
      && (isAdmin.value || resourcesState.points.value >= selectedGenerationCost.value)
  })
  const generateButtonText = computed(() => {
    return getAiDrawGenerateButtonText({
      isAdmin: isAdmin.value,
      isDualMode: isDualMode.value,
      selectedCost: selectedGenerationCost.value,
    })
  })

  const generationState = useAiDrawGenerationFlow({
    activeJob,
    buildCharacterMaskJson: characterMaskState.buildJson,
    defaultNegative: AI_DRAW_DEFAULT_NEGATIVE,
    effectiveNegativePrompt: promptTagsState.effectiveNegativePrompt,
    effectivePositivePrompt: promptTagsState.effectivePositivePrompt,
    form,
    hasDrawablePrompt,
    isAdmin,
    isDualMode,
    loadPoints: resourcesState.loadPoints,
    loadRecentJobs: resourcesState.loadRecentJobs,
    mergedStyleTags: promptTagsState.mergedStyleTags,
    message,
    points: resourcesState.points,
    promptTranslationPollMs: AI_DRAW_PROMPT_TRANSLATION_POLL_MS,
    promptTranslationTimeoutMs: AI_DRAW_PROMPT_TRANSLATION_TIMEOUT_MS,
    selectedCharacterAsset: assetSelectionState.selectedCharacterAsset,
    selectedGenerationCost,
    selectedLoraAsset: assetSelectionState.selectedLoraAsset,
    selectedSecondCharacterAsset: assetSelectionState.selectedSecondCharacterAsset,
    selectedSecondLoraAsset: assetSelectionState.selectedSecondLoraAsset,
    serviceReady: resourcesState.serviceReady,
    serviceStatusMessage: resourcesState.serviceStatusMessage,
  })
  const pageEffectsState = useAiDrawPageEffects({
    availableStylePromptPresets: promptTagsState.availableStylePromptPresets,
    characterInjectedTags: promptTagsState.characterInjectedTags,
    characterMaskCanvas: characterMaskState.canvas,
    form,
    loadCapabilities: resourcesState.loadCapabilities,
    loadPoints: resourcesState.loadPoints,
    loadRecentJobs: resourcesState.loadRecentJobs,
    loadServiceStatus: resourcesState.loadServiceStatus,
    normalLoraStrengths,
    redrawCharacterMaskSoon: characterMaskState.redrawSoon,
    restoreDraft: restoreState.restoreDraft,
    restorePrefill: restoreState.restorePrefill,
    restoringDraft,
    secondCharacterInjectedTags: promptTagsState.secondCharacterInjectedTags,
    selectedCharacterMetadata: assetSelectionState.selectedCharacterMetadata,
    selectedSecondCharacterMetadata: assetSelectionState.selectedSecondCharacterMetadata,
    selectedSize,
    serviceStatusPolling: resourcesState.serviceStatusPolling,
    stopPolling: generationState.stopPolling,
    syncingPresetPrompts: promptTagsState.syncingPresetPrompts,
    syncPresetPrompts: promptTagsState.syncPresetPrompts,
  })

  return {
    ...resourcesState,
    ...assetSelectionState,
    ...characterMaskState,
    ...restoreState,
    ...promptTagsState,
    ...generationState,
    ...pageEffectsState,
    activeJob,
    canGenerate,
    COST_PER_IMAGE: AI_DRAW_COST_PER_IMAGE,
    DEFAULT_NEGATIVE: AI_DRAW_DEFAULT_NEGATIVE,
    form,
    generateButtonText,
    hasDrawablePrompt,
    isAdmin,
    isDualMode,
    normalLoraStrengths,
    restoringDraft,
    selectedGenerationCost,
    selectedSize,
    sizePresets: AI_DRAW_SIZE_PRESETS,
  }
}
