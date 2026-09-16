import type { MessageApi } from 'naive-ui'
import type { AiChatDrawModelOption, AiChatDrawProviderConfig } from '@/api/aiChatDrawAdmin'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  fetchAiChatDrawProviderConfig,
  fetchAiChatDrawProviderModels,
  updateAiChatDrawProviderConfig,
} from '@/api/aiChatDrawAdmin'
import { unwrapApiData } from '@/api/response'
import { AI_CHAT_DRAW_TOKENS_PER_POINT } from '@/composables/ai-chat-draw/aiChatDrawUsage'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const PROTOCOL_OPTIONS = [
  { label: 'openai-completions', value: 'openai-completions' },
  { label: 'openai-responses', value: 'openai-responses' },
  { label: 'anthropic-messages', value: 'anthropic-messages' },
]

export function useAiChatDrawAdminSettings(message: MessageApi) {
  const loading = ref(false)
  const saving = ref(false)
  const loadingModels = ref(false)
  const config = ref<AiChatDrawProviderConfig | null>(null)
  const catalogModels = ref<AiChatDrawModelOption[]>([])
  const form = reactive({
    providerId: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiProtocol: 'openai-completions',
    apiKey: '',
    model: 'deepseek-flash',
    enabled: true,
    tokensPerPoint: AI_CHAT_DRAW_TOKENS_PER_POINT,
  })

  const apiKeyHint = computed(() => {
    if (form.apiKey.trim())
      return '将使用本次填写的新密钥'
    if (config.value?.apiKeyConfigured)
      return `已配置：${config.value.apiKeyMasked || '****'}（留空则保持不变）`
    return '尚未配置密钥，请填写后保存'
  })

  const modelOptions = computed(() => {
    const options = catalogModels.value.map(item => ({
      label: item.name && item.name !== item.id ? `${item.name} (${item.id})` : item.id,
      value: item.id,
    }))
    if (form.model.trim() && !options.some(item => item.value === form.model.trim())) {
      options.unshift({ label: form.model.trim(), value: form.model.trim() })
    }
    return options
  })

  const catalogHint = computed(() => {
    if (loadingModels.value)
      return '正在从上游拉取模型列表…'
    if (catalogModels.value.length)
      return `已获取 ${catalogModels.value.length} 个模型；也可直接输入目录外的模型 ID。`
    return '模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。'
  })

  function applyConfig(next: AiChatDrawProviderConfig | null) {
    config.value = next
    if (!next)
      return
    form.providerId = next.providerId || 'deepseek'
    form.displayName = next.displayName || 'DeepSeek'
    form.baseUrl = next.baseUrl || next.envFallbackBaseUrl || 'https://api.deepseek.com'
    form.apiProtocol = next.apiProtocol || 'openai-completions'
    form.apiKey = ''
    form.model = next.model || next.envFallbackModel || 'deepseek-flash'
    form.enabled = next.enabled !== false
    form.tokensPerPoint = next.tokensPerPoint || AI_CHAT_DRAW_TOKENS_PER_POINT
  }

  async function load() {
    loading.value = true
    try {
      applyConfig(unwrapApiData(await fetchAiChatDrawProviderConfig(), null))
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '加载对话绘画提供方失败')
    }
    finally {
      loading.value = false
    }
  }

  async function fetchModels() {
    if (!form.baseUrl.trim()) {
      message.warning('请先填写 API 地址')
      return
    }
    if (!form.apiKey.trim() && !config.value?.apiKeyConfigured) {
      message.warning('请先填写 API 密钥')
      return
    }
    loadingModels.value = true
    try {
      const catalog = unwrapApiData(await fetchAiChatDrawProviderModels({
        baseUrl: form.baseUrl.trim(),
        apiProtocol: form.apiProtocol,
        apiKey: form.apiKey.trim() || null,
      }), null)
      catalogModels.value = catalog?.models || []
      if (!catalogModels.value.length)
        message.warning('上游未返回可用模型')
      else
        message.success(`已获取 ${catalogModels.value.length} 个模型`)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '获取可用模型失败')
    }
    finally {
      loadingModels.value = false
    }
  }

  async function save() {
    if (!form.providerId.trim() || !form.displayName.trim() || !form.baseUrl.trim() || !form.model.trim()) {
      message.warning('请完整填写提供方信息')
      return
    }
    if (!config.value?.apiKeyConfigured && !form.apiKey.trim()) {
      message.warning('请填写 API 密钥')
      return
    }
    saving.value = true
    try {
      const next = unwrapApiData(await updateAiChatDrawProviderConfig({
        providerId: form.providerId.trim(),
        displayName: form.displayName.trim(),
        baseUrl: form.baseUrl.trim(),
        apiProtocol: form.apiProtocol,
        apiKey: form.apiKey.trim() || null,
        model: form.model.trim(),
        enabled: form.enabled,
        tokensPerPoint: Math.max(1, Number(form.tokensPerPoint) || AI_CHAT_DRAW_TOKENS_PER_POINT),
      }), null)
      applyConfig(next)
      message.success('对话绘画提供方已保存')
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '保存失败')
    }
    finally {
      saving.value = false
    }
  }

  onMounted(() => {
    void load()
  })

  return {
    PROTOCOL_OPTIONS,
    apiKeyHint,
    catalogHint,
    catalogModels,
    config,
    fetchModels,
    form,
    load,
    loading,
    loadingModels,
    modelOptions,
    save,
    saving,
  }
}
