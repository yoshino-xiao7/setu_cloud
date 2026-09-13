<script setup lang="ts">
import type Hls from 'hls.js'
import type { CloudVideoItem, CloudVideoPlayback } from '@/api/cloudVideo'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NSelect, NSpin, NTag, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cloudVideoRatingLabel, fetchCloudVideo, fetchCloudVideoPlayback } from '@/api/cloudVideo'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useMusicStore } from '@/stores/music'
import {
  capHeight,
  CLOUD_VIDEO_DEFAULT_MAX_HEIGHT,
  configureHlsAbrCap,
  optionHeights,
  qualitySelectOptions,
  readStoredMaxHeight,
  writeStoredMaxHeight,
} from '@/utils/cloudVideoQuality'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const musicStore = useMusicStore()

const loading = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
const detail = ref<CloudVideoItem | null>(null)
const playback = ref<CloudVideoPlayback | null>(null)
const maxHeight = ref(readStoredMaxHeight(typeof localStorage === 'undefined' ? null : localStorage))
const ladderHeights = ref<number[]>([])
const playingHeight = ref<number | null>(null)
const canCapQuality = ref(false)
let hls: Hls | null = null
let refreshTimer: number | null = null

const videoId = () => Number(route.params.id)

const availableQualityHeights = computed(() => optionHeights(ladderHeights.value, detail.value?.height))
const qualityOptions = computed(() => qualitySelectOptions(availableQualityHeights.value))
const effectiveMaxHeight = computed(() => capHeight(maxHeight.value, availableQualityHeights.value))

const qualityHint = computed(() => {
  if (!canCapQuality.value)
    return '当前浏览器由系统自动调节清晰度'
  if (playingHeight.value && playingHeight.value < effectiveMaxHeight.value)
    return `当前 ${playingHeight.value}p · 上限 ${effectiveMaxHeight.value}p，网速差会自动降低`
  return `默认 ${CLOUD_VIDEO_DEFAULT_MAX_HEIGHT}p，网速差会自动降低，不会低于片源最低档`
})

function formatDuration(seconds?: number) {
  const total = Math.max(0, seconds || 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function browserStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function applyQualityCap() {
  if (!hls)
    return
  configureHlsAbrCap(hls, maxHeight.value)
}

function handleQualityChange(value: string | number) {
  const height = Number(value)
  if (!Number.isFinite(height) || height <= 0)
    return
  maxHeight.value = height
  writeStoredMaxHeight(browserStorage(), height)
  applyQualityCap()
}

function destroyPlayer() {
  hls?.destroy()
  hls = null
  canCapQuality.value = false
  playingHeight.value = null
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
  const { default: HlsCtor } = await import('hls.js')
  if (HlsCtor.isSupported()) {
    const instance = new HlsCtor({
      autoStartLoad: false,
      capLevelToPlayerSize: false,
    })
    instance.on(HlsCtor.Events.MANIFEST_PARSED, () => {
      ladderHeights.value = instance.levels.map(level => level.height || 0)
      configureHlsAbrCap(instance, maxHeight.value)
      instance.startLoad()
    })
    instance.on(HlsCtor.Events.LEVEL_SWITCHED, (_event, data) => {
      playingHeight.value = instance.levels[data.level]?.height ?? null
    })
    instance.loadSource(url)
    instance.attachMedia(el)
    hls = instance
    canCapQuality.value = true
    return
  }
  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = url
    return
  }
  el.src = url
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
  ladderHeights.value = []
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
        <div class="quality-row">
          <NSelect
            :value="effectiveMaxHeight"
            :options="qualityOptions"
            :disabled="!canCapQuality"
            size="small"
            class="quality-select"
            aria-label="画质上限"
            @update:value="handleQualityChange"
          />
          <p class="muted quality-hint">
            {{ qualityHint }}
          </p>
        </div>
        <div class="meta">
          <h1>{{ detail.title }}</h1>
          <NTag :type="detail.rating === 'r18' ? 'error' : 'success'" size="small" round>
            {{ cloudVideoRatingLabel(detail.rating) }}
          </NTag>
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

.quality-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.quality-select {
  width: 160px;
}

.quality-hint {
  margin: 0;
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
