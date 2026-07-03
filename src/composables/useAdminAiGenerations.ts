import type { AiCapabilityResponse, AiGenerationJob } from '@/api/aiGeneration'
import { useMessage } from 'naive-ui'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { deleteAdminAiGeneration, deleteAdminAiLocalImage, fetchAdminAiGenerations, fetchAiCapabilities, unpublishAdminAiGeneration } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const PAGE_SIZE = 12

export function useAdminAiGenerations() {
  const message = useMessage()
  const loading = ref(false)
  const jobs = shallowRef<AiGenerationJob[]>([])
  const capabilities = shallowRef<AiCapabilityResponse>({
    checkpoints: [],
    loras: [],
    vaes: [],
    characters: [],
    promptPresets: [],
    workers: [],
  })
  const total = ref(0)
  const page = ref(1)
  const status = ref('ALL')
  const reviewStatus = ref('ALL')
  const deleteStatus = ref('ALL')
  const recordState = ref('ALL')
  const jobId = ref<number | null>(null)
  const userId = ref<number | null>(null)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const deleteModal = ref(false)
  const deleteSubmitting = ref(false)
  const deleteTarget = ref<AiGenerationJob | null>(null)
  const deleteForm = reactive({
    reason: '',
  })
  const localDeleteModal = ref(false)
  const localDeleteSubmitting = ref(false)
  const localDeleteTarget = ref<AiGenerationJob | null>(null)
  const localDeleteForm = reactive({ reason: '' })
  const recordStateOptions = [
    { label: '全部历史', value: 'ALL' },
    { label: '正常记录', value: 'ACTIVE' },
    { label: '已删除记录', value: 'DELETED' },
  ]
  const checkpointNameMap = computed(() => {
    const map = new Map<string, string>()
    for (const item of capabilities.value.checkpoints)
      map.set(item.name, item.displayName || item.name)
    return map
  })

  function checkpointDisplayName(checkpoint?: string | null) {
    if (checkpoint)
      return checkpointNameMap.value.get(checkpoint) || checkpoint
    if (capabilities.value.checkpoints.length === 1)
      return `默认模型（${capabilities.value.checkpoints[0].displayName || capabilities.value.checkpoints[0].name}）`
    return '默认模型'
  }

  async function loadCapabilities() {
    try {
      capabilities.value = unwrapApiData(await fetchAiCapabilities(), capabilities.value)
    }
    catch {
      // Capabilities are only used for friendly display names on this page.
    }
  }

  async function loadJobs() {
    loading.value = true
    try {
      const data = unwrapApiData(await fetchAdminAiGenerations({
        jobId: jobId.value || undefined,
        userId: userId.value || undefined,
        status: status.value === 'ALL' ? undefined : status.value,
        reviewStatus: reviewStatus.value === 'ALL' ? undefined : reviewStatus.value,
        deleteStatus: deleteStatus.value === 'ALL' ? undefined : deleteStatus.value,
        recordState: recordState.value,
        page: page.value,
        pageSize: PAGE_SIZE,
      }), {
        total: 0,
        page: page.value,
        pageSize: PAGE_SIZE,
        list: [],
      })
      jobs.value = data.list || []
      total.value = data.total || 0
      page.value = data.page || page.value
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '加载 AI 生成记录失败')
    }
    finally {
      loading.value = false
    }
  }

  function resetPageAndLoad() {
    page.value = 1
    void loadJobs()
  }

  async function unpublish(job: AiGenerationJob) {
    try {
      await unpublishAdminAiGeneration(job.id)
      message.success('已下架')
      await loadJobs()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '下架失败')
    }
  }

  function shouldShowReviewStatus(job: AiGenerationJob) {
    return job.status === 'COMPLETED'
  }

  function traceValue(value?: string | number | null) {
    return value === undefined || value === null || value === '' ? '暂无' : String(value)
  }

  function workerStageLabel(stage?: string | null) {
    switch (stage) {
      case 'CLAIMED':
        return '已领取'
      case 'STARTING_LOCAL_GENERATION':
        return '提交本机生成'
      case 'LOCAL_GENERATION_RUNNING':
        return '本机生成中'
      case 'LOCAL_GENERATION_FAILED':
        return '本机生成失败'
      case 'UPLOADING_TO_CLOUD':
        return '准备上传云端'
      case 'DOWNLOADING_LOCAL_IMAGE':
        return '读取本机图片'
      case 'COMPLETING_CLOUD_JOB':
        return '云端写入 OSS'
      case 'COMPLETED':
        return '云端完成'
      case 'REQUEUED':
        return '已退回队列'
      case 'FAILED':
        return '失败'
      default:
        return stage || '暂无'
    }
  }

  function openDelete(job: AiGenerationJob) {
    deleteTarget.value = job
    deleteForm.reason = ''
    deleteModal.value = true
  }

  async function submitDelete() {
    if (!deleteTarget.value)
      return
    deleteSubmitting.value = true
    try {
      await deleteAdminAiGeneration(deleteTarget.value.id, {
        reason: deleteForm.reason.trim() || undefined,
      })
      message.success('已删除 AI 生图')
      deleteModal.value = false
      await loadJobs()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '删除 AI 生图失败')
    }
    finally {
      deleteSubmitting.value = false
    }
  }

  function openLocalDelete(job: AiGenerationJob) {
    localDeleteTarget.value = job
    localDeleteForm.reason = ''
    localDeleteModal.value = true
  }

  async function submitLocalDelete() {
    if (!localDeleteTarget.value)
      return
    localDeleteSubmitting.value = true
    try {
      await deleteAdminAiLocalImage(localDeleteTarget.value.id, {
        reason: localDeleteForm.reason.trim() || undefined,
      })
      message.success('本机图片删除指令已排队')
      localDeleteModal.value = false
      await loadJobs()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '创建本机图片删除指令失败')
    }
    finally {
      localDeleteSubmitting.value = false
    }
  }

  onMounted(async () => {
    await Promise.all([loadJobs(), loadCapabilities()])
  })

  return {
    checkpointDisplayName,
    deleteForm,
    deleteModal,
    deleteStatus,
    deleteSubmitting,
    jobId,
    jobs,
    loadJobs,
    loading,
    localDeleteForm,
    localDeleteModal,
    localDeleteSubmitting,
    localDeleteTarget,
    openDelete,
    openLocalDelete,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
    recordState,
    recordStateOptions,
    resetPageAndLoad,
    reviewStatus,
    shouldShowReviewStatus,
    status,
    submitDelete,
    submitLocalDelete,
    total,
    traceValue,
    unpublish,
    userId,
    workerStageLabel,
  }
}
