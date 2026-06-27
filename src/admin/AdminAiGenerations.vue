<script setup lang="ts">
import type { AiGenerationJob } from '@/api/aiGeneration'
import { EyeOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NInputNumber,
  NPagination,
  NSelect,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { fetchAdminAiGenerations, unpublishAdminAiGeneration } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import {
  AI_GENERATION_STATUS_OPTIONS,
  AI_REVIEW_STATUS_OPTIONS,
  getAiCategoryLabel,
  getAiGenerationStatusMeta,
  getAiReviewStatusMeta,
} from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const loading = ref(false)
const jobs = shallowRef<AiGenerationJob[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const status = ref('ALL')
const reviewStatus = ref('ALL')
const userId = ref<number | null>(null)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function loadJobs() {
  loading.value = true
  try {
    const data = unwrapApiData(await fetchAdminAiGenerations({
      userId: userId.value || undefined,
      status: status.value === 'ALL' ? undefined : status.value,
      reviewStatus: reviewStatus.value === 'ALL' ? undefined : reviewStatus.value,
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

onMounted(loadJobs)
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1>AI 生成记录</h1>
        <p>查看所有用户生成的图片、任务状态和公开状态</p>
      </div>
      <NButton secondary :loading="loading" @click="loadJobs">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard class="panel-card" :bordered="false">
      <div class="toolbar">
        <NInputNumber v-model:value="userId" clearable placeholder="用户 ID" class="user-filter" @update:value="resetPageAndLoad" />
        <NSelect v-model:value="status" :options="AI_GENERATION_STATUS_OPTIONS" class="filter-select" @update:value="resetPageAndLoad" />
        <NSelect v-model:value="reviewStatus" :options="AI_REVIEW_STATUS_OPTIONS" class="filter-select" @update:value="resetPageAndLoad" />
      </div>

      <NSpin :show="loading">
        <div v-if="jobs.length" class="job-list">
          <div v-for="job in jobs" :key="job.id" class="job-row">
            <div class="thumb">
              <NImage
                v-if="job.imageUrl"
                :src="job.imageUrl"
                object-fit="cover"
                lazy
                :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
              />
              <span v-else>{{ getAiGenerationStatusMeta(job.status).label }}</span>
            </div>
            <div class="main">
              <div class="title">
                #{{ job.id }} · 用户 {{ job.userId }}
              </div>
              <p>{{ job.promptCn }}</p>
              <div class="meta">
                <NTag :type="getAiGenerationStatusMeta(job.status).type" size="small" round>
                  {{ getAiGenerationStatusMeta(job.status).label }}
                </NTag>
                <NTag :type="getAiReviewStatusMeta(job.reviewStatus).type" size="small" round>
                  {{ getAiReviewStatusMeta(job.reviewStatus).label }}
                </NTag>
                <NTag v-if="job.publicCategory" size="small" round>
                  {{ getAiCategoryLabel(job.publicCategory) }}
                </NTag>
                <span>{{ job.width }}x{{ job.height }}</span>
                <span>{{ formatDate(job.createdAt) }}</span>
              </div>
              <div v-if="job.errorMessage" class="error-line">
                {{ job.errorMessage }}
              </div>
            </div>
            <div class="actions">
              <NButton v-if="job.imageUrl" secondary size="small" tag="a" :href="job.imageUrl" target="_blank">
                <template #icon>
                  <NIcon><EyeOutline /></NIcon>
                </template>
                查看
              </NButton>
              <NButton v-if="job.publicVisible" tertiary type="error" size="small" @click="unpublish(job)">
                <template #icon>
                  <NIcon><TrashOutline /></NIcon>
                </template>
                下架
              </NButton>
            </div>
          </div>
        </div>
        <NEmpty v-else description="暂无 AI 生成记录" class="empty" />
      </NSpin>

      <div v-if="total > pageSize" class="pagination">
        <NPagination :page="page" :page-count="pageCount" @update:page="(next) => { page = next; loadJobs() }" />
      </div>
    </NCard>
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
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.filter-select,
.user-filter {
  width: 180px;
}

.job-list {
  display: grid;
  gap: 12px;
}

.job-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
}

.thumb {
  display: grid;
  width: 112px;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
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

.error-line {
  margin-top: 6px;
  color: #dc2626;
  font-size: 13px;
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

  .job-row {
    grid-template-columns: 1fr;
  }

  .thumb {
    width: 100%;
    max-height: 240px;
  }

  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-select,
  .user-filter {
    width: 100%;
  }
}
</style>
