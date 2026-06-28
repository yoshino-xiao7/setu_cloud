<script setup lang="ts">
import type { AiCapabilityResponse, AiGenerationJob, AiPublicCategory } from '@/api/aiGeneration'
import {
  CheckmarkCircleOutline,
  EyeOutline,
  RefreshOutline,
  SendOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAiCapabilities, fetchMyAiGenerations, submitAiGenerationDeleteRequest, submitAiGenerationReview } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import {
  AI_GENERATION_STATUS_OPTIONS,
  formatFileSize,
  getAiCategoryLabel,
  getAiDeleteStatusMeta,
  getAiGenerationStatusMeta,
  getAiReviewStatusMeta,
} from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const router = useRouter()
const loading = ref(false)
const jobs = shallowRef<AiGenerationJob[]>([])
const capabilities = shallowRef<AiCapabilityResponse>({
  checkpoints: [],
  loras: [],
  vaes: [],
  characters: [],
  workers: [],
})
const total = ref(0)
const page = ref(1)
const pageSize = 12
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
    // Capabilities are only used for friendly display names on this page.
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
  return job.status === 'COMPLETED' && job.reviewStatus !== 'WAITING' && job.reviewStatus !== 'APPROVED'
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

function reuseJob(job: AiGenerationJob, clearSeed = false) {
  window.sessionStorage.setItem('ai-draw-prefill', JSON.stringify({ ...job, clearSeed }))
  void router.push('/dashboard/ai-draw')
}

async function copyPrompt(job: AiGenerationJob) {
  const text = [
    `正向提示词：${job.promptPositive || job.promptCn || ''}`,
    `反向提示词：${job.promptNegative || ''}`,
  ].join('\n')
  await navigator.clipboard.writeText(text)
  message.success('提示词已复制')
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
})
</script>

