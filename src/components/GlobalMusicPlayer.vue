<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  NButton,
  NIcon,
  NSlider,
  NDrawer,
  NScrollbar,
  NBadge,
  NPopconfirm,
  NEmpty,
  useMessage
} from 'naive-ui'
import {
  PlayOutline,
  PauseOutline,
  PlaySkipForwardOutline,
  PlaySkipBackOutline,
  VolumeHighOutline,
  VolumeMuteOutline,
  RepeatOutline,
  ShuffleOutline,
  ListOutline,
  MusicalNotesOutline,
  TrashOutline,
  ChatboxOutline,
  ChevronDownOutline,
  ChevronUpOutline
} from '@vicons/ionicons5'
import type { Song } from '@/api/music'
import { useMusicStore } from '@/stores/music'

const message = useMessage()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const showPlaylistDrawer = ref(false)
const showLyricPanel = ref(false)  // ✅ 改为面板而不是抽屉
const isPlayerExpanded = ref(true)  // ✅ 播放器展开/收缩状态
const isPlayerVisible = ref(true)  // ✅ 播放器显示/隐藏状态
const showVolumeSlider = ref(false)  // ✅ 音量滑块显示状态
const isMobile = ref(false)  // ✅ 移动端检测
const audioRef = ref<HTMLAudioElement>()

// ✅ 检测屏幕宽度
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// =======================
// 播放器控制
// =======================
const handleTogglePlay = () => {
  if (!musicStore.currentSong) {
    message.warning('请先选择要播放的歌曲')
    return
  }
  musicStore.togglePlay()
}

const handleNext = () => {
  musicStore.playNext()
}

const handlePrev = () => {
  musicStore.playPrev()
}

const togglePlayMode = () => {
  const modes: Array<'sequence' | 'random' | 'loop' | 'single'> = ['sequence', 'random', 'loop', 'single']
  const currentIndex = modes.indexOf(musicStore.playMode)
  const nextIndex = (currentIndex + 1) % modes.length
  const nextMode = modes[nextIndex]
  
  if (nextMode) {
    musicStore.setPlayMode(nextMode)
    const modeNames: Record<typeof nextMode, string> = { 
      sequence: '顺序播放', 
      random: '随机播放', 
      loop: '列表循环',
      single: '单曲循环'
    }
    message.info(modeNames[nextMode])
  }
}

const playModeIcon = computed(() => {
  if (musicStore.playMode === 'single') return RepeatOutline
  if (musicStore.playMode === 'loop') return ListOutline
  if (musicStore.playMode === 'random') return ShuffleOutline
  return RepeatOutline
})

// =======================
// 音量控制
// =======================
const handleVolumeChange = (value: number) => {
  musicStore.setVolume(value / 100)
}

const toggleMute = () => {
  if (musicStore.volume > 0) {
    musicStore.setVolume(0)
  } else {
    musicStore.setVolume(0.7)
  }
}

// ✅ 切换音量滑块显示
const toggleVolumeSlider = () => {
  showVolumeSlider.value = !showVolumeSlider.value
}

// =======================
// 进度条控制
// =======================
const handleSeek = (value: number) => {
  if (audioRef.value) {
    audioRef.value.currentTime = value
    musicStore.updateCurrentTime(value)
  }
}

// =======================
// Audio 事件监听
// =======================
const handleTimeUpdate = () => {
  if (audioRef.value) {
    musicStore.updateCurrentTime(audioRef.value.currentTime)
  }
}

const handleLoadedMetadata = () => {
  if (audioRef.value) {
    musicStore.duration = audioRef.value.duration
  }
}

const handleEnded = () => {
  musicStore.playNext()
}

// 监听播放状态
watch(() => musicStore.isPlaying, (playing) => {
  if (audioRef.value) {
    if (playing) {
      // 检查音频是否已经准备好
      if (audioRef.value.readyState >= 2) {
        // 音频已加载足够数据，直接播放
        audioRef.value.play().catch(e => {
          console.error('播放失败:', e)
          musicStore.isPlaying = false
        })
      }
      // 如果音频还没准备好，会在 canplay 事件中处理
    } else {
      audioRef.value.pause()
    }
  }
})

