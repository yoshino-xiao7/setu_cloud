import type { ComputedRef, Ref } from 'vue'
import type { AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import type { AiDrawLoraStrengthSnapshot } from '@/composables/useAiDrawFormRules'
import { onMounted, onUnmounted, watch } from 'vue'
import {
  applyAiDrawCharacterMetadata,
  applyAiDrawGenerationModeChange,
  applyAiDrawNsfwModeChange,
  applyAiDrawNsfwVisibilityChange,
} from '@/composables/useAiDrawFormRules'
import { applyAiDrawSizePreset } from '@/composables/useAiDrawSizePresets'

interface PollingController {
  start: () => void
  stop: () => void
}

export interface UseAiDrawPageEffectsOptions {
  availableStylePromptPresets: ComputedRef<unknown[]>
  characterInjectedTags: ComputedRef<string>
  characterMaskCanvas: Ref<HTMLCanvasElement | null>
  form: AiDrawDraftForm
  loadCapabilities: () => Promise<void>
  loadPoints: () => Promise<void>
  loadRecentJobs: () => Promise<void>
  loadServiceStatus: () => Promise<void>
  normalLoraStrengths: Ref<AiDrawLoraStrengthSnapshot>
  redrawCharacterMaskSoon: () => void
  restoreDraft: () => void
  restorePrefill: () => void
  restoringDraft: Ref<boolean>
  secondCharacterInjectedTags: ComputedRef<string>
  selectedCharacterMetadata: ComputedRef<Record<string, unknown>>
  selectedSecondCharacterMetadata: ComputedRef<Record<string, unknown>>
  selectedSize: Ref<string>
  serviceStatusPolling: PollingController
  stopPolling: () => void
  syncingPresetPrompts: Ref<boolean>
  syncPresetPromptTags: () => void
}

export function useAiDrawPageEffects(options: UseAiDrawPageEffectsOptions) {
  function handleNsfwModeChange(enabled: boolean) {
    options.normalLoraStrengths.value = applyAiDrawNsfwModeChange(
      options.form,
      enabled,
      options.normalLoraStrengths.value,
    )
  }

  function handleNsfwVisibilityChange(level: AiNsfwVisibilityLevel) {
    applyAiDrawNsfwVisibilityChange(options.form, level)
  }

  function applySizePreset(value: string | number) {
    options.selectedSize.value = applyAiDrawSizePreset(options.form, value)
    options.redrawCharacterMaskSoon()
  }

  function setCharacterMaskCanvas(canvas: HTMLCanvasElement | null) {
    options.characterMaskCanvas.value = canvas
    options.redrawCharacterMaskSoon()
  }

  function syncPresetPrompts() {
    options.syncPresetPromptTags()
  }

  function redrawCharacterMaskWhenVisible() {
    if (document.visibilityState === 'visible')
      options.redrawCharacterMaskSoon()
  }

  watch(() => options.form.characterId, () => {
    if (options.restoringDraft.value)
      return
    applyAiDrawCharacterMetadata(options.form, options.selectedCharacterMetadata.value)
  })

  watch(() => options.form.secondCharacterId, () => {
    if (options.restoringDraft.value)
      return
    applyAiDrawCharacterMetadata(options.form, options.selectedSecondCharacterMetadata.value, 'secondary')
  })

  watch([
    () => options.form.generationMode,
    () => options.form.characterId,
    () => options.form.secondCharacterId,
    () => options.form.loraName,
    () => options.form.secondLoraName,
    () => options.form.triggerWords,
    () => options.form.styleTags,
    () => options.form.stylePresetIds.join('|'),
    () => options.availableStylePromptPresets.value.length,
    () => options.characterInjectedTags.value,
    () => options.secondCharacterInjectedTags.value,
  ], () => {
    if (!options.syncingPresetPrompts.value)
      syncPresetPrompts()
  })

  watch(() => options.form.generationMode, () => {
    const nextSizePreset = applyAiDrawGenerationModeChange(options.form, options.selectedSize.value)
    if (nextSizePreset)
      applySizePreset(nextSizePreset)
    options.redrawCharacterMaskSoon()
  })

  watch(() => [options.form.width, options.form.height], () => {
    options.redrawCharacterMaskSoon()
  })

  onMounted(async () => {
    await Promise.all([
      options.loadServiceStatus(),
      options.loadCapabilities(),
      options.loadPoints(),
      options.loadRecentJobs(),
    ])
    options.restoreDraft()
    options.restorePrefill()
    syncPresetPrompts()
    options.serviceStatusPolling.start()
    window.addEventListener('resize', options.redrawCharacterMaskSoon)
    document.addEventListener('visibilitychange', redrawCharacterMaskWhenVisible)
    options.redrawCharacterMaskSoon()
  })

  onUnmounted(() => {
    options.stopPolling()
    options.serviceStatusPolling.stop()
    window.removeEventListener('resize', options.redrawCharacterMaskSoon)
    document.removeEventListener('visibilitychange', redrawCharacterMaskWhenVisible)
  })

  return {
    applySizePreset,
    handleNsfwModeChange,
    handleNsfwVisibilityChange,
    setCharacterMaskCanvas,
    syncPresetPrompts,
  }
}
