import type { MessageApi } from 'naive-ui'
import type { AiGenerationDeleteRequest } from '@/api/aiGeneration'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import {
  approveAdminAiDeleteRequest,
  fetchAdminAiDeleteRequests,
  rejectAdminAiDeleteRequest,
} from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export interface UseAdminAiDeleteRequestsOptions {
  message: MessageApi
}

export function useAdminAiDeleteRequests(options: UseAdminAiDeleteRequestsOptions) {
  const loading = ref(false)
  const requests = shallowRef<AiGenerationDeleteRequest[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = 10
  const status = ref('WAITING')
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  const rejectModal = ref(false)
  const submitting = ref(false)
  const currentRequest = ref<AiGenerationDeleteRequest | null>(null)
  const rejectForm = reactive({ reason: '' })

  async function loadRequests() {
    loading.value = true
    try {
      const data = unwrapApiData(await fetchAdminAiDeleteRequests({
        status: status.value === 'ALL' ? undefined : status.value,
        page: page.value,
        pageSize,
      }), {
        total: 0,
        page: page.value,
        pageSize,
        list: [],
      })
      requests.value = data.list || []
      total.value = data.total || 0
      page.value = data.page || page.value
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载 AI 删除申请失败')
    }
    finally {
      loading.value = false
    }
  }

  function resetPageAndLoad() {
    page.value = 1
    void loadRequests()
  }

  async function approve(request: AiGenerationDeleteRequest) {
    submitting.value = true
    try {
      await approveAdminAiDeleteRequest(request.id)
      options.message.success('已通过删除申请')
      await loadRequests()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '通过删除申请失败')
    }
    finally {
      submitting.value = false
    }
  }

  function openReject(request: AiGenerationDeleteRequest) {
    currentRequest.value = request
    rejectForm.reason = ''
    rejectModal.value = true
  }

  async function submitReject() {
    if (!currentRequest.value)
      return
    if (!rejectForm.reason.trim()) {
      options.message.warning('请填写拒绝原因')
      return
    }
    submitting.value = true
    try {
      await rejectAdminAiDeleteRequest(currentRequest.value.id, { reason: rejectForm.reason.trim() })
      options.message.success('已拒绝删除申请')
      rejectModal.value = false
      currentRequest.value = null
      await loadRequests()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '拒绝删除申请失败')
    }
    finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    void loadRequests()
  })

  return {
    approve,
    loadRequests,
    loading,
    openReject,
    page,
    pageCount,
    rejectForm,
    rejectModal,
    requests,
    resetPageAndLoad,
    status,
    submitReject,
    submitting,
  }
}
