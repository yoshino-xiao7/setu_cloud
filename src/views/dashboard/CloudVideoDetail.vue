<script setup lang="ts">
import type { CloudVideoItem, CloudVideoPlayback } from '@/api/cloudVideo'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NSpin, useMessage } from 'naive-ui'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchCloudVideo, fetchCloudVideoPlayback } from '@/api/cloudVideo'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useMusicStore } from '@/stores/music'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const musicStore = useMusicStore()

const loading = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
const detail = ref<CloudVideoItem | null>(null)
const playback = ref<CloudVideoPlayback | null>(null)
let hls: { destroy: () => void } | null = null
let refreshTimer: number | null = null

const videoId = () => Number(route.params.id)

function formatDuration(seconds?: number) {
  const total = Math.max(0, seconds || 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function destroyPlayer() {
  hls?.destroy()
  hls = null
  if (videoEl.value) {
    videoEl.value.pause()
    videoEl.value.removeAttribute('src')
    videoEl.value.load()
  }
}

async function attachPlayback(url: string) {
  const el = videoEl.value
  if (!el)
    return
  destroyPlayer()
  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = url
    return
  }
  const { default: Hls } = await import('hls.js')
  if (Hls.isSupported()) {
    const instance = new Hls()
    instance.loadSource(url)
    instance.attachMedia(el)
    hls = instance
  }
  else {
    el.src = url
  }
}

async function load() {
  const id = videoId()
  if (!Number.isFinite(id) || id <= 0)
    return
  loading.value = true
  try {
    detail.value = unwrapApiData(await fetchCloudVideo(id))
    playback.value = unwrapApiData(await fetchCloudVideoPlayback(id))
    musicStore.isPlaying = false
    await attachPlayback(playback.value.hlsUrl)
    scheduleRefresh(playback.value.expireAt)
  }
  catch (error) {
    detail.value = null
    playback.value = null
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载云视频失败')
  }
  finally {
    loading.value = false
  }
}

function scheduleRefresh(expireAt: number) {
  if (refreshTimer)
    window.clearTimeout(refreshTimer)
  const waitMs = Math.max(30_000, (expireAt * 1000 - Date.now()) - 60_000)
  refreshTimer = window.setTimeout(() => {
    void refreshTicket()
  }, waitMs)
}

async function refreshTicket() {
  const id = videoId()
  if (!Number.isFinite(id) || id <= 0)
    return
  try {
    const next = unwrapApiData(await fetchCloudVideoPlayback(id))
    playback.value = next
    const currentTime = videoEl.value?.currentTime ?? 0
    await attachPlayback(next.hlsUrl)
    if (videoEl.value)
      videoEl.value.currentTime = currentTime
    scheduleRefresh(next.expireAt)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '刷新播放地址失败')
  }
}

watch(() => route.params.id, () => {
  void load()
})

onMounted(() => {
  void load()
})

onUnmounted(() => {
  if (refreshTimer)
    window.clearTimeout(refreshTimer)
  destroyPlayer()
})
</script>

<template>
  <div class="cloud-video-detail ui-page">
    <NButton secondary @click="router.push('/dashboard/cloud-video')">
      <template #icon>
        <NIcon><ArrowBackOutline /></NIcon>
      </template>
      返回列表
    </NButton>

    <NSpin :show="loading">
      <div v-if="detail" class="player-card">
        <video
          ref="videoEl"
          class="player"
          controls
          playsinline
          :poster="playback?.posterUrl || detail.coverUrl || undefined"
        />
        <div class="meta">
          <h1>{{ detail.title }}</h1>
          <p v-if="detail.description">
            {{ detail.description }}
          </p>
          <p class="muted">
            {{ formatDuration(detail.durationSeconds) }}
            <span v-if="detail.tags"> · {{ detail.tags }}</span>
          </p>
        </div>
      </div>
      <NEmpty v-else-if="!loading" description="视频不存在或尚未发布" />
    </NSpin>
  </div>
</template>

<style scoped>
.cloud-video-detail {
  display: grid;
  gap: 16px;
}

.player-card {
  display: grid;
  gap: 16px;
}

.player {
  width: 100%;
  max-height: min(70vh, 720px);
  background: #000;
  border-radius: 12px;
}

.meta h1 {
  margin: 0 0 8px;
  font-size: 22px;
}

.meta p {
  margin: 0 0 8px;
  line-height: 1.6;
}

.muted {
  opacity: 0.68;
}
</style>