<template>
  <div class="ai-history-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          AI 绘图历史
        </h1>
        <p class="ui-page-subtitle">
          默认只有你自己可见，提交审核并通过后才会进入公共 AI 广场。
        </p>
      </div>
      <NSpace>
        <NSelect v-model:value="status" class="status-select" :options="AI_GENERATION_STATUS_OPTIONS" @update:value="handleStatusChange" />
        <NButton secondary :loading="loading" @click="loadJobs">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <div v-if="jobs.length" class="history-grid">
        <div v-for="job in jobs" :key="job.id" class="history-card ui-card">
          <div class="thumb">
            <NImage
              v-if="job.imageUrl"
              :src="job.imageUrl"
              object-fit="cover"
              lazy
              :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
            />
            <div v-else class="thumb-placeholder">
              {{ getAiGenerationStatusMeta(job.status).label }}
            </div>
          </div>
          <div class="card-body">
            <div class="card-head">
              <strong>#{{ job.id }}</strong>
              <NTag :type="getAiGenerationStatusMeta(job.status).type" size="small" round>
                {{ getAiGenerationStatusMeta(job.status).label }}
              </NTag>
            </div>
            <div class="tag-row">
              <NTag v-if="shouldShowReviewStatus(job)" :type="getAiReviewStatusMeta(job.reviewStatus).type" size="small" round>
                公开状态：{{ getAiReviewStatusMeta(job.reviewStatus).label }}
              </NTag>
              <NTag v-if="job.publicCategory" size="small" round>
                {{ getAiCategoryLabel(job.publicCategory) }}
              </NTag>
              <NTag v-if="job.deleteStatus && job.deleteStatus !== 'NONE'" :type="getAiDeleteStatusMeta(job.deleteStatus).type" size="small" round>
                {{ getAiDeleteStatusMeta(job.deleteStatus).label }}
              </NTag>
            </div>
            <p>{{ job.promptCn }}</p>
            <div class="meta">
              <span>{{ job.width }}x{{ job.height }}</span>
              <span>{{ formatFileSize(job.sizeBytes) }}</span>
              <span>{{ formatDate(job.createdAt) }}</span>
            </div>
            <div v-if="job.errorMessage" class="error-line">
              {{ job.userErrorMessage || job.errorMessage }}
            </div>
            <div class="actions">
              <NButton size="small" secondary @click="reuseJob(job)">
                复用参数
              </NButton>
              <NButton size="small" secondary @click="reuseJob(job, true)">
                换 Seed 再画
              </NButton>
              <NButton size="small" tertiary @click="copyPrompt(job)">
                复制提示词
              </NButton>
              <NButton size="small" tertiary @click="openDetail(job)">
                查看详情
              </NButton>
              <NButton v-if="job.imageUrl" size="small" secondary tag="a" :href="job.imageUrl" target="_blank">
                <template #icon>
                  <NIcon><EyeOutline /></NIcon>
                </template>
                查看
              </NButton>
              <NButton v-if="canSubmitReview(job)" size="small" type="primary" @click="openReview(job)">
                <template #icon>
                  <NIcon><SendOutline /></NIcon>
                </template>
                提交审核
              </NButton>
              <NTag v-if="job.reviewStatus === 'APPROVED'" type="success" round size="small">
                <template #icon>
                  <NIcon><CheckmarkCircleOutline /></NIcon>
                </template>
                已进广场
              </NTag>
              <NButton v-if="canSubmitDelete(job)" size="small" tertiary type="error" @click="openDelete(job)">
                <template #icon>
                  <NIcon><TrashOutline /></NIcon>
                </template>
                申请删除
              </NButton>
            </div>
          </div>
        </div>
      </div>
      <NEmpty v-else description="暂无 AI 绘图历史" class="empty" />
    </NSpin>

    <div v-if="total > pageSize" class="pagination">
      <NPagination :page="page" :page-count="pageCount" @update:page="handlePageChange" />
    </div>

    <NModal v-model:show="reviewModal" preset="card" title="提交审核" :style="{ width: '520px', maxWidth: '92vw' }">
      <div class="review-form">
        <NRadioGroup v-model:value="reviewForm.category">
          <NRadioButton value="GENERAL">
            全年龄
          </NRadioButton>
          <NRadioButton value="R18">
            R18
          </NRadioButton>
        </NRadioGroup>
        <NInput
          v-model:value="reviewForm.note"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          maxlength="300"
          show-count
          placeholder="可选备注"
        />
      </div>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="reviewModal = false">
            取消
          </NButton>
          <NButton type="primary" :loading="reviewSubmitting" @click="submitReview">
            提交
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="deleteModal" preset="card" title="申请删除 AI 生图" :style="{ width: '520px', maxWidth: '92vw' }">
      <div class="delete-form">
        <p class="modal-hint">
          删除申请通过后，这张图会从你的历史、管理员记录和公共广场中移除，并清理 OSS 文件。
        </p>
        <NInput
          v-model:value="deleteForm.reason"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          maxlength="300"
          show-count
          placeholder="可选：写一下删除原因，方便管理员审核"
        />
      </div>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="deleteModal = false">
            取消
          </NButton>
          <NButton type="error" :loading="deleteSubmitting" @click="submitDelete">
            提交申请
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="detailModal" preset="card" title="AI 生图详情" :style="{ width: '760px', maxWidth: '94vw' }">
      <div v-if="detailTarget" class="detail-grid">
        <div><span>任务 ID</span><strong>#{{ detailTarget.id }}</strong></div>
        <div><span>生成状态</span><strong>{{ getAiGenerationStatusMeta(detailTarget.status).label }}</strong></div>
        <div><span>公开状态</span><strong>{{ getAiReviewStatusMeta(detailTarget.reviewStatus).label }}</strong></div>
        <div><span>尺寸</span><strong>{{ detailTarget.width }}x{{ detailTarget.height }}</strong></div>
        <div><span>步数 / CFG</span><strong>{{ detailTarget.steps }} / {{ detailTarget.cfg }}</strong></div>
        <div><span>Seed</span><strong>{{ detailTarget.seed || '随机' }}</strong></div>
        <div><span>Checkpoint</span><strong>{{ checkpointDisplayName(detailTarget.checkpoint) }}</strong></div>
        <div><span>LoRA</span><strong>{{ detailTarget.loraName || '不使用 LoRA' }}</strong></div>
        <div class="detail-wide">
          <span>自然语言</span>
          <p>{{ detailTarget.promptCn }}</p>
        </div>
        <div class="detail-wide">
          <span>正向提示词</span>
          <p>{{ detailTarget.promptPositive || '-' }}</p>
        </div>
        <div class="detail-wide">
          <span>反向提示词</span>
          <p>{{ detailTarget.promptNegative || '-' }}</p>
        </div>
        <div v-if="detailTarget.errorMessage" class="detail-wide error-line">
          {{ detailTarget.userErrorMessage || detailTarget.errorMessage }}
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.ai-history-page {
  display: grid;
  gap: 18px;
}

.status-select {
  width: 180px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.history-card {
  overflow: hidden;
  border-radius: 8px;
}

.thumb {
  display: grid;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  background: #f1f5f9;
  color: #94a3b8;
}

.thumb :deep(.n-image),
.thumb :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}

.thumb :deep(img) {
  object-fit: cover;
}

.card-body {
  display: grid;
  gap: 9px;
  padding: 13px;
}

.card-head,
.actions,
.tag-row,
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.card-head {
  justify-content: space-between;
}

.card-body p {
  display: -webkit-box;
  min-height: 44px;
  margin: 0;
  overflow: hidden;
  color: #475569;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meta {
  color: #64748b;
  font-size: 12px;
}

.error-line {
  color: #dc2626;
  font-size: 13px;
}

.empty {
  min-height: 320px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.review-form {
  display: grid;
  gap: 14px;
}

.delete-form {
  display: grid;
  gap: 12px;
}

.modal-hint {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-grid > div {
  display: grid;
  gap: 5px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 11px;
  background: rgba(248, 250, 252, 0.72);
}

.detail-grid span {
  color: #64748b;
  font-size: 12px;
}

.detail-grid strong,
.detail-grid p {
  margin: 0;
  color: #263247;
  overflow-wrap: anywhere;
}

.detail-wide {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .ui-page-header,
  .ui-page-header :deep(.n-space) {
    align-items: stretch;
    flex-direction: column;
  }

  .status-select {
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
