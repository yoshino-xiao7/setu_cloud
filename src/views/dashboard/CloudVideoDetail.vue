<script setup lang="ts">
import type Hls from 'hls.js'
import type { CloudVideoItem, CloudVideoPlayback } from '@/api/cloudVideo'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NSelect, NSpin, NTag, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cloudVideoRatingLabel, fetchCloudVideo, fetchCloudVideoPlayback, saveCloudVideoProgress } from '@/api/cloudVideo'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useMusicStore } from '@/stores/music'
import { shouldSaveCloudVideoProgress } from '@/utils/cloudVideoProgress'
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
let allowSave = false
let lastSavedAt = 0
let applyingResume = false

const videoId = () => Number(route.params.id)

const availableQualityHeights = computed(() => optionHeights(ladderHeights.value))
const qualityOptions = computed(() => qualitySelectOptions(availableQualityHeights.value))
const effectiveMaxHeight = computed(() => capHeight(maxHeight.value, availableQualityHeights.value))

const qualityHint = computed(() => {
  if (!canCapQuality.value)
    return '当前浏览器由系统自动调节清晰度'
  if (!qualityOptions.value.length)
    return '正在读取该视频的真实转码档位'
  if (playingHeight.value && playingHeight.value < effectiveMaxHeight.value)
    return `当前 ${playingHeight.value}p · 上限 ${effectiveMaxHeight.value}p，仅列出本片实际档位`
  return `默认上限 ${CLOUD_VIDEO_DEFAULT_MAX_HEIGHT}p，选项来自本片 HLS 档位，网速差会自动降低`
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

function playerPosition() {
  const el = videoEl.value
  if (!el)
    return null
  const duration = Number.isFinite(el.duration) ? Math.floor(el.duration) : undefined
  return {
    positionSeconds: Math.max(0, Math.floor(el.currentTime || 0)),
    durationSeconds: duration && duration > 0 ? duration : undefined,
  }
}

function saveProgress(force = false) {
  if (applyingResume)
    return
  if (!shouldSaveCloudVideoProgress({ allowSave, lastSavedAt, force }))
    return
  const id = videoId()
  const payload = playerPosition()
  if (!Number.isFinite(id) || id <= 0 || !payload)
    return
  lastSavedAt = Date.now()
  void saveCloudVideoProgress(id, payload).catch(() => {})
}

function seekWhenReady(el: HTMLVideoElement, startAt: number) {
  if (startAt <= 0)
    return
  applyingResume = true
  const finish = () => {
    applyingResume = false
    allowSave = true
  }
  const apply = () => {
    if (Math.abs(el.currentTime - startAt) > 1)
      el.currentTime = startAt
    finish()
  }
  el.addEventListener('playing', finish, { once: true })
  if (el.readyState >= 1) {
    apply()
    return
  }
  el.addEventListener('loadedmetadata', apply, { once: true })
}

function destroyPlayer() {
  saveProgress(true)
  allowSave = false
  applyingResume = false
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

async function attachPlayback(url: string, startAt = 0) {
  const el = videoEl.value
  if (!el)
    return
  destroyPlayer()
  allowSave = startAt <= 0
  const { default: HlsCtor } = await import('hls.js')
  if (HlsCtor.isSupported()) {
    const instance = new HlsCtor({
      autoStartLoad: false,
      capLevelToPlayerSize: false,
      startPosition: startAt > 0 ? startAt : -1,
    })
    instance.on(HlsCtor.Events.MANIFEST_PARSED, () => {
      ladderHeights.value = instance.levels.map(level => level.height || 0)
      configureHlsAbrCap(instance, maxHeight.value)
      instance.startLoad(startAt > 0 ? startAt : -1)
    })
    instance.on(HlsCtor.Events.LEVEL_SWITCHED, (_event, data) => {
      playingHeight.value = instance.levels[data.level]?.height ?? null
    })
    instance.loadSource(url)
    instance.attachMedia(el)
    hls = instance
    canCapQuality.value = true
    seekWhenReady(el, startAt)
    return
  }
  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = url
    seekWhenReady(el, startAt)
    return
  }
  el.src = url
  seekWhenReady(el, startAt)
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
    await attachPlayback(playback.value.hlsUrl, playback.value.positionSeconds || 0)
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
    await attachPlayback(next.hlsUrl, currentTime)
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
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('pagehide', handlePageHide)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (refreshTimer)
    window.clearTimeout(refreshTimer)
  destroyPlayer()
})

function handlePageHide() {
  saveProgress(true)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden')
    saveProgress(true)
}
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
        <div class="player-shell">
          <video
            ref="videoEl"
            class="player"
            controls
            playsinline
            preload="metadata"
            :poster="playback?.posterUrl || detail.coverUrl || undefined"
            @timeupdate="saveProgress(false)"
            @pause="saveProgress(true)"
            @ended="saveProgress(true)"
          />
          <div class="quality-overlay">
            <NSelect
              v-if="qualityOptions.length"
              :value="effectiveMaxHeight"
              :options="qualityOptions"
              size="small"
              class="quality-select"
              aria-label="画质上限"
              @update:value="handleQualityChange"
            />
            <p v-else class="quality-pending">
              读取画质
            </p>
          </div>
        </div>
        <p class="muted quality-hint">
          {{ qualityHint }}
        </p>
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

.player-shell {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.player {
  display: block;
  width: 100%;
  max-height: min(70vh, 720px);
  background: #000;
}

.quality-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  pointer-events: auto;
}

.quality-select {
  width: 132px;
}

.quality-select :deep(.n-base-selection) {
  --n-color: rgba(0, 0, 0, 0.55);
  --n-color-active: rgba(0, 0, 0, 0.72);
  --n-border: 0;
  --n-border-active: 0;
  --n-border-focus: 0;
  --n-border-hover: 0;
  --n-text-color: #fff;
  --n-caret-color: #fff;
  backdrop-filter: blur(10px);
}

.quality-pending {
  margin: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
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
