<script setup lang="ts">
import type { AiPublicWork } from '@/api/aiGeneration'
import { EyeOutline, RefreshOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { fetchAiSquare } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { AI_CATEGORY_OPTIONS, getAiCategoryLabel } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const loading = ref(false)
const jobs = shallowRef<AiPublicWork[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 16
const category = ref('GENERAL')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function loadSquare() {
  loading.value = true
  try {
    const data = unwrapApiData(await fetchAiSquare({
      category: category.value === 'ALL' ? undefined : category.value,
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
      showApiError(message, error, '加载 AI 广场失败')
  }
  finally {
    loading.value = false
  }
}

function handleCategoryChange() {
  page.value = 1
  void loadSquare()
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadSquare()
}

onMounted(loadSquare)
</script>

<template>
  <div class="ai-square-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          AI 广场
        </h1>
        <p class="ui-page-subtitle">
          展示审核通过的 AI 绘图，默认查看全年龄内容。
        </p>
      </div>
      <NSpace>
        <NSelect v-model:value="category" class="category-select" :options="AI_CATEGORY_OPTIONS" @update:value="handleCategoryChange" />
        <NButton secondary :loading="loading" @click="loadSquare">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <div v-if="jobs.length" class="square-grid">
        <NCard v-for="job in jobs" :key="job.id" class="square-card" :bordered="false">
          <div class="image-box">
            <NImage
              v-if="job.imageUrl"
              :src="job.imageUrl"
              object-fit="cover"
              lazy
              :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
            />
          </div>
          <div class="card-body">
            <div class="card-meta">
              <NTag size="small" round :type="job.publicCategory === 'R18' ? 'error' : 'success'">
                {{ getAiCategoryLabel(job.publicCategory) }}
              </NTag>
              <span>#{{ job.id }}</span>
              <span>{{ job.width }}x{{ job.height }}</span>
              <span>{{ formatDate(job.completedAt || job.createdAt) }}</span>
            </div>
            <p>{{ job.promptCn }}</p>
            <NButton v-if="job.imageUrl" secondary size="small" tag="a" :href="job.imageUrl" target="_blank">
              <template #icon>
                <NIcon><EyeOutline /></NIcon>
              </template>
              查看原图
            </NButton>
          </div>
        </NCard>
      </div>
      <NEmpty v-else description="这个分类还没有公开作品" class="empty" />
    </NSpin>

    <div v-if="total > pageSize" class="pagination">
      <NPagination :page="page" :page-count="pageCount" @update:page="handlePageChange" />
    </div>
  </div>
</template>

<style scoped>
.ai-square-page {
  display: grid;
  gap: 18px;
}

.category-select {
  width: 160px;
}

.square-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.square-card {
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 16px 38px rgba(31, 41, 55, 0.08);
}

.image-box {
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #f1f5f9;
}

.image-box :deep(.n-image),
.image-box :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}

.image-box :deep(img) {
  object-fit: cover;
}

.card-body {
  display: grid;
  gap: 10px;
  padding: 13px;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
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

.empty {
  min-height: 360px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .ui-page-header,
  .ui-page-header :deep(.n-space) {
    align-items: stretch;
    flex-direction: column;
  }

  .category-select {
    width: 100%;
  }
}
</style>