// 监听当前歌曲
watch(() => musicStore.currentSong, (song) => {
  if (song && song.url && audioRef.value) {
    audioRef.value.src = song.url
    audioRef.value.load()
    
    // 如果当前状态是播放中，等待音频加载完成后自动播放
    if (musicStore.isPlaying) {
      const playWhenReady = () => {
        audioRef.value?.play().catch(e => {
          console.error('自动播放失败:', e)
          musicStore.isPlaying = false
        })
        audioRef.value?.removeEventListener('canplay', playWhenReady)
      }
      audioRef.value.addEventListener('canplay', playWhenReady)
    }
  }
})

// 监听音量
watch(() => musicStore.volume, (vol) => {
  if (audioRef.value) {
    audioRef.value.volume = vol
  }
})

// =======================
// 播放列表管理
// =======================
const handlePlayFromList = async (song: Song) => {
  await musicStore.playSong(song)
}

const handleRemoveFromPlaylist = (songId: number) => {
  musicStore.removeFromPlaylist(songId)
  message.success('已从播放列表移除')
}

const handleClearPlaylist = () => {
  musicStore.clearPlaylist()
  message.success('已清空播放列表')
}

// 切换歌词面板
const toggleLyricPanel = () => {
  showLyricPanel.value = !showLyricPanel.value
}

// ✅ 切换播放器展开/收缩
const togglePlayerExpanded = () => {
  isPlayerExpanded.value = !isPlayerExpanded.value
  // 如果收缩播放器，同时关闭歌词面板
  if (!isPlayerExpanded.value) {
    showLyricPanel.value = false
  }
}

// ✅ 切换播放器显示/隐藏
const togglePlayerVisible = () => {
  isPlayerVisible.value = !isPlayerVisible.value
  if (isPlayerVisible.value) {
    // 显示时自动展开
    isPlayerExpanded.value = true
  }
}

// ✅ 长按计时器
let pressTimer: number | null = null

// ✅ 长按开始
const handlePressStart = () => {
  pressTimer = window.setTimeout(() => {
    togglePlayerVisible()
    message.info('播放器已隐藏，点击右下角按钮可重新显示')
  }, 800) // 长按 800ms
}

// ✅ 长按结束或取消
const handlePressEnd = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

// 点击歌词跳转
const handleLyricClick = (time: number) => {
  musicStore.seek(time)
  if (audioRef.value) {
    audioRef.value.currentTime = time
  }
}

