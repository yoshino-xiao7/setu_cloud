<script setup lang="ts">
import type { AiGenerationJob } from '@/api/aiGeneration'
import {
  NButton,
  NCard,
  NEmpty,
  NImage,
  NSkeleton,
  NTag,
} from 'naive-ui'
import { getAiGenerationStatusMeta } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

defineProps<{
  historyLoading: boolean
  recentJobs: AiGenerationJob[]
}>()

const emit = defineEmits<{
  reuse: [job: AiGenerationJob]
}>()
</script>

<template>
  <NCard class="ui-card recent-card" :bordered="false">
    <template #header>
      <div class="card-title">
        最近生成
      </div>
    </template>

    <div v-if="historyLoading" class="recent-grid">
      <NSkeleton v-for="item in 3" :key="item" height="110px" />
    </div>
    <div v-else-if="recentJobs.length" class="recent-grid">
      <div v-for="job in recentJobs" :key="job.id" class="job-card">
        <div class="job-thumb">
          <NImage
            v-if="job.imageUrl"
            :src="job.imageUrl"
            object-fit="contain"
            :img-props="{ alt: job.promptCn, referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
          />
          <div v-else class="thumb-empty">
            {{ getAiGenerationStatusMeta(job.status).label }}
          </div>
        </div>
        <div class="job-card-body">
          <div class="job-card-title">
            #{{ job.id }} · {{ formatDate(job.createdAt) }}
          </div>
          <p>{{ job.promptCn }}</p>
          <div class="job-card-meta">
            <NTag :type="getAiGenerationStatusMeta(job.status).type" size="small" round>
              {{ getAiGenerationStatusMeta(job.status).label }}
            </NTag>
            <NTag v-if="job.jobType === 'IMG2IMG'" size="small" round>
              图生图
            </NTag>
            <NButton size="small" secondary @click="emit('reuse', job)">
              复用参数
            </NButton>
          </div>
        </div>
      </div>
    </div>
    <NEmpty v-else description="暂无生成记录" />
  </NCard>
</template>

<style scoped>
.recent-card {
  border-radius: var(--ui-radius-md);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-text);
  font-weight: 800;
}

/* 紧凑列表：左缩略图 + 右信息，适配窄栏并可滚动 */
.recent-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.job-card {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: stretch;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
}

.job-thumb {
  display: grid;
  width: 74px;
  height: 100%;
  min-height: 110px;
  padding: 4px;
  place-items: center;
  overflow: hidden;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
}

.job-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.job-thumb :deep(.n-image) {
  width: 100%;
  height: 100%;
}

.job-thumb :deep(.n-image img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.job-card-body {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 10px;
}

.job-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.job-card-title {
  color: #263247;
  font-size: 12px;
  font-weight: 800;
}

.job-card-body p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 640px) {
  .recent-grid {
    grid-auto-columns: minmax(190px, 74vw);
    grid-auto-flow: column;
    grid-template-columns: none;
    gap: 10px;
    overflow-x: auto;
    padding: 2px 2px 8px;
    scroll-snap-type: x proximity;
  }

  .recent-grid > * {
    scroll-snap-align: start;
  }

  .job-card-body {
    gap: 5px;
    padding: 9px;
  }
}
</style>
