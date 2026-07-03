import type { ComputedRef, ShallowRef } from 'vue'
import type { Router } from 'vue-router'
import type { AiCapabilityResponse } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import type { AiDrawAssetTarget } from '@/composables/useAiDrawFormRules'
import { computed } from 'vue'
import { parseMetadata } from '@/composables/useAiAssets'
import {
  clearAiDrawCharacter,
  clearAiDrawLora,
} from '@/composables/useAiDrawFormRules'

export type AiDrawAssetSelectorTab = 'lora' | 'character' | 'style'

export interface UseAiDrawAssetSelectionOptions {
  capabilities: ShallowRef<AiCapabilityResponse>
  characterAssets: ComputedRef<AssetOption[]>
  loraAssets: ComputedRef<AssetOption[]>
  form: AiDrawDraftForm
  captureDraft: () => void
  router: Router
}

export function useAiDrawAssetSelection(options: UseAiDrawAssetSelectionOptions) {
  const selectedCharacterCapability = computed(() => {
    if (!options.form.characterId)
      return null
    return options.capabilities.value.characters.find(item => item.name === options.form.characterId) || null
  })

  const selectedSecondCharacterCapability = computed(() => {
    if (!options.form.secondCharacterId)
      return null
    return options.capabilities.value.characters.find(item => item.name === options.form.secondCharacterId) || null
  })

  const selectedCharacterMetadata = computed(() => parseMetadata(selectedCharacterCapability.value?.metadataJson))
  const selectedSecondCharacterMetadata = computed(() => parseMetadata(selectedSecondCharacterCapability.value?.metadataJson))

  const selectedLoraAsset = computed(() => options.loraAssets.value.find(item => item.name === options.form.loraName) || null)
  const selectedSecondLoraAsset = computed(() => options.loraAssets.value.find(item => item.name === options.form.secondLoraName) || null)
  const selectedCharacterAsset = computed(() => options.characterAssets.value.find(item => item.name === options.form.characterId) || null)
  const selectedSecondCharacterAsset = computed(() => options.characterAssets.value.find(item => item.name === options.form.secondCharacterId) || null)

  function openAssetSelector(tab: AiDrawAssetSelectorTab, target: AiDrawAssetTarget = 'primary') {
    options.captureDraft()
    void options.router.push({
      path: '/dashboard/ai-assets',
      query: { tab, target },
    })
  }

  function openLoraSelector(target: AiDrawAssetTarget = 'primary') {
    openAssetSelector('lora', target)
  }

  function openCharacterSelector(target: AiDrawAssetTarget = 'primary', tab: 'character' | 'style' = 'character') {
    openAssetSelector(tab, target)
  }

  function clearLora(target: AiDrawAssetTarget = 'primary') {
    clearAiDrawLora(options.form, target)
  }

  function clearCharacter(target: AiDrawAssetTarget = 'primary') {
    clearAiDrawCharacter(options.form, target)
  }

  return {
    clearCharacter,
    clearLora,
    openAssetSelector,
    openCharacterSelector,
    openLoraSelector,
    selectedCharacterAsset,
    selectedCharacterMetadata,
    selectedLoraAsset,
    selectedSecondCharacterAsset,
    selectedSecondCharacterMetadata,
    selectedSecondLoraAsset,
  }
}
