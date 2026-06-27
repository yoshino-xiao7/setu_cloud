<script setup lang="ts">
import type { AudioQuality, PlayMode } from '@/stores/music'
import {
  ChevronDown,
  ChevronUp,
  ListOutline,
  MusicalNotesOutline,
  PauseOutline,
  PlayOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline,
  VolumeHighOutline,
  VolumeMuteOutline,
} from '@vicons/ionicons5'
import { NButton, NIcon, NSelect, NSlider, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'

const message = useMessage()
const musicStore = useMusicStore()
const { isCompact } = useBreakpoint()

const audioRef = ref<HTMLAudioElement>()
let pendingCanPlayListener: (() => void) | null = null
const showVolume = ref(false)
function readCollapsedPreference() {
  if (typeof window === 'undefined')
    return false
  return window.localStorage.getItem('mini_player_collapsed_v1') === '1'
}
const isCollapsed = ref(readCollapsedPreference())
let syncingFromAudio = false

const artistText = computed(() =>
  musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
)

const qualityOptions = [
  { value: 'standard', label: '标准' },
  { value: 'higher', label: '较高' },
  { value: 'exhigh', label: '极高' },
  { value: 'lossless', label: '无损' },
  { value: 'hires', label: 'Hi-Res' },
]

const playModeOptions = [
  { value: 'sequence', label: '顺序' },
  { value: 'loop', label: '循环' },
  { value: 'single', label: '单曲' },
  { value: 'random', label: '随机' },
]

async function handleTogglePlay() {
  if (!musicStore.currentSong) {
    message.warning('请先选择要播放的歌曲')
    return
  }
  if (!musicStore.currentSong.url) {
    const success = await musicStore.playSong(musicStore.currentSong)
    if (!success)
      message.error(musicStore.lastPlaybackError || '播放失败，请尝试其他歌曲')
    return
  }
  musicStore.togglePlay()
}

function handleSeek(value: number) {
  if (!audioRef.value)
    return
  audioRef.value.currentTime = value
  musicStore.updateCurrentTime(value)
}

function handleVolumeChange(value: number) {
  musicStore.setVolume(value / 100)
}

async function handleQualityChange(value: string) {
  const success = await musicStore.setAudioQuality(value as AudioQuality)
  if (!success)
    message.error(musicStore.lastPlaybackError || '切换音质失败')
}

function handlePlayModeChange(value: string) {
  musicStore.setPlayMode(value as PlayMode)
}

function openDrawer(tab: 'now' | 'lyrics' | 'queue' = 'now') {
  musicStore.openPlayerDrawer(tab)
}

function setCollapsed(collapsed: boolean, persist = true) {
  isCollapsed.value = collapsed
  if (!persist || typeof window === 'undefined')
    return
  window.localStorage.setItem('mini_player_collapsed_v1', collapsed ? '1' : '0')
}

function handleTimeUpdate() {
  if (!audioRef.value)
    return
  syncingFromAudio = true
  musicStore.updateCurrentTime(audioRef.value.currentTime)
  window.requestAnimationFrame(() => {
    syncingFromAudio = false
  })
}

function handleLoadedMetadata() {
  if (audioRef.value)
    musicStore.duration = audioRef.value.duration || 0
}

function handleEnded() {
  void musicStore.playNext()
}

function handleAudioError(event: Event) {
  const audio = event.target as HTMLAudioElement
  const currentSong = musicStore.currentSong

  if (currentSong?.originalUrl && currentSong.url !== currentSong.originalUrl) {
    audio.src = currentSong.originalUrl
    audio.load()
    musicStore.currentSong = {
      ...currentSong,
      url: currentSong.originalUrl,
      originalUrl: undefined,
    }

    if (musicStore.isPlaying) {
      audio.play().catch(() => {
        musicStore.isPlaying = false
        message.error('播放失败，请尝试其他歌曲')
      })
    }
    return
  }

  musicStore.isPlaying = false
  message.error('播放失败，请尝试其他歌曲')
}

function updateMediaSessionMetadata() {
  if (
    typeof navigator === 'undefined'
    || !('mediaSession' in navigator)
    || typeof MediaMetadata === 'undefined'
  ) {
    return
  }

  const song = musicStore.currentSong
  if (!song) {
    navigator.mediaSession.metadata = null
    return
  }

  const artwork = song.album?.picUrl
    ? [{ src: song.album.picUrl, sizes: '512x512', type: 'image/jpeg' }]
    : []

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.name,
    artist: song.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
    album: song.album?.name || '',
    artwork,
  })
}

