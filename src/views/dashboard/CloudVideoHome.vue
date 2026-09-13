<script setup lang="ts">
import type { CloudVideoItem } from '@/api/cloudVideo'
import { RefreshOutline, SearchOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NPagination,
  NSpace,
  NSpin,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCloudVideoList, searchCloudVideos } from '@/api/cloudVideo'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const message = useMessage()
const router = useRouter()
const loading = ref(false)
const videos = shallowRef<CloudVideoItem[]>([])
const total = ref(0)
const offset = ref(0)
const limit = 24
const keywords = ref('')
const submittedKeywords = ref('')
const page = computed(() => Math.floor(offset.value / limit) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)))

function formatDuration(seconds?: number) {
  const totalSeconds = Math.max(0, seconds || 0)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function loadVideos() {
  loading.value = true
  try {
    const query = {
      keywords: submittedKeywords.value || undefined,
      offset: offset.value,
      limit,
    }
    const request = submittedKeywords.value
      ? searchCloudVideos(query)
      : fetchCloudVideoList({ offset: offset.value, limit })
    const data = unwrapApiData(await request, {
      items: [],
      total: 0,
      offset: offset.value,
      limit,
    })
    videos.value = data.items || []
    total.value = data.total || 0
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载云视频失败')
  }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  submittedKeywords.value = keywords.value.trim()
  offset.value = 0
  void loadVideos()
}

function handlePageChange(nextPage: number) {
  offset.value = (nextPage - 1) * limit
  void loadVideos()
}

function openVideo(id: number) {
  void router.push(`/dashboard/cloud-video/${id}`)
}

onMounted(loadVideos)
</script>

<template>
  <div class="cloud-video-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          云视频
        </h1>
        <p class="ui-page-subtitle">
          搜索并观看站内片库，播放地址由服务端短期签名。
        </p>
      </div>
      <NSpace>
        <NInput
          v-model:value="keywords"
          class="search-input"
          placeholder="搜索标题、简介或标签"
          @keyup.enter="handleSearch"
        />
        <NButton type="primary" @click="handleSearch">
          <template #icon>
            <NIcon><SearchOutline /></NIcon>
          </template>
          搜索
        </NButton>
        <NButton secondary :loading="loading" @click="loadVideos">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <div v-if="videos.length" class="video-grid">
        <NCard
          v-for="video in videos"
          :key="video.id"
          class="video-card"
          :bordered="false"
          hoverable
          @click="openVideo(video.id)"
        >
          <div class="cover-box">
            <NImage
              v-if="video.coverUrl"
              :src="video.coverUrl"
              :alt="video.title"
              object-fit="cover"
              preview-disabled
              :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy' }"
            />
            <span class="duration">{{ formatDuration(video.durationSeconds) }}</span>
          </div>
          <div class="card-body">
            <h3>{{ video.title }}</h3>
            <p v-if="video.tags">
              {{ video.tags }}
            </p>
          </div>
        </NCard>
      </div>
      <NEmpty v-else description="还没有可观看的云视频" class="empty" />
    </NSpin>

    <div v-if="total > limit" class="pagination">
      <NPagination :page="page" :page-count="pageCount" @update:page="handlePageChange" />
    </div>
  </div>
</template>

<style scoped>
.cloud-video-page {
  display: grid;
  gap: 18px;
}

.search-input {
  width: 260px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.video-card {
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  cursor: pointer;
}

.cover-box {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #111827;
}

.cover-box :deep(.n-image),
.cover-box :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.68);
  color: #fff;
  font-size: 12px;
}

.card-body {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.card-body h3 {
  margin: 0;
  font-size: 15px;
}

.card-body p {
  margin: 0;
  opacity: 0.68;
  font-size: 13px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.empty {
  min-height: 220px;
}
</style>
