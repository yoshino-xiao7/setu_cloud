import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type { AiChatDrawMessage, AiChatDrawSession, AiChatDrawSessionDetail, AiChatDrawStreamEvent } from '@/api/aiChatDraw'
import type { AiGenerationJob } from '@/api/aiGeneration'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  createAiChatDrawSession,
  fetchAiChatDrawSession,
  fetchAiChatDrawSessions,
  streamAiChatDrawMessage,
} from '@/api/aiChatDraw'
import { downloadAiGeneration, fetchAiGeneration } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import {
  AI_CHAT_DRAW_POLL_MS,
  AI_CHAT_DRAW_RATE_LIMIT_SECONDS,
  AI_CHAT_DRAW_TOKENS_PER_POINT,
  chatDrawTurnLikelySucceeded,
  formatAiChatDrawPricing,
  isTransientChatDrawSendError,
  nextAiChatDrawCooldownSeconds,
  parseAiChatDrawRetrySeconds,
} from '@/composables/ai-chat-draw/aiChatDrawUsage'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export interface UseAiChatDrawPageOptions {
  isAdmin: ComputedRef<boolean>
  loadPoints: () => Promise<void>
  message: MessageApi
}

export function useAiChatDrawPage(options: UseAiChatDrawPageOptions) {
  const sessions = shallowRef<AiChatDrawSession[]>([])
  const detail = shallowRef<AiChatDrawSessionDetail | null>(null)
  const input = ref('')
  const nsfwMode = ref(false)
  const sending = ref(false)
  const streamingDraft = ref<{
    content: string
    reasoningContent: string
    status: string
    job: AiGenerationJob | null
  } | null>(null)
  const loading = ref(false)
  const cooldownSeconds = ref(0)
  const tokensPerPoint = computed(() => detail.value?.tokensPerPoint || AI_CHAT_DRAW_TOKENS_PER_POINT)
  const pricingText = computed(() => formatAiChatDrawPricing(tokensPerPoint.value))
  const rateLimitSeconds = computed(() => detail.value?.rateLimitSeconds || AI_CHAT_DRAW_RATE_LIMIT_SECONDS)
  const messages = computed(() => detail.value?.messages || [])
  const sessionUsage = computed(() => detail.value?.session?.usage || null)
  const canSend = computed(() => {
    return !sending.value && cooldownSeconds.value <= 0 && input.value.trim().length > 0
  })
  const sendButtonText = computed(() => {
    if (sending.value)
      return '思考并绘画中…'
    if (cooldownSeconds.value > 0)
      return `请 ${cooldownSeconds.value} 秒后再对话`
    if (options.isAdmin.value)
      return '发送，管理员免费'
    return `发送（${pricingText.value}）`
  })

  let cooldownTimer: number | undefined
  let pollTimer: number | undefined

  function applyCooldown(seconds: number) {
    cooldownSeconds.value = Math.max(0, Math.ceil(seconds))
    if (cooldownTimer)
      window.clearInterval(cooldownTimer)
    if (cooldownSeconds.value <= 0)
      return
    cooldownTimer = window.setInterval(() => {
      cooldownSeconds.value = Math.max(0, cooldownSeconds.value - 1)
      if (cooldownSeconds.value <= 0 && cooldownTimer) {
        window.clearInterval(cooldownTimer)
        cooldownTimer = undefined
      }
    }, 1000)
  }

  function applyDetail(next: AiChatDrawSessionDetail | null) {
    detail.value = next
    if (next?.session && !sessions.value.some(item => item.id === next.session.id)) {
      sessions.value = [next.session, ...sessions.value]
    }
    else if (next?.session) {
      sessions.value = sessions.value.map(item => item.id === next.session.id ? next.session : item)
    }
    applyCooldown(nextAiChatDrawCooldownSeconds(next?.retryAfterSeconds))
    syncJobPolling()
  }

  async function loadSessions() {
    const data = unwrapApiData(await fetchAiChatDrawSessions({ page: 1, pageSize: 20 }), {
      total: 0,
      page: 1,
      pageSize: 20,
      list: [],
    })
    sessions.value = data.list || []
  }

  async function loadSession(id: number) {
    loading.value = true
    try {
      applyDetail(unwrapApiData(await fetchAiChatDrawSession(id), null))
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载对话失败')
    }
    finally {
      loading.value = false
    }
  }

  async function startNewConversation() {
    loading.value = true
    try {
      const session = unwrapApiData(await createAiChatDrawSession(), null)
      if (!session?.id)
        throw new Error('未返回对话')
      applyDetail({
        session,
        messages: [],
        cost: 0,
        tokensPerPoint: tokensPerPoint.value,
        rateLimitSeconds: rateLimitSeconds.value,
        retryAfterSeconds: cooldownSeconds.value,
        adminFree: options.isAdmin.value,
      })
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '开新对话失败')
    }
    finally {
      loading.value = false
    }
  }

  async function reloadLatestSessionDetail(preferredSessionId?: number | null) {
    if (preferredSessionId) {
      await loadSession(preferredSessionId)
      return detail.value
    }
    await loadSessions()
    const latestSessionId = sessions.value[0]?.id
    if (!latestSessionId)
      return null
    await loadSession(latestSessionId)
    return detail.value
  }

  async function recoverSendFailure(
    error: unknown,
    content: string,
    sessionId: number | null | undefined,
    previousMessageCount: number,
  ) {
    if (shouldIgnoreApiError(error))
      return true

    const status = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined
    if (status === 429) {
      applyCooldown(parseAiChatDrawRetrySeconds(error, rateLimitSeconds.value))
      await reloadLatestSessionDetail(sessionId)
      return false
    }

    const reloaded = await reloadLatestSessionDetail(sessionId)
    if (chatDrawTurnLikelySucceeded(content, previousMessageCount, reloaded)) {
      input.value = ''
      applyCooldown(nextAiChatDrawCooldownSeconds(reloaded?.retryAfterSeconds))
      try {
        await options.loadPoints()
      }
      catch {
        // Ignore points refresh errors after a recovered chat turn.
      }
      if (isTransientChatDrawSendError(error))
        options.message.info('对话已在后台完成，页面已自动同步。')
      return true
    }

    if (isTransientChatDrawSendError(error))
      applyCooldown(nextAiChatDrawCooldownSeconds(reloaded?.retryAfterSeconds))
    else
      applyCooldown(parseAiChatDrawRetrySeconds(error, rateLimitSeconds.value))
    return false
  }

  function resetStreamingDraft(status = '正在思考…') {
    streamingDraft.value = {
      content: '',
      reasoningContent: '',
      status,
      job: null,
    }
  }

  function applyStreamEvent(event: AiChatDrawStreamEvent) {
    if (event.type === 'status') {
      if (!streamingDraft.value)
        resetStreamingDraft(event.message || '正在处理…')
      else
        streamingDraft.value.status = event.message || streamingDraft.value.status
      return
    }
    if (!streamingDraft.value)
      resetStreamingDraft()
    if (event.type === 'delta' && event.content)
      streamingDraft.value.content += event.content
    if (event.type === 'reasoning' && event.content)
      streamingDraft.value.reasoningContent += event.content
    if (event.type === 'job' && event.job)
      streamingDraft.value.job = event.job
    if (event.type === 'done' && event.detail)
      applyDetail(event.detail)
    if (event.type === 'error' && event.message)
      throw new Error(event.message)
  }

  async function send() {
    const content = input.value.trim()
    if (!content || sending.value || cooldownSeconds.value > 0)
      return
    sending.value = true
    resetStreamingDraft()
    const sessionId = detail.value?.session?.id ?? null
    const previousMessageCount = messages.value.length
    try {
      await streamAiChatDrawMessage({
        sessionId,
        content,
        nsfwMode: nsfwMode.value,
      }, applyStreamEvent)
      input.value = ''
      try {
        await options.loadPoints()
      }
      catch {
        // Ignore points refresh errors after a successful chat turn.
      }
    }
    catch (error) {
      const recovered = await recoverSendFailure(error, content, sessionId, previousMessageCount)
      if (!recovered && !shouldIgnoreApiError(error))
        showApiError(options.message, error, '对话失败')
    }
    finally {
      streamingDraft.value = null
      sending.value = false
    }
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

  function jobsNeedingPoll(list: AiChatDrawMessage[]) {
    return list
      .map(item => item.generationJob)
      .filter((job): job is AiGenerationJob => {
        return !!job && job.status !== 'COMPLETED' && job.status !== 'FAILED'
      })
  }

  function syncJobPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
    const pending = jobsNeedingPoll(messages.value)
    if (!pending.length)
      return
    pollTimer = window.setInterval(async () => {
      const current = detail.value
      if (!current)
        return
      const nextMessages = [...current.messages]
      let changed = false
      for (let index = 0; index < nextMessages.length; index += 1) {
        const job = nextMessages[index]?.generationJob
        if (!job || job.status === 'COMPLETED' || job.status === 'FAILED')
          continue
        try {
          const latest = unwrapApiData(await fetchAiGeneration(job.id), null)
          if (!latest)
            continue
          nextMessages[index] = { ...nextMessages[index], generationJob: latest }
          changed = true
        }
        catch (error) {
          if (!shouldIgnoreApiError(error))
            showApiError(options.message, error, '刷新绘图任务失败')
        }
      }
      if (changed) {
        detail.value = { ...current, messages: nextMessages }
        if (!jobsNeedingPoll(nextMessages).length && pollTimer) {
          window.clearInterval(pollTimer)
          pollTimer = undefined
        }
      }
    }, AI_CHAT_DRAW_POLL_MS)
  }

  watch(messages, () => {
    syncJobPolling()
  })

  onMounted(async () => {
    try {
      await loadSessions()
      if (sessions.value[0]?.id)
        await loadSession(sessions.value[0].id)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载对话列表失败')
    }
  })

  onBeforeUnmount(() => {
    if (cooldownTimer)
      window.clearInterval(cooldownTimer)
    if (pollTimer)
      window.clearInterval(pollTimer)
  })

  return {
    pricingText,
    tokensPerPoint,
    canSend,
    cooldownSeconds,
    detail,
    downloadJob,
    input,
    loading,
    loadSession,
    messages,
    nsfwMode,
    send,
    sendButtonText,
    sending,
    sessions,
    sessionUsage,
    startNewConversation,
    streamingDraft,
  }
}