function updateMediaSessionPlaybackState() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
    return

  navigator.mediaSession.playbackState = musicStore.isPlaying ? 'playing' : 'paused'

  try {
    navigator.mediaSession.setPositionState?.({
      duration: musicStore.duration || Math.max(1, Math.round((musicStore.currentSong?.duration || 0) / 1000)),
      playbackRate: 1,
      position: Math.max(0, musicStore.currentTime),
    })
  }
  catch {}
}

function setupMediaSessionActions() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
    return

  const actions: MediaSessionAction[] = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']
  for (const action of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, null)
    }
    catch {}
  }

  try {
    navigator.mediaSession.setActionHandler('play', () => {
      void handleTogglePlay()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (musicStore.isPlaying)
        musicStore.togglePlay()
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      void musicStore.playPrev()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      void musicStore.playNext(true)
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number')
        handleSeek(details.seekTime)
    })
  }
  catch {}
}

watch(() => musicStore.isPlaying, (playing) => {
  if (!audioRef.value)
    return

  if (playing) {
    audioRef.value.play().catch(() => {
      musicStore.isPlaying = false
    })
  }
  else {
    audioRef.value.pause()
  }
  updateMediaSessionPlaybackState()
})

watch(() => musicStore.currentSong, (song, oldSong) => {
  updateMediaSessionMetadata()
  updateMediaSessionPlaybackState()

  if (!song?.url || !audioRef.value)
    return

  const isSameSong = oldSong && song.id === oldSong.id && song.url !== oldSong.url
  const savedTime = isSameSong ? audioRef.value.currentTime : 0

  audioRef.value.src = song.url
  audioRef.value.load()

  if (musicStore.isPlaying) {
    // 先清理上一次的监听器
    if (pendingCanPlayListener) {
      audioRef.value.removeEventListener('canplay', pendingCanPlayListener)
    }
    const playWhenReady = () => {
      if (!audioRef.value)
        return
      if (isSameSong && savedTime > 0)
        audioRef.value.currentTime = savedTime
      audioRef.value.play().catch(() => {
        musicStore.isPlaying = false
      })
      audioRef.value.removeEventListener('canplay', playWhenReady)
      pendingCanPlayListener = null
    }
    pendingCanPlayListener = playWhenReady
    audioRef.value.addEventListener('canplay', playWhenReady)
  }
})

watch(() => musicStore.currentTime, (time) => {
  if (!audioRef.value || syncingFromAudio)
    return
  if (Math.abs(audioRef.value.currentTime - time) > 0.75) {
    audioRef.value.currentTime = time
  }
  updateMediaSessionPlaybackState()
})

watch(() => musicStore.duration, () => {
  updateMediaSessionPlaybackState()
})

watch(() => musicStore.volume, (volume) => {
  if (audioRef.value)
    audioRef.value.volume = volume
})

watch(isCompact, (compact) => {
  if (compact && isCollapsed.value)
    setCollapsed(false, false)
}, { immediate: true })

onMounted(() => {
  if (audioRef.value)
    audioRef.value.volume = musicStore.volume
  setupMediaSessionActions()
  updateMediaSessionMetadata()
  updateMediaSessionPlaybackState()
})

onUnmounted(() => {
  if (audioRef.value && pendingCanPlayListener) {
    audioRef.value.removeEventListener('canplay', pendingCanPlayListener)
    pendingCanPlayListener = null
  }
  audioRef.value?.pause()
})
</script>

