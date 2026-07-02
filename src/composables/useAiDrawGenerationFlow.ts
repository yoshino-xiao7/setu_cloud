import type { MessageApi } from 'naive-ui'
import type { ComputedRef, Ref } from 'vue'
import type { AiGenerationJob, AiNsfwVisibilityLevel, AiPromptTranslateResponse } from '@/api/aiGeneration'
import type { AssetOption } from '@/composables/useAiAssets'
import type { AiDrawDraftForm } from '@/composables/useAiDrawDraftForm'
import { ref } from 'vue'
import {
  createAiGeneration,
  downloadAiGeneration,
  fetchAiGeneration,
  fetchAiPromptTranslation,
  translateAiPrompt,
} from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import {
  canSubmitAiDrawGeneration,
  createAiDrawGenerationPayload,
} from '@/composables/useAiDrawGenerationPayload'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export interface UseAiDrawGenerationFlowOptions {
  activeJob: Ref<AiGenerationJob | null>
  buildCharacterMaskJson: () => string | undefined
  defaultNegative: string
  effectiveNegativePrompt: ComputedRef<string>
  effectivePositivePrompt: ComputedRef<string>
  form: AiDrawDraftForm
  hasDrawablePrompt: ComputedRef<boolean>
  isAdmin: ComputedRef<boolean>
  isDualMode: ComputedRef<boolean>
  loadPoints: () => Promise<void>
  loadRecentJobs: () => Promise<void>
  mergedStyleTags: () => string
  message: MessageApi
  points: Ref<number>
  promptTranslationPollMs: number
  promptTranslationTimeoutMs: number
  selectedCharacterAsset: ComputedRef<AssetOption | null>
  selectedGenerationCost: ComputedRef<number>
  selectedLoraAsset: ComputedRef<AssetOption | null>
  selectedSecondCharacterAsset: ComputedRef<AssetOption | null>
  selectedSecondLoraAsset: ComputedRef<AssetOption | null>
  serviceReady: ComputedRef<boolean>
  serviceStatusMessage: ComputedRef<string>
}

export function useAiDrawGenerationFlow(options: UseAiDrawGenerationFlowOptions) {
  const translating = ref(false)
  const generating = ref(false)
  let pollTimer: number | undefined

  function sleep(ms: number) {
    return new Promise(resolve => window.setTimeout(resolve, ms))
  }

  async function waitForPromptTranslation(id: number): Promise<AiPromptTranslateResponse> {
    const startedAt = Date.now()
    while (Date.now() - startedAt < options.promptTranslationTimeoutMs) {
      const data = unwrapApiData(await fetchAiPromptTranslation(id), null)
      if (!data)
        throw new Error('Prompt translation job not found')
      if (data.status === 'COMPLETED')
        return data
      if (data.status === 'FAILED')
        throw new Error(data.errorMessage || 'Local Ollama prompt translation failed')
      await sleep(options.promptTranslationPollMs)
    }
    throw new Error('Local Ollama prompt translation timed out')
  }

  async function preparePrompt() {
    if (!options.form.promptCn.trim()) {
      options.message.warning('先写一点你想画什么')
      return false
    }
    if (options.isDualMode.value && !options.form.secondCharacterId && !options.form.secondLoraName) {
      options.message.warning('双角色模式需要选择角色 B 或第二个 LoRA')
      return false
    }
    if (!options.serviceReady.value) {
      options.message.warning(options.serviceStatusMessage.value)
      return false
    }
    translating.value = true
    try {
      let data = unwrapApiData(await translateAiPrompt({
        promptCn: options.form.promptCn.trim(),
        styleTags: options.mergedStyleTags() || undefined,
        negativePrompt: options.effectiveNegativePrompt.value || undefined,
        nsfwMode: options.form.nsfwMode,
        nsfwVisibilityLevel: options.form.nsfwVisibilityLevel as AiNsfwVisibilityLevel,
      }), {
        positive: '',
        negative: options.defaultNegative,
        styleNotes: '',
      })
      if (data.status !== 'COMPLETED' && !data.positive) {
        if (!data.id)
          throw new Error('Prompt translation job was not created')
        options.message.info('Local Ollama is generating prompts...')
        data = await waitForPromptTranslation(data.id)
      }
      options.form.promptPositive = data.positive || options.form.promptPositive
      options.form.promptNegative = data.negative || options.defaultNegative
      options.form.styleNotes = data.styleNotes || ''
      options.message.success('提示词已生成')
      return true
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '生成提示词失败')
      return false
    }
    finally {
      translating.value = false
    }
  }

  async function generate() {
    if (!options.hasDrawablePrompt.value) {
      options.message.warning('先填写自然语言、正向提示词，或选择带触发词的角色/LoRA 预设')
      return
    }
    if (!options.serviceReady.value) {
      options.message.warning(options.serviceStatusMessage.value)
      return
    }
    if (!canSubmitAiDrawGeneration(
      options.serviceReady.value,
      options.hasDrawablePrompt.value,
      options.isAdmin.value,
      options.points.value,
      options.selectedGenerationCost.value,
    )) {
      options.message.warning(`积分不足，本次生成需要 ${options.selectedGenerationCost.value} 积分`)
      return
    }
    if (!options.form.promptPositive.trim() && options.form.promptCn.trim()) {
      const prepared = await preparePrompt()
      if (!prepared)
        return
    }

    generating.value = true
    try {
      const job = unwrapApiData(await createAiGeneration(createAiDrawGenerationPayload({
        characterMaskJson: options.buildCharacterMaskJson(),
        effectiveNegativePrompt: options.effectiveNegativePrompt.value,
        effectivePositivePrompt: options.effectivePositivePrompt.value,
        form: options.form,
        isDualMode: options.isDualMode.value,
        selectedCharacterAsset: options.selectedCharacterAsset.value,
        selectedLoraAsset: options.selectedLoraAsset.value,
        selectedSecondCharacterAsset: options.selectedSecondCharacterAsset.value,
        selectedSecondLoraAsset: options.selectedSecondLoraAsset.value,
      })))
      options.activeJob.value = job
      options.message.success('任务已进入队列')
      await options.loadPoints()
      await options.loadRecentJobs()
      startPolling(job.id)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '创建生图任务失败')
    }
    finally {
      generating.value = false
    }
  }

  function startPolling(jobId: number) {
    stopPolling()
    pollTimer = window.setInterval(async () => {
      try {
        const job = unwrapApiData(await fetchAiGeneration(jobId), null)
        if (!job)
          return
        const wasCompleted = options.activeJob.value?.status === 'COMPLETED'
        options.activeJob.value = job
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          stopPolling()
          if (job.status === 'COMPLETED' && !wasCompleted) {
            options.message.success('生图完成，图片仅保留30天，如需永久保存请审核发布至广场或自行下载。', {
              duration: 8000,
            })
          }
          await options.loadPoints()
          await options.loadRecentJobs()
        }
      }
      catch (error) {
        if (!shouldIgnoreApiError(error))
          showApiError(options.message, error, '刷新任务状态失败')
        stopPolling()
      }
    }, 2500)
  }

  async function downloadJob(job: AiGenerationJob) {
    try {
      const data = unwrapApiData(await downloadAiGeneration(job.id), null)
      if (!data?.downloadUrl)
        throw new Error('后端未返回下载地址')
      window.location.href = data.downloadUrl
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '下载图片失败')
    }
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
  }

  return {
    downloadJob,
    generate,
    generating,
    preparePrompt,
    stopPolling,
    translating,
  }
}
