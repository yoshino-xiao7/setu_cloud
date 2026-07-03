import type { Ref } from 'vue'
import { ref } from 'vue'
import { submitDeleteRequest } from '@/api/imageDeleteRequest'

interface UseImageAuditDeleteRequestOptions {
  shouldIgnoreError: (error: unknown) => boolean
  showError: (error: unknown, fallbackMessage: string) => void
  submitting: Ref<boolean>
  success: (content: string) => void
  warning: (content: string) => void
}

export function useImageAuditDeleteRequest(options: UseImageAuditDeleteRequestOptions) {
  const showDeleteRequestModal = ref(false)
  const deleteRequestReason = ref('')
  const deleteTarget = ref<{ pid: number, p: number } | null>(null)

  function handleRequestDelete(pid: number, p: number) {
    deleteTarget.value = { pid, p }
    deleteRequestReason.value = ''
    showDeleteRequestModal.value = true
  }

  async function handleSubmitDeleteRequest() {
    if (!deleteRequestReason.value.trim()) {
      options.warning('请填写删除原因（以便记录日志）')
      return
    }

    if (!deleteTarget.value)
      return

    options.submitting.value = true
    try {
      await submitDeleteRequest(deleteTarget.value.pid, deleteTarget.value.p, deleteRequestReason.value)
      options.success('已提交删除申请，请前往“图片删除申请”页面进行最终审核')
      showDeleteRequestModal.value = false
    }
    catch (e: unknown) {
      if (options.shouldIgnoreError(e))
        return
      options.showError(e, '提交失败')
    }
    finally {
      options.submitting.value = false
    }
  }

  function clearDeleteRequestState() {
    deleteRequestReason.value = ''
    deleteTarget.value = null
  }

  return {
    clearDeleteRequestState,
    deleteRequestReason,
    deleteTarget,
    handleRequestDelete,
    handleSubmitDeleteRequest,
    showDeleteRequestModal,
  }
}
