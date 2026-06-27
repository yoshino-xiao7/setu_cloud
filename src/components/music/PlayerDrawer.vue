<script setup lang="ts">
import type { AudioQuality, PlayerDrawerTab, PlayMode } from '@/stores/music'
import {
  ChatboxOutline,
  ListOutline,
  MusicalNotesOutline,
  PauseOutline,
  PlayOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline,
  VolumeHighOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NIcon,
  NSelect,
  NSlider,
  NTabPane,
  NTabs,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'
import LyricsPanel from './LyricsPanel.vue'
import QueuePanel from './QueuePanel.vue'

const message = useMessage()
const musicStore = useMusicStore()
const { isMobile } = useBreakpoint()

const artistText = computed(() =>
  musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
)

const currentDuration = computed(() => {
  const fallbackDuration = Math.round((musicStore.currentSong?.duration || 0) / 1000)
  return musicStore.duration || fallbackDuration || 1
})

const drawerHeight = computed(() => isMobile.value ? '92vh' : '76vh')

const playbackProgress = computed(() => {
  if (!currentDuration.value)
    return 0
  return Math.min(100, Math.round((musicStore.currentTime / currentDuration.value) * 100))
})

const qualityOptions = [
  { value: 'standard', label: '标准 · 128kbps' },
  { value: 'higher', label: '较高 · 192kbps' },
  { value: 'exhigh', label: '极高 · 320kbps' },
  { value: 'lossless', label: '无损 · FLAC' },
  { value: 'hires', label: 'Hi-Res' },
]

const playModeOptions = [
  { value: 'sequence', label: '顺序播放' },
  { value: 'loop', label: '列表循环' },
  { value: 'single', label: '单曲循环' },
  { value: 'random', label: '随机播放' },
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
  if (!musicStore.currentSong)
    return
  musicStore.seek(value)
}

function handleVolumeChange(value: number) {
  musicStore.setVolume(value / 100)
}

async function handleQualityChange(value: string) {
  const quality = value as AudioQuality
  const success = await musicStore.setAudioQuality(quality)
  if (!success)
    message.error(musicStore.lastPlaybackError || '切换音质失败')
}

function handlePlayModeChange(value: string) {
  musicStore.setPlayMode(value as PlayMode)
}

function handleTabChange(value: string | number) {
  musicStore.setPlayerDrawerTab(String(value) as PlayerDrawerTab)
}

function handleDrawerUpdate(show: boolean) {
  if (!show)
    musicStore.closePlayerDrawer()
}
</script>

<template>
  <NDrawer
    :show="musicStore.playerDrawerVisible"
    placement="bottom"
    :height="drawerHeight"
    display-directive="show"
    class="player-drawer"
    @update:show="handleDrawerUpdate"
  >
    <NDrawerContent
      closable
      :native-scrollbar="false"
      body-content-style="padding: 0;"
    >
      <template #header>
        音乐播放器
      </template>

      <div class="drawer-body">
        <NTabs
          :value="musicStore.playerDrawerTab"
          type="line"
          animated
          class="player-tabs"
          @update:value="handleTabChange"
        >
          <NTabPane name="now">
            <template #tab>
              <span class="tab-label">
                <NIcon><MusicalNotesOutline /></NIcon>
                正在播放
              </span>
            </template>

            <div class="now-pane">
              <div class="now-visual">
                <div class="cover-stage">
                  <div class="cover-shell" :class="{ playing: musicStore.isPlaying }">
                    <img
                      v-if="musicStore.currentSong?.album?.picUrl"
                      :src="musicStore.currentSong.album.picUrl"
                      :alt="musicStore.currentSong.name"
                      referrerpolicy="no-referrer"
                    >
                    <NIcon v-else size="42">
                      <MusicalNotesOutline />
                    </NIcon>
                  </div>
                </div>
              </div>

              <div class="now-details">
                <div v-if="musicStore.currentSong" class="song-copy">
                  <NTag size="small" round :bordered="false" type="success">
                    {{ musicStore.isPlaying ? '正在播放' : '已暂停' }}
                  </NTag>
                  <h2>{{ musicStore.currentSong.name }}</h2>
                  <p>{{ artistText }}</p>
                  <span v-if="musicStore.currentSong.album?.name" class="album-name">
                    {{ musicStore.currentSong.album.name }}
                  </span>
                </div>

                <div v-else class="drawer-empty">
                  <NEmpty description="还没有正在播放的歌曲">
                    <template #icon>
                      <NIcon><MusicalNotesOutline /></NIcon>
                    </template>
                  </NEmpty>
                </div>

                <div class="drawer-progress">
                  <div class="progress-meta">
                    <span>{{ musicStore.formatTime(musicStore.currentTime) }}</span>
                    <span>{{ playbackProgress }}%</span>
                    <span>{{ musicStore.formatTime(currentDuration) }}</span>
                  </div>
                  <NSlider
                    :value="musicStore.currentTime"
                    :max="currentDuration"
                    :step="0.1"
                    :tooltip="false"
                    :disabled="!musicStore.currentSong"
                    @update:value="handleSeek"
                  />
                </div>

                <div class="drawer-controls">
                  <NButton circle secondary size="large" :disabled="!musicStore.hasPrev" @click="musicStore.playPrev()">
                    <template #icon>
                      <NIcon><PlaySkipBackOutline /></NIcon>
                    </template>
                  </NButton>
                  <NButton circle type="primary" size="large" class="drawer-play-button" :disabled="!musicStore.currentSong" @click="handleTogglePlay">
                    <template #icon>
                      <NIcon size="26">
                        <PauseOutline v-if="musicStore.isPlaying" />
                        <PlayOutline v-else />
                      </NIcon>
                    </template>
                  </NButton>
                  <NButton circle secondary size="large" :disabled="!musicStore.hasNext" @click="musicStore.playNext(true)">
                    <template #icon>
                      <NIcon><PlaySkipForwardOutline /></NIcon>
                    </template>
                  </NButton>
                </div>

                <div class="settings-grid">
                  <label class="setting-item">
                    <span>音质</span>
                    <NSelect
                      :value="musicStore.audioQuality"
                      :options="qualityOptions"
                      size="small"
                      @update:value="handleQualityChange"
                    />
                  </label>
                  <label class="setting-item">
                    <span>播放模式</span>
                    <NSelect
                      :value="musicStore.playMode"
                      :options="playModeOptions"
                      size="small"
                      @update:value="handlePlayModeChange"
                    />
                  </label>
                  <label class="setting-item volume-setting">
                    <span>
                      <NIcon><VolumeHighOutline /></NIcon>
                      音量 {{ Math.round(musicStore.volume * 100) }}%
                    </span>
                    <NSlider
                      :value="musicStore.volume * 100"
                      :max="100"
                      :step="1"
                      :tooltip="false"
                      @update:value="handleVolumeChange"
                    />
                  </label>
                </div>
              </div>
            </div>
          </NTabPane>

          <NTabPane name="lyrics">
            <template #tab>
              <span class="tab-label">
                <NIcon><ChatboxOutline /></NIcon>
                歌词
              </span>
            </template>
            <div class="drawer-tab-content">
              <LyricsPanel embedded />
            </div>
          </NTabPane>

          <NTabPane name="queue">
            <template #tab>
              <span class="tab-label">
                <NIcon><ListOutline /></NIcon>
                播放队列
              </span>
            </template>
            <div class="drawer-tab-content">
              <QueuePanel embedded />
            </div>
          </NTabPane>
        </NTabs>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.player-drawer :deep(.n-drawer-content) {
  border-radius: 22px 22px 0 0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px) saturate(150%);
}

