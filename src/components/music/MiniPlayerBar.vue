<script setup lang="ts">
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
import { NButton, NIcon, NSelect, NSlider } from 'naive-ui'
import { useMiniPlayerBar } from '@/composables/useMiniPlayerBar'

const {
  musicStore,
  isCompact,
  audioRef,
  showVolume,
  isCollapsed,
  artistText,
  qualityOptions,
  playModeOptions,
  handleTogglePlay,
  handleSeek,
  handleVolumeChange,
  handleQualityChange,
  handlePlayModeChange,
  openDrawer,
  setCollapsed,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleEnded,
  handleAudioError,
} = useMiniPlayerBar()
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
      @playing="musicStore.recordAudioStarted()"
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
  color: var(--ui-primary-hover);
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
  color: var(--ui-primary);
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
  background: var(--ui-primary);
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

  .detail-button {
    display: none;
  }

  .collapse-button {
    display: inline-flex;
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