<template>
  <div class="mini-player-root">
    <transition name="mini-slide">
      <section v-if="musicStore.currentSong && !isCollapsed" class="mini-player" aria-label="音乐播放器">
        <button class="track-button" type="button" @click="openDrawer('now')">
          <span class="cover">
            <img
              v-if="musicStore.currentSong.album?.picUrl"
              :src="musicStore.currentSong.album.picUrl"
              :alt="musicStore.currentSong.name"
              referrerpolicy="no-referrer"
              loading="eager"
              decoding="async"
            >
            <NIcon v-else size="24"><MusicalNotesOutline /></NIcon>
          </span>
          <span class="track-copy">
            <span class="track-name">{{ musicStore.currentSong.name }}</span>
            <span class="track-artist">{{ artistText }}</span>
          </span>
        </button>

        <div class="center-controls">
          <div class="buttons">
            <NButton circle quaternary size="small" class="skip-control" :disabled="!musicStore.hasPrev" @click="musicStore.playPrev()">
              <template #icon>
                <NIcon><PlaySkipBackOutline /></NIcon>
              </template>
            </NButton>
            <NButton circle type="primary" size="medium" class="play-control" @click="handleTogglePlay">
              <template #icon>
                <NIcon>
                  <PauseOutline v-if="musicStore.isPlaying" />
                  <PlayOutline v-else />
                </NIcon>
              </template>
            </NButton>
            <NButton circle quaternary size="small" class="skip-control" :disabled="!musicStore.hasNext" @click="musicStore.playNext(true)">
              <template #icon>
                <NIcon><PlaySkipForwardOutline /></NIcon>
              </template>
            </NButton>
          </div>

          <div v-if="!isCompact" class="progress">
            <span>{{ musicStore.formatTime(musicStore.currentTime) }}</span>
            <NSlider
              :value="musicStore.currentTime"
              :max="musicStore.duration || 1"
              :step="0.1"
              :tooltip="false"
              @update:value="handleSeek"
            />
            <span>{{ musicStore.formatTime(musicStore.duration) }}</span>
          </div>
        </div>

        <div class="right-controls">
          <div v-if="!isCompact" class="volume-wrap">
            <NButton circle quaternary @click="showVolume = !showVolume">
              <template #icon>
                <NIcon>
                  <VolumeMuteOutline v-if="musicStore.volume === 0" />
                  <VolumeHighOutline v-else />
                </NIcon>
              </template>
            </NButton>
            <div v-if="showVolume" class="volume-popover">
              <NSlider
                :value="musicStore.volume * 100"
                :max="100"
                :step="1"
                :tooltip="false"
                vertical
                style="height: 108px"
                @update:value="handleVolumeChange"
              />
              <span>{{ Math.round(musicStore.volume * 100) }}%</span>
            </div>
          </div>

          <NSelect
            v-if="!isCompact"
            class="dock-select quality-select"
            :value="musicStore.audioQuality"
            :options="qualityOptions"
            size="small"
            :consistent-menu-width="false"
            @update:value="handleQualityChange"
          />

          <NSelect
            v-if="!isCompact"
            class="dock-select mode-select"
            :value="musicStore.playMode"
            :options="playModeOptions"
            size="small"
            :consistent-menu-width="false"
            @update:value="handlePlayModeChange"
          />

          <span class="queue-trigger-wrap">
            <NButton circle quaternary title="播放队列" @click="openDrawer('queue')">
              <template #icon>
                <NIcon><ListOutline /></NIcon>
              </template>
            </NButton>
            <span v-if="musicStore.playlist.length > 0" class="queue-count">
              {{ musicStore.playlist.length > 99 ? '99+' : musicStore.playlist.length }}
            </span>
          </span>

          <NButton circle quaternary class="detail-button" title="打开完整播放器" @click="openDrawer('now')">
            <template #icon>
              <NIcon><ChevronUp /></NIcon>
            </template>
          </NButton>

          <NButton circle quaternary class="collapse-button" title="收起播放器" @click="setCollapsed(true)">
            <template #icon>
              <NIcon><ChevronDown /></NIcon>
            </template>
          </NButton>
        </div>
      </section>
    </transition>

    <transition name="mini-slide">
      <button
        v-if="musicStore.currentSong && isCollapsed"
        class="mini-player-expand"
        type="button"
        title="展开播放器"
        aria-label="展开音乐播放器"
        @click="setCollapsed(false)"
      >
        <span class="expand-cover">
          <img
            v-if="musicStore.currentSong.album?.picUrl"
            :src="musicStore.currentSong.album.picUrl"
            :alt="musicStore.currentSong.name"
            referrerpolicy="no-referrer"
            loading="eager"
            decoding="async"
          >
          <NIcon v-else size="18"><MusicalNotesOutline /></NIcon>
        </span>
        <NIcon class="expand-icon" size="16">
          <ChevronUp />
        </NIcon>
      </button>
    </transition>

    <audio
      ref="audioRef"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @ended="handleEnded"
      @error="handleAudioError"
    />
  </div>
