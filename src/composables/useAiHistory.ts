import type { AiCapabilityResponse, AiGenerationJob, AiPublicCategory } from '@/api/aiGeneration'
import { useMessage } from 'naive-ui'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  downloadAiGeneration,
  fetchAiCapabilities,
  fetchAiGeneration,
  fetchMyAiGenerations,
  submitAiGenerationDeleteRequest,
  submitAiGenerationReview,
} from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import {
  AI_GENERATION_STATUS_OPTIONS,
  formatFileSize,
  getAiCategoryLabel,
  getAiDeleteStatusMeta,
  getAiGenerationStatusMeta,
  getAiReviewStatusMeta,
} from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const pageSize = 12

export function useAiHistory() {
  const message = useMessage()
  const { copyText } = useCopyToClipboard()
  const router = useRouter()
  const route = useRoute()
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
  const status = ref<string>('ALL')

  const reviewModal = ref(false)
  const reviewSubmitting = ref(false)
  const reviewTarget = ref<AiGenerationJob | null>(null)
  const reviewForm = reactive({
    category: 'GENERAL' as AiPublicCategory,
    note: '',
  })

  const deleteModal = ref(false)
  const deleteSubmitting = ref(false)
  const deleteTarget = ref<AiGenerationJob | null>(null)
  const deleteForm = reactive({
    reason: '',
  })
  const detailModal = ref(false)
  const detailTarget = ref<AiGenerationJob | null>(null)

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
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
      // Capabilities only enrich display names; history loading should not depend on them.
    }
  }

  async function loadJobs() {
    loading.value = true
    try {
      const data = unwrapApiData(await fetchMyAiGenerations({
        status: status.value === 'ALL' ? undefined : status.value,
        page: page.value,
        pageSize,
      }), {
        total: 0,
        page: page.value,
        pageSize,
        list: [],
      })
      jobs.value = data.list || []
      total.value = data.total || 0
      page.value = data.page || page.value
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '加载 AI 绘图历史失败')
    }
    finally {
      loading.value = false
    }
  }

  function handleStatusChange() {
    page.value = 1
    void loadJobs()
  }

  function handlePageChange(nextPage: number) {
    page.value = nextPage
    void loadJobs()
  }

  function openReview(job: AiGenerationJob) {
    reviewTarget.value = job
    reviewForm.category = job.publicCategory === 'R18' ? 'R18' : 'GENERAL'
    reviewForm.note = ''
    reviewModal.value = true
  }

  async function submitReview() {
    if (!reviewTarget.value)
      return
    reviewSubmitting.value = true
    try {
      await submitAiGenerationReview(reviewTarget.value.id, {
        category: reviewForm.category,
        note: reviewForm.note.trim() || undefined,
      })
      message.success('已提交审核')
      reviewModal.value = false
      await loadJobs()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '提交审核失败')
    }
    finally {
      reviewSubmitting.value = false
    }
  }

  function canSubmitReview(job: AiGenerationJob) {
    return job.status === 'COMPLETED'
      && Boolean(job.imageUrl)
      && job.privateOssStatus !== 'EXPIRED'
      && job.privateOssStatus !== 'EXPLICITLY_DELETED'
      && job.reviewStatus !== 'WAITING'
      && job.reviewStatus !== 'APPROVED'
  }

  function shouldShowReviewStatus(job: AiGenerationJob) {
    return job.status === 'COMPLETED'
  }

  function canSubmitDelete(job: AiGenerationJob) {
    return !job.deleted && job.deleteStatus !== 'WAITING' && job.deleteStatus !== 'APPROVED'
  }

  function openDetail(job: AiGenerationJob) {
    detailTarget.value = job
    detailModal.value = true
  }

  function reuseJob(job: AiGenerationJob) {
    window.sessionStorage.setItem('ai-draw-prefill', JSON.stringify({ ...job, seed: null }))
    void router.push('/dashboard/ai-draw')
  }

  async function copyPrompt(job: AiGenerationJob) {
    const text = [
      `正向提示词：${job.promptPositive || job.promptCn || ''}`,
      `反向提示词：${job.promptNegative || ''}`,
    ].join('\n')
    await copyText(text, { successMessage: '提示词已复制' })
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
        showApiError(message, error, '下载图片失败')
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
      await submitAiGenerationDeleteRequest(deleteTarget.value.id, {
        reason: deleteForm.reason.trim() || undefined,
      })
      message.success('已提交删除申请')
      deleteModal.value = false
      await loadJobs()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(message, error, '提交删除申请失败')
    }
    finally {
      deleteSubmitting.value = false
    }
  }

  onMounted(async () => {
    await Promise.all([loadJobs(), loadCapabilities()])
    const targetId = Number(route.query.jobId)
    if (Number.isInteger(targetId) && targetId > 0) {
      try {
        detailTarget.value = unwrapApiData(await fetchAiGeneration(targetId), null)
        detailModal.value = detailTarget.value !== null
      }
      catch (error) {
        if (!shouldIgnoreApiError(error))
          showApiError(message, error, '加载指定 AI 绘图记录失败')
      }
    }
  })

  return {
    AI_GENERATION_STATUS_OPTIONS,
    canSubmitDelete,
    canSubmitReview,
    checkpointDisplayName,
    copyPrompt,
    deleteForm,
    deleteModal,
    deleteSubmitting,
    detailModal,
    detailTarget,
    downloadJob,
    formatDate,
    formatFileSize,
    getAiCategoryLabel,
    getAiDeleteStatusMeta,
    getAiGenerationStatusMeta,
    getAiReviewStatusMeta,
    handlePageChange,
    handleStatusChange,
    jobs,
    loadJobs,
    loading,
    openDelete,
    openDetail,
    openReview,
    page,
    pageCount,
    pageSize,
    reuseJob,
    reviewForm,
    reviewModal,
    reviewSubmitting,
    shouldShowReviewStatus,
    status,
    submitDelete,
    submitReview,
    total,
  }
}