// 监听歌词索引变化，自动滚动
watch(() => musicStore.currentLyricIndex, (newIndex) => {
  if (newIndex >= 0 && showLyricPanel.value) {
    // 使用 nextTick 确保 DOM 已更新
    nextTick(() => {
      const activeLyric = document.querySelector('.lyric-panel-lyrics .lyric-line.active')
      if (activeLyric) {
        activeLyric.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    })
  }
})

// =======================
// 生命周期
// =======================
onMounted(() => {
  if (audioRef.value) {
    audioRef.value.volume = musicStore.volume
  }
  // ✅ 初始化移动端检测
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
  window.removeEventListener('resize', checkMobile)
  // ✅ 清理长按定时器
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
})
</script>

<template>
  <div class="global-music-player">
    <!-- ✅ 底部播放器：根据 isPlayerVisible 控制显示 -->
    <transition name="slide-up">
      <div v-if="musicStore.currentSong && isPlayerVisible" class="player-bar glass-card" :class="{ minimized: !isPlayerExpanded }">
      <!-- ✅ 收缩模式：只显示左侧信息和播放按钮 -->
      <template v-if="!isPlayerExpanded">
        <div class="player-left">
          <div class="player-cover-mini">
            <img
              v-if="musicStore.currentSong.album?.picUrl"
              :src="musicStore.currentSong.album.picUrl"
              :alt="musicStore.currentSong.name"
              referrerpolicy="no-referrer"
            />
            <n-icon v-else size="24"><MusicalNotesOutline /></n-icon>
          </div>
          <div class="player-info">
            <div class="player-name">{{ musicStore.currentSong.name }}</div>
            <div class="player-artist">
              {{ musicStore.currentSong.artists?.map(a => a.name).join(' / ') }}
            </div>
          </div>
        </div>
        
        <div class="player-controls-mini">
          <n-button
            circle
            quaternary
            size="small"
            @click="handlePrev"
            :disabled="!musicStore.hasPrev"
          >
            <template #icon><n-icon><PlaySkipBackOutline /></n-icon></template>
          </n-button>
          
          <n-button
            circle
            type="primary"
            @click="handleTogglePlay"
          >
            <template #icon>
              <n-icon>
                <PauseOutline v-if="musicStore.isPlaying" />
                <PlayOutline v-else />
              </n-icon>
            </template>
          </n-button>
          
          <n-button
            circle
            quaternary
            size="small"
            @click="handleNext"
            :disabled="!musicStore.hasNext"
          >
            <template #icon><n-icon><PlaySkipForwardOutline /></n-icon></template>
          </n-button>
          
          <n-button
            circle
            quaternary
            @click="togglePlayerExpanded"
            title="展开"
          >
            <template #icon><n-icon><ChevronUpOutline /></n-icon></template>
          </n-button>
        </div>
      </template>
      
      <!-- ✅ 完整模式：显示所有控制 -->
      <template v-else>
      <div class="player-left">
        <div class="player-cover">
          <img
            v-if="musicStore.currentSong.album?.picUrl"
            :src="musicStore.currentSong.album.picUrl"
            :alt="musicStore.currentSong.name"
            referrerpolicy="no-referrer"
          />
          <n-icon v-else size="32"><MusicalNotesOutline /></n-icon>
        </div>
        <div class="player-info">
          <div class="player-name">{{ musicStore.currentSong.name }}</div>
          <div class="player-artist">
            {{ musicStore.currentSong.artists?.map(a => a.name).join(' / ') }}
          </div>
        </div>
      </div>

      <div class="player-center">
        <div class="player-controls">
          <n-button
            circle
            secondary
            size="small"
            @click="handlePrev"
            :disabled="!musicStore.hasPrev"
          >
            <template #icon><n-icon><PlaySkipBackOutline /></n-icon></template>
          </n-button>

          <n-button
            circle
            type="primary"
            size="large"
            @click="handleTogglePlay"
          >
            <template #icon>
              <n-icon>
                <PauseOutline v-if="musicStore.isPlaying" />
                <PlayOutline v-else />
              </n-icon>
            </template>
          </n-button>

          <n-button
            circle
            secondary
            size="small"
            @click="handleNext"
            :disabled="!musicStore.hasNext"
          >
            <template #icon><n-icon><PlaySkipForwardOutline /></n-icon></template>
          </n-button>

          <n-button
            circle
            quaternary
            size="small"
            @click="togglePlayMode"
          >
            <template #icon><n-icon><component :is="playModeIcon" /></n-icon></template>
          </n-button>
        </div>

        <div class="player-progress">
          <span class="time">{{ musicStore.formatTime(musicStore.currentTime) }}</span>
          <n-slider
            v-model:value="musicStore.currentTime"
            :max="musicStore.duration"
            :step="0.1"
            :tooltip="false"
            @update:value="handleSeek"
            style="flex: 1;"
          />
          <span class="time">{{ musicStore.formatTime(musicStore.duration) }}</span>
        </div>
      </div>

      <div class="player-right">
        <n-button
          circle
          quaternary
          @click="toggleLyricPanel"
          :type="showLyricPanel ? 'primary' : 'default'"
          title="歌词"
        >
          <template #icon>
            <n-icon><ChatboxOutline /></n-icon>
          </template>
        </n-button>
        
        <!-- ✅ 音量控制：点击弹出竖向滑块 -->
        <div class="volume-control-wrapper">
          <n-button
            circle
            quaternary
            @click="toggleVolumeSlider"
            title="音量"
          >
            <template #icon>
              <n-icon>
                <VolumeMuteOutline v-if="musicStore.volume === 0" />
                <VolumeHighOutline v-else />
              </n-icon>
            </template>
          </n-button>
          
          <!-- 竖向音量滑块 -->
          <transition name="volume-slider">
            <div v-if="showVolumeSlider" class="volume-slider-popup">
              <n-slider
                :value="musicStore.volume * 100"
                :max="100"
                :step="1"
                :tooltip="false"
                @update:value="handleVolumeChange"
                vertical
                style="height: 120px;"
              />
              <div class="volume-value">{{ Math.round(musicStore.volume * 100) }}%</div>
            </div>
          </transition>
        </div>
        
        <n-button
          circle
          quaternary
          @click="showPlaylistDrawer = true"
        >
          <template #icon>
            <n-icon>
              <ListOutline />
            </n-icon>
          </template>
          <n-badge
            v-if="musicStore.playlist.length > 0"
            :value="musicStore.playlist.length"
            :max="99"
            style="position: absolute; top: -4px; right: -4px;"
          />
        </n-button>
        
        <n-button
          circle
          quaternary
          @click="togglePlayerExpanded"
          @mousedown="handlePressStart"
          @mouseup="handlePressEnd"
          @mouseleave="handlePressEnd"
          @touchstart="handlePressStart"
          @touchend="handlePressEnd"
          @touchcancel="handlePressEnd"
          title="收缩（长按隐藏）"
        >
          <template #icon><n-icon><ChevronDownOutline /></n-icon></template>
        </n-button>
      </div>
      </template>
      </div>
    </transition>
    
    <!-- ✅ 悬浮显示按钮：当播放器隐藏且有歌曲时显示 -->
    <transition name="fade">
      <div 
        v-if="musicStore.currentSong && !isPlayerVisible" 
        class="show-player-btn" 
        @click="togglePlayerVisible"
        @touchstart.prevent="togglePlayerVisible"
      >
        <n-icon size="24"><MusicalNotesOutline /></n-icon>
        <span class="playing-pulse" v-if="musicStore.isPlaying"></span>
      </div>
    </transition>

    <!-- 播放列表抽屉 -->
    <n-drawer
      v-model:show="showPlaylistDrawer"
      :width="isMobile ? '100%' : 400"
      placement="right"
    >
      <div class="playlist-drawer">
        <div class="playlist-drawer-header">
          <div class="header-title">
            <n-icon size="24" color="#f586a9"><ListOutline /></n-icon>
            <span>播放列表</span>
          </div>
          <div class="header-actions">
            <span class="song-count">共 {{ musicStore.playlist.length }} 首</span>
            <n-button
              v-if="musicStore.playlist.length > 0"
              text
              size="small"
              type="error"
              @click="handleClearPlaylist"
            >
              清空
            </n-button>
            <!-- ✅ 移动端关闭按钮 -->
            <n-button
              circle
              quaternary
              @click="showPlaylistDrawer = false"
              title="关闭"
            >
              <template #icon><n-icon size="20"><ChevronDownOutline /></n-icon></template>
            </n-button>
          </div>
        </div>

        <n-scrollbar style="max-height: calc(100vh - 180px);">
          <div class="playlist-content">
            <div v-if="musicStore.playlist.length === 0" class="playlist-empty">
              <n-empty description="播放列表为空">
                <template #icon>
                  <n-icon size="64" color="#d1d5db"><MusicalNotesOutline /></n-icon>
                </template>
              </n-empty>
            </div>

            <div
              v-for="(song, index) in musicStore.playlist"
              :key="`${song.id}-${index}`"
              class="playlist-song-item"
              :class="{ active: musicStore.currentSong?.id === song.id }"
              @click="handlePlayFromList(song)"
            >
              <div class="song-index">{{ index + 1 }}</div>
              
              <div class="song-cover-mini">
                <img
                  v-if="song.album?.picUrl"
                  :src="song.album.picUrl"
                  :alt="song.name"
                  referrerpolicy="no-referrer"
                />
                <n-icon v-else size="24"><MusicalNotesOutline /></n-icon>
              </div>

              <div class="song-info-mini">
                <div class="song-name-mini">{{ song.name }}</div>
                <div class="song-artist-mini">
                  {{ song.artists?.map(a => a.name).join(' / ') }}
                </div>
              </div>

              <div v-if="musicStore.currentSong?.id === song.id && musicStore.isPlaying" class="playing-indicator">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>

              <div class="song-actions-mini" @click.stop>
                <n-popconfirm @positive-click="handleRemoveFromPlaylist(song.id)">
                  <template #trigger>
                    <n-button
                      text
                      size="small"
                      type="error"
                      title="移除"
                    >
                      <template #icon><n-icon size="18"><TrashOutline /></n-icon></template>
                    </n-button>
                  </template>
                  确定从播放列表移除？
                </n-popconfirm>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </n-drawer>

    <!-- 歌词展开面板 -->
    <transition name="lyric-panel">
      <div v-if="showLyricPanel && musicStore.currentSong" class="lyric-panel glass-card">
        <div class="lyric-panel-header">
          <div class="lyric-panel-title">正在播放</div>
          <n-button
            circle
            quaternary
            size="small"
            @click="toggleLyricPanel"
          >
            <template #icon><n-icon><ChevronDownOutline /></n-icon></template>
          </n-button>
        </div>

        <div class="lyric-panel-content">
          <div class="lyric-panel-left">
            <div class="lyric-panel-cover">
              <img
                v-if="musicStore.currentSong.album?.picUrl"
                :src="musicStore.currentSong.album.picUrl"
                :alt="musicStore.currentSong.name"
                referrerpolicy="no-referrer"
              />
              <n-icon v-else size="64"><MusicalNotesOutline /></n-icon>
            </div>
            <div class="lyric-panel-info">
              <div class="lyric-panel-song-name">{{ musicStore.currentSong.name }}</div>
              <div class="lyric-panel-artist">
                {{ musicStore.currentSong.artists?.map(a => a.name).join(' / ') }}
              </div>
            </div>
          </div>

          <div class="lyric-panel-right">
            <n-scrollbar style="max-height: 300px;">
              <div class="lyric-panel-lyrics">
                <div
                  v-if="musicStore.lyrics.length === 0"
                  class="lyric-empty"
                >
                  <n-empty description="暂无歌词" />
                </div>
                <div
                  v-for="(line, index) in musicStore.lyrics"
                  :key="index"
                  class="lyric-line"
                  :class="{ active: index === musicStore.currentLyricIndex }"
                  @click="handleLyricClick(line.time)"
                >
                  {{ line.text }}
                </div>
              </div>
            </n-scrollbar>
          </div>
        </div>
      </div>
    </transition>

    <!-- HTML5 Audio -->
    <audio
      ref="audioRef"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @ended="handleEnded"
    />
  </div>
</template>

<style scoped>
.global-music-player {
  position: relative;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border-radius: 0;
}

/* 底部播放器 */
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 32px;
  z-index: 2000;
  transition: all 0.3s ease;
}

