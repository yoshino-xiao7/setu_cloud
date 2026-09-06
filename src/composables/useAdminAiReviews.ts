import type { MessageApi } from 'naive-ui'
import type { AiGenerationReview } from '@/api/aiGeneration'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { approveAdminAiReview, fetchAdminAiReviews, rejectAdminAiReview } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export interface UseAdminAiReviewsOptions {
  message: MessageApi
}

export function useAdminAiReviews(options: UseAdminAiReviewsOptions) {
  const loading = ref(false)
  const reviews = shallowRef<AiGenerationReview[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = 10
  const status = ref('WAITING')
  const category = ref('ALL')
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  const rejectModal = ref(false)
  const submitting = ref(false)
  const currentReview = ref<AiGenerationReview | null>(null)
  const rejectForm = reactive({ reason: '' })

  async function loadReviews() {
    loading.value = true
    try {
      const data = unwrapApiData(await fetchAdminAiReviews({
        status: status.value === 'ALL' ? undefined : status.value,
        category: category.value === 'ALL' ? undefined : category.value,
        page: page.value,
        pageSize,
      }), {
        total: 0,
        page: page.value,
        pageSize,
        list: [],
      })
      reviews.value = data.list || []
      total.value = data.total || 0
      page.value = data.page || page.value
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载 AI 审核队列失败')
    }
    finally {
      loading.value = false
    }
  }

  function resetPageAndLoad() {
    page.value = 1
    void loadReviews()
  }

  async function approve(review: AiGenerationReview) {
    submitting.value = true
    try {
      await approveAdminAiReview(review.id)
      options.message.success('已通过并发布到广场')
      await loadReviews()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '审核通过失败')
    }
    finally {
      submitting.value = false
    }
  }

  function openReject(review: AiGenerationReview) {
    currentReview.value = review
    rejectForm.reason = ''
    rejectModal.value = true
  }

  async function submitReject() {
    if (!currentReview.value)
      return
    if (!rejectForm.reason.trim()) {
      options.message.warning('请填写拒绝原因')
      return
    }
    submitting.value = true
    try {
      await rejectAdminAiReview(currentReview.value.id, { reason: rejectForm.reason.trim() })
      options.message.success('已拒绝')
      rejectModal.value = false
      currentReview.value = null
      await loadReviews()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '拒绝失败')
    }
    finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    void loadReviews()
  })

  return {
    approve,
    category,
    loadReviews,
    loading,
    openReject,
    page,
    pageCount,
    rejectForm,
    rejectModal,
    resetPageAndLoad,
    reviews,
    status,
    submitReject,
    submitting,
  }
}
