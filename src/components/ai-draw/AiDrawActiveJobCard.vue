<script setup lang="ts">
import type { AiGenerationJob } from '@/api/aiGeneration'
import { DownloadOutline, ImageOutline } from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NSkeleton,
  NTag,
} from 'naive-ui'
import { getAiGenerationStatusMeta, getAiReviewStatusMeta } from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

defineProps<{
  activeJob: AiGenerationJob | null
}>()

const emit = defineEmits<{
  download: [job: AiGenerationJob]
}>()
</script>

<template>
  <NCard class="ui-card result-card" :class="{ 'has-active-job': activeJob }" :bordered="false">
    <template #header>
      <div class="card-title">
        <NIcon><ImageOutline /></NIcon>
        当前任务
      </div>
    </template>

    <div v-if="activeJob" class="active-job">
      <div class="image-stage">
        <NImage
          v-if="activeJob.imageUrl"
          :src="activeJob.imageUrl"
          object-fit="contain"
          :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
        />
        <div v-else class="placeholder">
          <NSkeleton v-if="activeJob.status !== 'FAILED'" height="100%" />
          <NEmpty v-else description="生成失败" />
        </div>
      </div>
      <div class="job-meta">
        <NTag :type="getAiGenerationStatusMeta(activeJob.status).type" round>
          {{ getAiGenerationStatusMeta(activeJob.status).label }}
        </NTag>
        <NTag v-if="activeJob.status === 'COMPLETED'" :type="getAiReviewStatusMeta(activeJob.reviewStatus).type" round>
          广场审核：{{ getAiReviewStatusMeta(activeJob.reviewStatus).label }}
        </NTag>
        <span>#{{ activeJob.id }}</span>
        <span>{{ activeJob.width }}x{{ activeJob.height }}</span>
      </div>
      <p class="prompt-preview">
        {{ activeJob.promptCn }}
      </p>
      <NAlert v-if="activeJob.errorMessage" type="error">
        {{ activeJob.userErrorMessage || activeJob.errorMessage }}
      </NAlert>
      <NAlert v-if="activeJob.status === 'COMPLETED'" type="warning">
        图片仅保留 30 天，如需永久保存请审核发布至广场或自行下载。
        <template v-if="activeJob.privateOssExpiresAt">
          云端原图预计于 {{ formatDate(activeJob.privateOssExpiresAt) }} 清理。
        </template>
      </NAlert>
      <NAlert
        v-if="activeJob.privateOssStatus === 'EXPIRED' || activeJob.privateOssStatus === 'EXPLICITLY_DELETED'"
        type="info"
      >
        云端原图已清理，生成历史仍会保留。
      </NAlert>
      <NButton
        v-if="activeJob.imageUrl"
        type="primary"
        secondary
        @click="emit('download', activeJob)"
      >
        <template #icon>
          <NIcon><DownloadOutline /></NIcon>
        </template>
        下载图片
      </NButton>
    </div>
    <NEmpty v-else description="还没有当前任务" />
  </NCard>
</template>

<style scoped>
.result-card {
  position: sticky;
  top: 82px;
  border-radius: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-text);
  font-weight: 800;
}

.image-stage {
  width: min(100%, 420px);
  aspect-ratio: 832 / 1216;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.84);
}

.image-stage :deep(.n-image),
.image-stage :deep(img),
.placeholder {
  width: 100%;
  height: 100%;
}

.image-stage :deep(img) {
  object-fit: contain;
}

.active-job {
  display: grid;
  justify-items: center;
  gap: 14px;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.prompt-preview {
  display: -webkit-box;
  width: min(100%, 620px);
  margin: 0;
  overflow: hidden;
  color: #475569;
  line-height: 1.6;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

@media (max-width: 980px) {
  .result-card {
    position: static;
  }
}

@media (max-width: 640px) {
  .result-card.has-active-job {
    order: -1;
  }

  .image-stage {
    width: min(100%, 280px);
    max-height: 46dvh;
  }

  .active-job {
    gap: 10px;
  }

  .prompt-preview {
    font-size: 12px;
    line-height: 1.5;
    -webkit-line-clamp: 2;
  }
}
</style>
