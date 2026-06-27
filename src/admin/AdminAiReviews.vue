<script setup lang="ts">
import type { AiGenerationReview } from '@/api/aiGeneration'
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { approveAdminAiReview, fetchAdminAiReviews, rejectAdminAiReview } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import {
  AI_CATEGORY_OPTIONS,
  AI_REVIEW_STATUS_OPTIONS,
  getAiCategoryLabel,
  getAiReviewStatusMeta,
} from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
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
      showApiError(message, error, '加载 AI 审核队列失败')
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
    message.success('已通过并发布到广场')
    await loadReviews()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '审核通过失败')
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
    message.warning('请填写拒绝原因')
    return
  }
  submitting.value = true
  try {
    await rejectAdminAiReview(currentReview.value.id, { reason: rejectForm.reason.trim() })
    message.success('已拒绝')
    rejectModal.value = false
    currentReview.value = null
    await loadReviews()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '拒绝失败')
  }
  finally {
    submitting.value = false
  }
}

onMounted(loadReviews)
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1>AI 审核队列</h1>
        <p>独立审核 AI 生成图片，通过后进入 AI 广场</p>
      </div>
      <NButton secondary :loading="loading" @click="loadReviews">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard class="panel-card" :bordered="false">
      <div class="toolbar">
        <NSelect v-model:value="status" :options="AI_REVIEW_STATUS_OPTIONS" class="filter-select" @update:value="resetPageAndLoad" />
        <NSelect v-model:value="category" :options="AI_CATEGORY_OPTIONS" class="filter-select" @update:value="resetPageAndLoad" />
      </div>

      <NSpin :show="loading">
        <div v-if="reviews.length" class="review-list">
          <div v-for="review in reviews" :key="review.id" class="review-row">
            <div class="thumb">
              <NImage
                v-if="review.job?.imageUrl"
                :src="review.job.imageUrl"
                object-fit="cover"
                lazy
                :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
              />
            </div>
            <div class="main">
              <div class="title">
                审核 #{{ review.id }} · 任务 #{{ review.jobId }} · 用户 {{ review.userId }}
              </div>
              <p>{{ review.job?.promptCn }}</p>
              <div class="meta">
                <NTag :type="getAiReviewStatusMeta(review.status).type" size="small" round>
                  {{ getAiReviewStatusMeta(review.status).label }}
                </NTag>
                <NTag :type="review.category === 'R18' ? 'error' : 'success'" size="small" round>
                  {{ getAiCategoryLabel(review.category) }}
                </NTag>
                <span>{{ formatDate(review.createdAt) }}</span>
              </div>
              <div v-if="review.submitNote" class="note">
                {{ review.submitNote }}
              </div>
              <div v-if="review.rejectReason" class="error-line">
                {{ review.rejectReason }}
              </div>
            </div>
            <div class="actions">
              <NButton v-if="review.status === 'WAITING'" type="primary" size="small" :loading="submitting" @click="approve(review)">
                <template #icon>
                  <NIcon><CheckmarkCircleOutline /></NIcon>
                </template>
                通过
              </NButton>
              <NButton v-if="review.status === 'WAITING'" tertiary type="error" size="small" @click="openReject(review)">
                <template #icon>
                  <NIcon><CloseCircleOutline /></NIcon>
                </template>
                拒绝
              </NButton>
            </div>
          </div>
        </div>
        <NEmpty v-else description="暂无审核任务" class="empty" />
      </NSpin>

      <div v-if="total > pageSize" class="pagination">
        <NPagination :page="page" :page-count="pageCount" @update:page="(next) => { page = next; loadReviews() }" />
      </div>
    </NCard>

    <NModal v-model:show="rejectModal" preset="card" title="拒绝审核" :style="{ width: '520px', maxWidth: '92vw' }">
      <NInput
        v-model:value="rejectForm.reason"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 7 }"
        maxlength="300"
        show-count
        placeholder="填写拒绝原因"
      />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="rejectModal = false">
            取消
          </NButton>
          <NButton type="error" :loading="submitting" @click="submitReject">
            确认拒绝
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0;
  color: #263247;
  font-size: 26px;
}

.page-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.panel-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 16px 38px rgba(31, 41, 55, 0.08);
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.filter-select {
  width: 180px;
}

.review-list {
  display: grid;
  gap: 12px;
}

.review-row {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
}

.thumb {
  width: 128px;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
}

.thumb :deep(.n-image),
.thumb :deep(img) {
  width: 100%;
  height: 100%;
}

.thumb :deep(img) {
  object-fit: cover;
}

.title {
  color: #263247;
  font-weight: 800;
}

.main p {
  display: -webkit-box;
  margin: 6px 0;
  overflow: hidden;
  color: #475569;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.note,
.error-line {
  margin-top: 6px;
  font-size: 13px;
}

.note {
  color: #475569;
}

.error-line {
  color: #dc2626;
}

.actions {
  display: grid;
  gap: 8px;
}

.empty {
  min-height: 280px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 760px) {
  .admin-page {
    padding: 16px;
  }

  .review-row {
    grid-template-columns: 1fr;
  }

  .thumb {
    width: 100%;
    max-height: 240px;
  }

  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-select {
    width: 100%;
  }

  .toolbar {
    flex-direction: column;
  }
}
</style>
