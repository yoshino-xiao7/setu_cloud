import type { ApiKeyItem } from '@/api/apiKey'
import { useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import {
  createApiKey,
  deleteApiKey,
  fetchMyApiKeys,
  renameApiKey,
  setApiKeyStatus,
} from '@/api/apiKey'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { formatDateOnly } from '@/utils/dateFormat'

export function useApiKeyList() {
  const message = useMessage()
  const { copyText } = useCopyToClipboard()
  const dialog = useDialog()
  const loadGuard = useRequestGuard()

  const loading = ref(false)
  const items = ref<ApiKeyItem[]>([])
  const loadError = ref('')

  const showCreateModal = ref(false)
  const createForm = ref({ name: '', dailyQuota: 1000, totalQuota: null as number | null })
  const creating = ref(false)
  const lastCreatedKey = ref<string | null>(null)
  const showKeyResultModal = ref(false)

  const showRenameModal = ref(false)
  const renameForm = ref({ id: 0, name: '' })
  const renaming = ref(false)

  const keyStats = computed(() => {
    const enabled = items.value.filter(item => item.status === 1).length
    const callsToday = items.value.reduce((sum, item) => sum + Number(item.callsToday || 0), 0)
    const totalCalls = items.value.reduce((sum, item) => sum + Number(item.totalCalls || 0), 0)
    return {
      total: items.value.length,
      enabled,
      callsToday,
      totalCalls,
    }
  })

  async function loadData() {
    const requestId = loadGuard.next()
    loading.value = true
    loadError.value = ''
    try {
      const list = await fetchMyApiKeys()
      if (!loadGuard.isCurrent(requestId))
        return
      items.value = list
    }
    catch (e: unknown) {
      if (!loadGuard.isCurrent(requestId) || shouldIgnoreApiError(e))
        return
      loadError.value = getApiErrorMessage(e, '加载列表失败')
      showApiError(message, e, '加载列表失败')
    }
    finally {
      if (loadGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  function openCreate() {
    createForm.value = { name: '', dailyQuota: 1000, totalQuota: null }
    showCreateModal.value = true
  }

  async function handleCreate() {
    if (!createForm.value.name.trim())
      return message.warning('请填写名称')
    creating.value = true
    try {
      const payload = {
        name: createForm.value.name.trim(),
        dailyQuota: createForm.value.dailyQuota,
        totalQuota: createForm.value.totalQuota,
      }
      lastCreatedKey.value = await createApiKey(payload)
      message.success('创建成功')
      showCreateModal.value = false
      showKeyResultModal.value = true
      await loadData()
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      showApiError(message, e, '创建失败')
    }
    finally {
      creating.value = false
    }
  }

  async function copyCreatedKey() {
    if (!lastCreatedKey.value)
      return
    await copyText(lastCreatedKey.value, { successMessage: '已复制' })
  }

  function openRename(item: ApiKeyItem) {
    renameForm.value = { id: item.id, name: item.name }
    showRenameModal.value = true
  }

  async function handleRename() {
    if (!renameForm.value.name.trim())
      return message.warning('名称不能为空')
    renaming.value = true
    try {
      await renameApiKey(renameForm.value.id, renameForm.value.name.trim())
      message.success('修改成功')
      showRenameModal.value = false
      await loadData()
    }
    catch {
      message.error('修改失败')
    }
    finally {
      renaming.value = false
    }
  }

  function toggleStatus(item: ApiKeyItem) {
    const targetStatus = item.status === 1 ? 0 : 1
    dialog.warning({
      title: '状态变更',
      content: `确定要${targetStatus === 1 ? '启用' : '禁用'}「${item.name}」吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await setApiKeyStatus(item.id, targetStatus === 1)
          message.success('操作成功')
          await loadData()
        }
        catch {
          message.error('操作失败')
        }
      },
    })
  }

  function handleDelete(item: ApiKeyItem) {
    dialog.error({
      title: '删除确认',
      content: `确定要删除「${item.name}」吗？此操作不可撤销。`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await deleteApiKey(item.id)
          message.success('删除成功')
          await loadData()
        }
        catch {
          message.error('删除失败')
        }
      },
    })
  }

  onMounted(() => {
    void loadData()
  })

  return {
    copyCreatedKey,
    createForm,
    creating,
    formatDateOnly,
    handleCreate,
    handleDelete,
    handleRename,
    items,
    keyStats,
    lastCreatedKey,
    loadData,
    loadError,
    loading,
    openCreate,
    openRename,
    renameForm,
    renaming,
    showCreateModal,
    showKeyResultModal,
    showRenameModal,
    toggleStatus,
  }
}
