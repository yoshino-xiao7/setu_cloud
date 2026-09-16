import type { MessageApi } from 'naive-ui'
import type {
  AiChatDrawModelOption,
  AiChatDrawProviderConfig,
  AiChatDrawProviderPreset,
} from '@/api/aiChatDrawAdmin'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  activateAiChatDrawProvider,
  createAiChatDrawProvider,
  deleteAiChatDrawProvider,
  fetchAiChatDrawProviderModels,
  fetchAiChatDrawProviders,
  updateAiChatDrawProvider,
} from '@/api/aiChatDrawAdmin'
import { unwrapApiData } from '@/api/response'
import { AI_CHAT_DRAW_TOKENS_PER_POINT } from '@/composables/ai-chat-draw/aiChatDrawUsage'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const PROTOCOL_OPTIONS = [
  { label: 'openai-completions', value: 'openai-completions' },
  { label: 'openai-responses', value: 'openai-responses' },
  { label: 'anthropic-messages', value: 'anthropic-messages' },
]

type EditorMode = 'create-custom' | 'create-preset' | 'edit'

export function useAiChatDrawAdminSettings(message: MessageApi) {
  const loading = ref(false)
  const saving = ref(false)
  const activating = ref(false)
  const deletingId = ref<number | null>(null)
  const loadingModels = ref(false)
  const providers = ref<AiChatDrawProviderConfig[]>([])
  const presets = ref<AiChatDrawProviderPreset[]>([])
  const activeId = ref<number | null>(null)
  const editorVisible = ref(false)
  const editorMode = ref<EditorMode>('create-custom')
  const editingId = ref<number | null>(null)
  const editingConfigured = ref(false)
  const catalogModels = ref<AiChatDrawModelOption[]>([])

  const form = reactive({
    providerId: '',
    displayName: '',
    baseUrl: '',
    apiProtocol: 'openai-completions',
    apiKey: '',
    model: '',
    enabled: true,
    tokensPerPoint: AI_CHAT_DRAW_TOKENS_PER_POINT,
    custom: true,
    activate: true,
  })

  const activeOptions = computed(() => providers.value
    .filter(item => item.enabled !== false && item.apiKeyConfigured && item.id != null)
    .map(item => ({
      label: `${item.displayName} · ${item.model}`,
      value: item.id as number,
    })))

  const availablePresets = computed(() => {
    const used = new Set(providers.value.map(item => item.providerId))
    return presets.value.filter(item => !used.has(item.providerId))
  })

  const apiKeyHint = computed(() => {
    if (form.apiKey.trim())
      return '将使用本次填写的新密钥'
    if (editingConfigured.value)
      return '已配置密钥（留空则保持不变）'
    return '尚未配置密钥，请填写后保存'
  })

  const modelOptions = computed(() => {
    const options = catalogModels.value.map(item => ({
      label: item.name && item.name !== item.id ? `${item.name} (${item.id})` : item.id,
      value: item.id,
    }))
    if (form.model.trim() && !options.some(item => item.value === form.model.trim()))
      options.unshift({ label: form.model.trim(), value: form.model.trim() })
    return options
  })

  const catalogHint = computed(() => {
    if (loadingModels.value)
      return '正在从上游拉取模型列表…'
    if (catalogModels.value.length)
      return `已获取 ${catalogModels.value.length} 个模型；也可直接输入目录外的模型 ID。`
    return '模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。'
  })

  const editorTitle = computed(() => {
    if (editorMode.value === 'edit')
      return '编辑提供方'
    if (editorMode.value === 'create-preset')
      return '添加提供方'
    return '添加自定义提供方'
  })

  function resetForm() {
    form.providerId = ''
    form.displayName = ''
    form.baseUrl = ''
    form.apiProtocol = 'openai-completions'
    form.apiKey = ''
    form.model = ''
    form.enabled = true
    form.tokensPerPoint = AI_CHAT_DRAW_TOKENS_PER_POINT
    form.custom = true
    form.activate = true
    catalogModels.value = []
    editingConfigured.value = false
  }

  function applyProviderToForm(item: AiChatDrawProviderConfig) {
    form.providerId = item.providerId
    form.displayName = item.displayName
    form.baseUrl = item.baseUrl || item.envFallbackBaseUrl || ''
    form.apiProtocol = item.apiProtocol || 'openai-completions'
    form.apiKey = ''
    form.model = item.model || item.envFallbackModel || ''
    form.enabled = item.enabled !== false
    form.tokensPerPoint = item.tokensPerPoint || AI_CHAT_DRAW_TOKENS_PER_POINT
    form.custom = item.custom !== false
    form.activate = false
    editingConfigured.value = !!item.apiKeyConfigured
    catalogModels.value = []
  }

  function applyPresetToForm(preset: AiChatDrawProviderPreset) {
    form.providerId = preset.providerId
    form.displayName = preset.displayName
    form.baseUrl = preset.baseUrl
    form.apiProtocol = preset.apiProtocol
    form.apiKey = ''
    form.model = preset.model
    form.enabled = true
    form.tokensPerPoint = AI_CHAT_DRAW_TOKENS_PER_POINT
    form.custom = false
    form.activate = true
    editingConfigured.value = false
    catalogModels.value = []
  }

  async function load() {
    loading.value = true
    try {
      const catalog = unwrapApiData(await fetchAiChatDrawProviders(), null)
      providers.value = catalog?.providers || []
      presets.value = catalog?.presets || []
      activeId.value = catalog?.activeId ?? null
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '加载对话绘画提供方失败')
    }
    finally {
      loading.value = false
    }
  }

  function openCreateCustom() {
    editorMode.value = 'create-custom'
    editingId.value = null
    resetForm()
    form.custom = true
    form.activate = providers.value.length === 0
    editorVisible.value = true
  }

  function openCreatePreset(preset: AiChatDrawProviderPreset) {
    editorMode.value = 'create-preset'
    editingId.value = null
    applyPresetToForm(preset)
    form.activate = providers.value.length === 0
    editorVisible.value = true
  }

  function openEdit(item: AiChatDrawProviderConfig) {
    if (item.id == null)
      return
    editorMode.value = 'edit'
    editingId.value = item.id
    applyProviderToForm(item)
    editorVisible.value = true
  }

  function closeEditor() {
    editorVisible.value = false
  }

  async function fetchModels() {
    if (!form.baseUrl.trim()) {
      message.warning('请先填写 API 地址')
      return
    }
    if (!form.apiKey.trim() && !editingConfigured.value) {
      message.warning('请先填写 API 密钥')
      return
    }
    loadingModels.value = true
    try {
      const catalog = unwrapApiData(await fetchAiChatDrawProviderModels({
        providerId: editingId.value,
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
    if (!editingConfigured.value && !form.apiKey.trim()) {
      message.warning('请填写 API 密钥')
      return
    }
    saving.value = true
    try {
      const payload = {
        providerId: form.providerId.trim(),
        displayName: form.displayName.trim(),
        baseUrl: form.baseUrl.trim(),
        apiProtocol: form.apiProtocol,
        apiKey: form.apiKey.trim() || null,
        model: form.model.trim(),
        enabled: form.enabled,
        tokensPerPoint: Math.max(1, Number(form.tokensPerPoint) || AI_CHAT_DRAW_TOKENS_PER_POINT),
        custom: form.custom,
        activate: form.activate,
      }
      if (editorMode.value === 'edit' && editingId.value != null)
        await updateAiChatDrawProvider(editingId.value, payload)
      else
        await createAiChatDrawProvider(payload)
      message.success(editorMode.value === 'edit' ? '提供方已更新' : '提供方已添加')
      editorVisible.value = false
      await load()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '保存失败')
    }
    finally {
      saving.value = false
    }
  }

  async function activate(id: number | null) {
    if (id == null || id === activeId.value)
      return
    activating.value = true
    try {
      await activateAiChatDrawProvider(id)
      message.success('已切换当前使用模型')
      await load()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '切换失败')
    }
    finally {
      activating.value = false
    }
  }

  async function remove(item: AiChatDrawProviderConfig) {
    if (item.id == null)
      return
    deletingId.value = item.id
    try {
      await deleteAiChatDrawProvider(item.id)
      message.success('已删除提供方')
      await load()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '删除失败')
    }
    finally {
      deletingId.value = null
    }
  }

  onMounted(() => {
    void load()
  })

  return {
    PROTOCOL_OPTIONS,
    activating,
    activeId,
    activeOptions,
    activate,
    apiKeyHint,
    availablePresets,
    catalogHint,
    closeEditor,
    deletingId,
    editorMode,
    editorTitle,
    editorVisible,
    fetchModels,
    form,
    load,
    loading,
    loadingModels,
    modelOptions,
    openCreateCustom,
    openCreatePreset,
    openEdit,
    providers,
    remove,
    save,
    saving,
  }
}