.drawer-body {
  height: 100%;
  padding: 0 24px 24px;
  overflow: hidden;
}

.player-tabs {
  height: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.player-tabs :deep(.n-tabs-pane-wrapper) {
  height: calc(100% - 46px);
  overflow: hidden;
}

.player-tabs :deep(.n-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.now-pane {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 28px;
  height: 100%;
  padding: 18px 0 4px;
  overflow: auto;
  scrollbar-gutter: stable;
}

.now-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.now-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: 20px;
}

.cover-stage {
  display: grid;
  place-items: center;
  width: 100%;
}

.cover-shell {
  width: min(280px, 100%);
  aspect-ratio: 1;
  border: 8px solid rgba(255, 255, 255, 0.86);
  border-radius: 28px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 243, 247, 0.98), rgba(232, 240, 255, 0.94));
  color: #f586a9;
  box-shadow: 0 24px 56px rgba(31, 41, 55, 0.16);
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.cover-shell.playing {
  box-shadow: 0 26px 64px rgba(245, 134, 169, 0.18), 0 14px 40px rgba(31, 41, 55, 0.12);
}

.cover-shell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  text-align: left;
}

.song-copy h2,
.song-copy p {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-copy h2 {
  color: #1f2937;
  font-size: 26px;
  font-weight: 900;
}

.song-copy p,
.album-name {
  color: #6b7280;
  font-size: 14px;
}

.album-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-empty {
  display: grid;
  min-height: 150px;
  place-items: center;
}

.drawer-progress {
  min-width: 0;
}

.progress-meta {
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}

.progress-meta span:nth-child(2) {
  color: #f586a9;
  text-align: center;
}

.progress-meta span:last-child {
  text-align: right;
}

.drawer-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
}

.drawer-play-button {
  width: 58px;
  height: 58px;
  box-shadow: 0 12px 26px rgba(245, 134, 169, 0.28);
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(140px, 0.7fr) minmax(140px, 0.7fr) minmax(220px, 1.1fr);
  gap: 12px;
  padding-top: 4px;
}

.setting-item {
  display: grid;
  gap: 8px;
}

.setting-item > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

.volume-setting {
  padding-top: 4px;
}

.drawer-tab-content {
  height: 100%;
  max-width: 920px;
  margin: 0 auto;
  overflow: auto;
  padding: 18px 0 4px;
  scrollbar-gutter: stable;
}

@media (max-width: 640px) {
  .drawer-body {
    padding: 0 16px 18px;
  }

  .player-drawer :deep(.n-drawer-content) {
    border-radius: 18px 18px 0 0;
  }

  .player-tabs :deep(.n-tabs-pane-wrapper) {
    height: calc(100% - 44px);
  }

  .now-pane {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-top: 14px;
  }

  .now-details {
    justify-content: flex-start;
    gap: 18px;
  }

  .cover-stage {
    min-height: 176px;
  }

  .cover-shell {
    width: min(180px, 62vw);
    border-radius: 24px;
  }

  .song-copy {
    align-items: center;
    text-align: center;
  }

  .song-copy h2 {
    font-size: 20px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .drawer-tab-content {
    padding-top: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover-shell {
    transition: none;
  }
}
</style>
