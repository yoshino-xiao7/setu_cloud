<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, NSlider, useMessage } from 'naive-ui'
import {
  MusicalNotesOutline,
  PauseOutline,
  PlayOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline,
  VolumeHighOutline,
  VolumeMuteOutline,
  OpenOutline,
  ChevronDown,
  ChevronUp
} from '@vicons/ionicons5'
import { useMusicStore } from '@/stores/music'
import { useBreakpoint } from '@/composables/useBreakpoint'

const router = useRouter()
const message = useMessage()
const musicStore = useMusicStore()
const { isCompact } = useBreakpoint()

const audioRef = ref<HTMLAudioElement>()
const showVolume = ref(false)
const readCollapsedPreference = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem('mini_player_collapsed_v1') === '1'
}
const isCollapsed = ref(readCollapsedPreference())
let syncingFromAudio = false

const artistText = computed(() =>
  musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家'
)

const handleTogglePlay = async () => {
  if (!musicStore.currentSong) {
    message.warning('请先选择要播放的歌曲')
    return
  }
  if (!musicStore.currentSong.url) {
    const success = await musicStore.playSong(musicStore.currentSong)
    if (!success) message.error('播放失败，请尝试其他歌曲')
    return
  }
  musicStore.togglePlay()
}

const handleSeek = (value: number) => {
  if (!audioRef.value) return
  audioRef.value.currentTime = value
  musicStore.updateCurrentTime(value)
}

const handleVolumeChange = (value: number) => {
  musicStore.setVolume(value / 100)
}

const setCollapsed = (collapsed: boolean, persist = true) => {
  isCollapsed.value = collapsed
  if (!persist || typeof window === 'undefined') return
  window.localStorage.setItem('mini_player_collapsed_v1', collapsed ? '1' : '0')
}

const handleTimeUpdate = () => {
  if (!audioRef.value) return
  syncingFromAudio = true
  musicStore.updateCurrentTime(audioRef.value.currentTime)
  window.requestAnimationFrame(() => {
    syncingFromAudio = false
  })
}

const handleLoadedMetadata = () => {
  if (audioRef.value) musicStore.duration = audioRef.value.duration || 0
}

const handleEnded = () => {
  void musicStore.playNext()
}

const handleAudioError = (event: Event) => {
  const audio = event.target as HTMLAudioElement
  const currentSong = musicStore.currentSong

  if (currentSong?.originalUrl && currentSong.url !== currentSong.originalUrl) {
    audio.src = currentSong.originalUrl
    audio.load()
    musicStore.currentSong = {
      ...currentSong,
      url: currentSong.originalUrl,
      originalUrl: undefined
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

watch(() => musicStore.isPlaying, (playing) => {
  if (!audioRef.value) return

  if (playing) {
    audioRef.value.play().catch(() => {
      musicStore.isPlaying = false
    })
  } else {
    audioRef.value.pause()
  }
})

watch(() => musicStore.currentSong, (song, oldSong) => {
  if (!song?.url || !audioRef.value) return

  const isSameSong = oldSong && song.id === oldSong.id && song.url !== oldSong.url
  const savedTime = isSameSong ? audioRef.value.currentTime : 0

  audioRef.value.src = song.url
  audioRef.value.load()

  if (musicStore.isPlaying) {
    const playWhenReady = () => {
      if (!audioRef.value) return
      if (isSameSong && savedTime > 0) audioRef.value.currentTime = savedTime
      audioRef.value.play().catch(() => {
        musicStore.isPlaying = false
      })
      audioRef.value.removeEventListener('canplay', playWhenReady)
    }
    audioRef.value.addEventListener('canplay', playWhenReady)
  }
})

watch(() => musicStore.currentTime, (time) => {
  if (!audioRef.value || syncingFromAudio) return
  if (Math.abs(audioRef.value.currentTime - time) > 0.75) {
    audioRef.value.currentTime = time
  }
})

watch(() => musicStore.volume, (volume) => {
  if (audioRef.value) audioRef.value.volume = volume
})

watch(isCompact, (compact) => {
  if (compact) setCollapsed(true, false)
}, { immediate: true })

onMounted(() => {
  if (audioRef.value) audioRef.value.volume = musicStore.volume
})

onUnmounted(() => {
  audioRef.value?.pause()
})
</script>

<template>
  <div class="mini-player-root">
    <transition name="mini-slide">
      <section v-if="musicStore.currentSong && !isCollapsed" class="mini-player" aria-label="音乐播放器">
        <button class="track-button" type="button" @click="router.push('/dashboard/music')">
          <span class="cover">
            <img
              v-if="musicStore.currentSong.album?.picUrl"
              :src="musicStore.currentSong.album.picUrl"
              :alt="musicStore.currentSong.name"
              referrerpolicy="no-referrer"
            />
            <n-icon v-else size="24"><MusicalNotesOutline /></n-icon>
          </span>
          <span class="track-copy">
            <span class="track-name">{{ musicStore.currentSong.name }}</span>
            <span class="track-artist">{{ artistText }}</span>
          </span>
        </button>

        <div class="center-controls">
          <div class="buttons">
            <n-button circle quaternary size="small" class="skip-control" :disabled="!musicStore.hasPrev" @click="musicStore.playPrev()">
              <template #icon><n-icon><PlaySkipBackOutline /></n-icon></template>
            </n-button>
            <n-button circle type="primary" size="medium" class="play-control" @click="handleTogglePlay">
              <template #icon>
                <n-icon>
                  <PauseOutline v-if="musicStore.isPlaying" />
                  <PlayOutline v-else />
                </n-icon>
              </template>
            </n-button>
            <n-button circle quaternary size="small" class="skip-control" :disabled="!musicStore.hasNext" @click="musicStore.playNext(true)">
              <template #icon><n-icon><PlaySkipForwardOutline /></n-icon></template>
            </n-button>
          </div>

          <div v-if="!isCompact" class="progress">
            <span>{{ musicStore.formatTime(musicStore.currentTime) }}</span>
            <n-slider
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
          <div class="volume-wrap" v-if="!isCompact">
            <n-button circle quaternary @click="showVolume = !showVolume">
              <template #icon>
                <n-icon>
                  <VolumeMuteOutline v-if="musicStore.volume === 0" />
                  <VolumeHighOutline v-else />
                </n-icon>
              </template>
            </n-button>
            <div v-if="showVolume" class="volume-popover">
              <n-slider
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

          <n-button circle quaternary @click="router.push('/dashboard/music')" title="打开音乐页">
            <template #icon><n-icon><OpenOutline /></n-icon></template>
          </n-button>

          <n-button circle quaternary @click="setCollapsed(true)" title="收起播放器">
            <template #icon><n-icon><ChevronDown /></n-icon></template>
          </n-button>
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
          />
          <n-icon v-else size="18"><MusicalNotesOutline /></n-icon>
        </span>
        <n-icon class="expand-icon" size="16"><ChevronUp /></n-icon>
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
  left: max(16px, calc(50% - 420px));
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 1800;
  display: grid;
  width: min(840px, calc(100vw - 32px));
  grid-template-columns: minmax(0, 1fr) minmax(260px, 1.2fr) auto;
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
