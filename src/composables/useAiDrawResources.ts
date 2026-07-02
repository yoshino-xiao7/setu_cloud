import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type { AiCapabilityResponse, AiGenerationJob, AiServiceStatusResponse } from '@/api/aiGeneration'
import { computed, ref, shallowRef } from 'vue'
import { fetchAiCapabilities, fetchAiStatus, fetchMyAiGenerations } from '@/api/aiGeneration'
import { getMyPoints } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { parseMetadata, toAssetOption } from '@/composables/useAiAssets'
import {
  getAiDrawQueueStatusText,
  getAiDrawServiceReady,
  getAiDrawServiceStatusLabel,
  getAiDrawServiceStatusMessage,
  getAiDrawServiceStatusType,
} from '@/composables/useAiDrawResourceStatus'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useVisibilityPolling } from '@/composables/useVisibilityPolling'

export const EMPTY_AI_CAPABILITIES: AiCapabilityResponse = {
  checkpoints: [],
  loras: [],
  vaes: [],
  characters: [],
  promptPresets: [],
  workers: [],
}

export interface UseAiDrawResourcesOptions {
  isAdmin: ComputedRef<boolean>
  message: MessageApi
  serviceStatusPollMs: number
}

export function useAiDrawResources(options: UseAiDrawResourcesOptions) {
  const capabilities = shallowRef<AiCapabilityResponse>({ ...EMPTY_AI_CAPABILITIES })
  const serviceStatus = shallowRef<AiServiceStatusResponse | null>(null)
  const recentJobs = shallowRef<AiGenerationJob[]>([])
  const loadingCapabilities = ref(false)
  const loadingServiceStatus = ref(false)
  const historyLoading = ref(false)
  const pointsLoading = ref(false)
  const points = ref(0)

  const defaultCheckpointLabel = computed(() => {
    if (capabilities.value.checkpoints.length === 1) {
      const checkpoint = capabilities.value.checkpoints[0]
      return `默认模型：${checkpoint.displayName || checkpoint.name}`
    }
    return '默认模型'
  })

  const checkpointOptions = computed(() => [
    { label: defaultCheckpointLabel.value, value: '' },
    ...capabilities.value.checkpoints.map(item => ({
      label: item.displayName || item.name,
      value: item.name,
    })),
  ])

  const loraAssets = computed(() => capabilities.value.loras.map(item => toAssetOption(item, '未分类')))
  const characterAssets = computed(() => capabilities.value.characters.map(item => toAssetOption(item, '未分类角色')))
  const serviceReady = computed(() => getAiDrawServiceReady(serviceStatus.value))
  const queueStatusText = computed(() => getAiDrawQueueStatusText(serviceStatus.value))
  const serviceStatusType = computed(() => getAiDrawServiceStatusType(serviceStatus.value))
  const serviceStatusLabel = computed(() => getAiDrawServiceStatusLabel(serviceStatus.value, loadingServiceStatus.value))
  const serviceStatusMessage = computed(() => getAiDrawServiceStatusMessage(serviceStatus.value))

  async function loadServiceStatus() {
    loadingServiceStatus.value = true
    try {
      serviceStatus.value = unwrapApiData(await fetchAiStatus(), serviceStatus.value)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载AI服务状态失败')
    }
    finally {
      loadingServiceStatus.value = false
    }
  }

  const serviceStatusPolling = useVisibilityPolling(loadServiceStatus, {
    intervalMs: options.serviceStatusPollMs,
  })

  async function loadCapabilities() {
    loadingCapabilities.value = true
    try {
      capabilities.value = unwrapApiData(await fetchAiCapabilities(), capabilities.value)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载模型能力失败')
    }
    finally {
      loadingCapabilities.value = false
    }
  }

  async function loadPoints() {
    if (options.isAdmin.value) {
      points.value = Number.POSITIVE_INFINITY
      return
    }
    pointsLoading.value = true
    try {
      const data = unwrapApiData(await getMyPoints(), { points: 0 })
      points.value = Number(data.points || 0)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载积分失败')
    }
    finally {
      pointsLoading.value = false
    }
  }

  async function loadRecentJobs() {
    historyLoading.value = true
    try {
      const data = unwrapApiData(await fetchMyAiGenerations({ page: 1, pageSize: 6 }), {
        total: 0,
        page: 1,
        pageSize: 6,
        list: [],
      })
      recentJobs.value = data.list || []
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载最近生成失败')
    }
    finally {
      historyLoading.value = false
    }
  }

  function findSelectedCharacterMetadata(characterId: string) {
    const capability = characterId
      ? capabilities.value.characters.find(item => item.name === characterId)
      : null
    return parseMetadata(capability?.metadataJson)
  }

  return {
    capabilities,
    characterAssets,
    checkpointOptions,
    historyLoading,
    loraAssets,
    loadCapabilities,
    loadPoints,
    loadRecentJobs,
    loadServiceStatus,
    loadingCapabilities,
    loadingServiceStatus,
    points,
    pointsLoading,
    queueStatusText,
    recentJobs,
    serviceReady,
    serviceStatus,
    serviceStatusLabel,
    serviceStatusMessage,
    serviceStatusPolling,
    serviceStatusType,
    findSelectedCharacterMetadata,
  }
}