</template>

<style scoped>
.mini-player-root {
  position: relative;
}

.mini-player {
  position: fixed;
  left: max(16px, calc(50% - 520px));
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 1800;
  display: grid;
  width: min(1040px, calc(100vw - 32px));
  grid-template-columns: minmax(220px, 0.9fr) minmax(300px, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px) saturate(150%);
  box-shadow: 0 14px 34px rgba(31, 41, 55, 0.12);
}

.mini-player-expand {
  position: fixed;
  right: 16px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 1800;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 5px 8px 5px 5px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #f26d99;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(31, 41, 55, 0.14);
  backdrop-filter: blur(16px) saturate(150%);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.mini-player-expand:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(245, 134, 169, 0.18);
}

.expand-cover {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 999px;
  background: #fff3f7;
}

.expand-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.expand-icon {
  flex-shrink: 0;
}

.track-button {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.cover {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
  background: #fff3f7;
  color: #f586a9;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-copy,
.track-name,
.track-artist {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-name {
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
}

.track-artist {
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
}

.center-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.buttons,
.right-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.progress {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 11px;
}

.volume-wrap {
  position: relative;
}

.volume-popover {
  position: absolute;
  left: 50%;
  bottom: 52px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(31, 41, 55, 0.16);
  color: #6b7280;
  font-size: 12px;
}

.dock-select {
  flex-shrink: 0;
}

.quality-select {
  width: 92px;
}

.mode-select {
  width: 98px;
}

.queue-trigger-wrap {
  position: relative;
  display: inline-flex;
}

.queue-count {
  position: absolute;
  top: -4px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border: 2px solid rgba(255, 255, 255, 0.94);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f586a9;
  color: #fff;
  box-shadow: 0 6px 12px rgba(245, 134, 169, 0.24);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
}

.mini-slide-enter-active,
.mini-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.mini-slide-enter-from,
.mini-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 768px) {
  .mini-player {
    left: 10px;
    width: calc(100vw - 20px);
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 6px;
    padding: 8px 9px;
    border-radius: 999px;
  }

  .mini-player-expand {
    right: 10px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    height: 40px;
    max-width: 40px;
    gap: 0;
    padding: 4px;
  }

  .cover {
    width: 36px;
    height: 36px;
    border-radius: 999px;
  }

  .buttons {
    gap: 2px;
  }

  .skip-control {
    display: none;
  }

  .track-button {
    gap: 8px;
  }

  .track-name {
    max-width: 42vw;
    font-size: 13px;
  }

  .track-artist {
    display: none;
  }

  .right-controls {
    gap: 2px;
  }

  .collapse-button {
    display: none;
  }

  .expand-cover {
    width: 30px;
    height: 30px;
  }

  .expand-icon {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mini-slide-enter-active,
  .mini-slide-leave-active {
    transition: none;
  }
}
</style>