/* ✅ 收缩模式样式 */
.player-bar.minimized {
  padding: 12px 32px;
  gap: 16px;
  justify-content: space-between;
}

.player-bar.minimized .player-left {
  width: auto;
  flex: 1;
}

/* ✅ 收缩模式的控制按钮组 */
.player-controls-mini {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ✅ 收缩模式的封面 */
.player-cover-mini {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-cover-mini img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-left {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 250px;
}

.player-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-artist {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-progress {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.time {
  font-size: 12px;
  color: #6b7280;
  min-width: 40px;
  text-align: center;
}

.player-right {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 200px;
}

/* ✅ 音量控制弹窗 */
.volume-control-wrapper {
  position: relative;
}

.volume-slider-popup {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 1000;
}

.volume-value {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
  text-align: center;
  min-width: 45px;
}

/* 音量滑块动画 */
.volume-slider-enter-active,
.volume-slider-leave-active {
  transition: all 0.25s ease;
}

.volume-slider-enter-from,
.volume-slider-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ✅ 播放器滑动动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* ✅ 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ✅ 悬浮显示按钮 */
.show-player-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f586a9, #fca5c8);
  box-shadow: 0 8px 24px rgba(245, 134, 169, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  z-index: 2001;  /* ✅ 提高 z-index，确保在最上层 */
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;  /* ✅ 移除移动端点击高亮 */
  user-select: none;  /* ✅ 禁止选中 */
  touch-action: manipulation;  /* ✅ 优化触摸响应 */
}

.show-player-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 12px 32px rgba(245, 134, 169, 0.6);
}

.show-player-btn:active {
  transform: scale(0.95);  /* ✅ 移动端点击反馈 */
}

/* ✅ 播放中脉冲效果 */
.playing-pulse {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(245, 134, 169, 0.4);
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* 播放列表抽屉 */
.playlist-drawer {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.playlist-drawer-header {
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #6b7280;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.song-count {
  flex: 1;
}

.playlist-content {
  padding: 8px 0;
}

.playlist-empty {
  padding: 80px 20px;
  text-align: center;
}

.playlist-song-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.playlist-song-item:hover {
  background: rgba(245, 134, 169, 0.05);
}

.playlist-song-item.active {
  background: rgba(245, 134, 169, 0.1);
}

.playlist-song-item.active .song-name-mini {
  color: #f586a9;
}

.song-index {
  width: 24px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
  flex-shrink: 0;
}

.playlist-song-item.active .song-index {
  color: #f586a9;
}

.song-cover-mini {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-cover-mini img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info-mini {
  flex: 1;
  min-width: 0;
}

.song-name-mini {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist-mini {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playing-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-right: 8px;
}

.playing-indicator .bar {
  width: 3px;
  height: 16px;
  background: #f586a9;
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.playing-indicator .bar:nth-child(1) {
  animation-delay: 0s;
}

.playing-indicator .bar:nth-child(2) {
  animation-delay: 0.2s;
}

.playing-indicator .bar:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes wave {
  0%, 100% {
    height: 8px;
  }
  50% {
    height: 16px;
  }
}

.song-actions-mini {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.playlist-song-item:hover .song-actions-mini {
  opacity: 1;
}

/* 歌词展开面板 */
.lyric-panel {
  position: fixed;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 64px);
  max-width: 1200px;
  z-index: 1999;
  padding: 24px 32px;
}

.lyric-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.lyric-panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.lyric-panel-content {
  display: flex;
  gap: 32px;
}

.lyric-panel-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 250px;
}

.lyric-panel-cover {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.lyric-panel-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}



.lyric-panel-info {
  text-align: center;
  width: 100%;
}

.lyric-panel-song-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lyric-panel-artist {
  font-size: 14px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lyric-panel-right {
  flex: 1;
  min-width: 0;
}

.lyric-panel-lyrics {
  padding: 12px 0;
}

/* 过渡动画 */
.lyric-panel-enter-active,
.lyric-panel-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyric-panel-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.lyric-panel-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* 歌词抽屉（保留，以防万一） */
.lyric-drawer {
  padding: 24px;
}

.lyric-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.lyric-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.lyric-artist {
  font-size: 14px;
  color: #6b7280;
}

.lyric-content {
  padding: 24px 0;
}

.lyric-line {
  padding: 12px 0;
  font-size: 15px;
  line-height: 1.8;
  color: #9ca3af;
  transition: all 0.3s;
  cursor: pointer;
  text-align: center;
}

.lyric-line:hover {
  color: #6b7280;
}

.lyric-line.active {
  color: #f586a9;
  font-weight: 600;
  font-size: 17px;
  transform: scale(1.1);
}

.lyric-empty {
  padding: 80px 20px;
}

/* 响应式 */
@media (max-width: 768px) {
  /* ✅ 完整模式 */
  .player-bar {
    padding: 12px 12px;
    gap: 12px;
    flex-wrap: wrap;  /* ✅ 允许换行 */
  }

  /* ✅ 移动端收缩模式：紧凑横向布局 */
  .player-bar.minimized {
    padding: 10px 12px;
    gap: 8px;
    flex-wrap: nowrap;  /* 不换行 */
    justify-content: space-between;
  }
  
  /* 收缩模式下的左侧 */
  .player-bar.minimized .player-left {
    flex: 1;
    min-width: 0;
  }
  
  /* 收缩模式下的控制按钮 */
  .player-bar.minimized .player-controls-mini {
    flex-shrink: 0;
  }

  .player-left {
    width: 100%;
    margin-bottom: 0;
  }
  
  .player-cover {
    width: 48px;
    height: 48px;
  }
  
  .player-cover-mini {
    width: 40px;
    height: 40px;
  }

  .player-center {
    width: 100%;
    order: 3;  /* ✅ 控制按钮排到最后 */
  }
  
  /* ✅ 移动端显示进度条和时间 */
  .player-progress {
    display: flex !important;
    margin-top: 8px;
  }
  
  .player-progress .time {
    font-size: 11px;
    min-width: 35px;
  }
  
  .player-controls {
    gap: 12px;
  }
  
  .player-controls-mini {
    gap: 6px;
  }

  .player-right {
    width: auto;  /* ✅ 改为自动宽度 */
    flex: 0 0 auto;  /* ✅ 不伸缩 */
    order: 2;  /* ✅ 排在中间 */
    margin-top: 0;
    gap: 8px;  /* ✅ 紧凑间距 */
    justify-content: flex-end;  /* ✅ 靠右对齐 */
  }
  
  /* ✅ 移动端只显示播放列表和隐藏按钮，隐藏歌词和音量 */
  .player-right > .n-button:nth-child(1),  /* 歌词按钮 */
  .player-right > .volume-control-wrapper {  /* 音量按钮 */
    display: none;
  }
  
  /* ✅ 移动端按钮尺寸优化 */
  .player-right .n-button {
    flex-shrink: 0;  /* 防止按钮被压缩 */
  }
  
  /* ✅ 移动端悬浮按钮优化 */
  .show-player-btn {
    width: 56px;  /* 移动端略微缩小 */
    height: 56px;
    bottom: 20px;
    right: 20px;
  }
  
  /* ✅ 移动端脉冲动画 */
  .playing-pulse {
    animation: pulse-ring-mobile 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes pulse-ring-mobile {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }
}
</style>
