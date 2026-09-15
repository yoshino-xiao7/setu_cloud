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
import { useAiDrawSourceImage } from '@/composables/useAiDrawSourceImage'
import {
  applyAiDrawWorkflowEngine,
  filterAiDrawCheckpointOptions,
  getAiDrawWorkflowEngine,
  hasAiDrawAnimaCheckpoints,
} from '@/composables/useAiDrawWorkflowEngine'
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

  const isImg2ImgMode = computed(() => form.jobType === 'IMG2IMG')
  const isDualMode = computed(() => form.generationMode === 'DUAL' && !isImg2ImgMode.value)
  const sourceImageState = useAiDrawSourceImage()
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

  function fillAgain(job: AiGenerationJob) {
    restoreState.fillAgain(job)
    promptTagsState.rememberRestoredPromptAuthorship()
    sourceImageState.clear()
    if (job.jobType === 'IMG2IMG')
      message.info('已回填图生图参数，请重新选择源图')
  }

  const hasDrawablePrompt = computed(() => {
    return !!form.promptCn.trim() || !!promptTagsState.effectivePositivePrompt.value
  })
  const selectedGenerationCost = computed(() => getAiDrawGenerationCost(isDualMode.value))
  const canGenerate = computed(() => {
    return resourcesState.serviceReady.value
      && hasDrawablePrompt.value
      && (isAdmin.value || resourcesState.points.value >= selectedGenerationCost.value)
  })
  const canAttemptGenerate = computed(() => {
    return resourcesState.serviceReady.value
      && (isAdmin.value || resourcesState.points.value >= selectedGenerationCost.value)
  })
  const generateButtonText = computed(() => {
    return getAiDrawGenerateButtonText({
      isAdmin: isAdmin.value,
      isDualMode: isDualMode.value,
      isImg2ImgMode: isImg2ImgMode.value,
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
    markPositivePromptDerived: promptTagsState.markPositivePromptDerived,
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
    sourceFile: sourceImageState.file,
    syncPresetPromptTags: promptTagsState.syncPresetPrompts,
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
    rememberRestoredPromptAuthorship: promptTagsState.rememberRestoredPromptAuthorship,
    restoringDraft,
    secondCharacterInjectedTags: promptTagsState.secondCharacterInjectedTags,
    selectedCharacterMetadata: assetSelectionState.selectedCharacterMetadata,
    selectedSecondCharacterMetadata: assetSelectionState.selectedSecondCharacterMetadata,
    selectedSize,
    serviceStatusPolling: resourcesState.serviceStatusPolling,
    stopPolling: generationState.stopPolling,
    syncingPresetPrompts: promptTagsState.syncingPresetPrompts,
    syncPresetPromptTags: promptTagsState.syncPresetPrompts,
  })

  const workflowEngine = computed({
    get: () => getAiDrawWorkflowEngine(form.checkpoint),
    set: (engine) => {
      applyAiDrawWorkflowEngine(form, engine, resourcesState.capabilities.value.checkpoints)
    },
  })
  const checkpointOptions = computed(() => {
    return filterAiDrawCheckpointOptions(resourcesState.checkpointOptions.value, workflowEngine.value)
  })
  const isAnimaMode = computed(() => workflowEngine.value === 'anima')
  const animaAvailable = computed(() => hasAiDrawAnimaCheckpoints(resourcesState.capabilities.value.checkpoints))

  return {
    ...resourcesState,
    ...assetSelectionState,
    ...characterMaskState,
    ...restoreState,
    ...promptTagsState,
    ...generationState,
    ...pageEffectsState,
    activeJob,
    animaAvailable,
    canAttemptGenerate,
    canGenerate,
    characterMaskBrush: characterMaskState.brush,
    characterMaskHint: characterMaskState.hint,
    characterMaskRole: characterMaskState.role,
    checkpointOptions,
    clearCharacterMask: characterMaskState.clear,
    COST_PER_IMAGE: AI_DRAW_COST_PER_IMAGE,
    DEFAULT_NEGATIVE: AI_DRAW_DEFAULT_NEGATIVE,
    endCharacterMaskPaint: characterMaskState.endPaint,
    fillAgain,
    form,
    generateButtonText,
    hasDrawablePrompt,
    hasCharacterMaskStrokes: characterMaskState.hasStrokes,
    hasCompleteCharacterMaskStrokes: characterMaskState.hasCompleteStrokes,
    isAdmin,
    isAnimaMode,
    isDualMode,
    isImg2ImgMode,
    moveCharacterMaskPaint: characterMaskState.movePaint,
    normalLoraStrengths,
    pointsLoading: resourcesState.pointsLoading,
    restoringDraft,
    selectedGenerationCost,
    selectedSize,
    sizePresets: AI_DRAW_SIZE_PRESETS,
    sourceImageError: sourceImageState.error,
    sourceImageFileName: sourceImageState.fileName,
    sourceImagePreviewUrl: sourceImageState.previewUrl,
    selectSourceImage: sourceImageState.selectFile,
    clearSourceImage: sourceImageState.clear,
    startCharacterMaskPaint: characterMaskState.startPaint,
    undoCharacterMaskStroke: characterMaskState.undo,
    workflowEngine,
  }
}
