<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  NInput,
  NButton,
  NIcon,
  NSpace,
  NCard,
  NEmpty,
  NSkeleton,
  NSlider,
  NTag,
  NDrawer,
  NScrollbar,
  useMessage
} from 'naive-ui'
import {
  SearchOutline,
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
  PlayCircleOutline
} from '@vicons/ionicons5'
import { userMusicApi, type Song } from '@/api/music'
import { useMusicStore } from '@/stores/music'

const message = useMessage()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<Song[]>([])
const showLyricDrawer = ref(false)

// Audio 元素引用
const audioRef = ref<HTMLAudioElement>()

// =======================
// 辅助函数
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

// 格式化时长
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 格式化播放次数
const formatPlayCount = (count: number) => {
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return count.toString()
}

// =======================
// 搜索功能
// =======================
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  const loadingMsg = message.loading('正在搜索中，请稍候...', { duration: 0 }) // ✅ 添加加载提示
  
  try {
    const res = await userMusicApi.search(searchKeyword.value.trim())
    const data = unwrap(res)
    const rawSongs = data?.result?.songs || []
    
    // ✅ 映射网易云API的字段名到前端统一格式
    searchResults.value = rawSongs.map((song: any) => ({
      id: song.id,
      name: song.name,
      // ✅ ar -> artists
      artists: (song.ar || []).map((artist: any) => ({
        id: artist.id,
        name: artist.name
      })),
      // ✅ al -> album
      album: {
        id: song.al?.id,
        name: song.al?.name,
        picUrl: song.al?.picUrl
      },
      // ✅ dt -> duration
      duration: song.dt || 0,
      picUrl: song.al?.picUrl
    }))
    
    if (searchResults.value.length === 0) {
      message.info('没有找到相关歌曲')
    } else {
      message.success(`找到 ${searchResults.value.length} 首歌曲`)
    }
  } catch (e: any) {
    let errMsg = '搜索失败'
    
    // ✅ 更详细的错误提示
    if (e.code === 'ECONNABORTED') {
      errMsg = '请求超时，请稍后重试'
    } else if (e.message?.includes('Network Error')) {
      errMsg = '网络连接失败，请检查网络'
    } else if (e?.response?.status === 500) {
      errMsg = '后端Token不可用或网易云服务异常'
    } else if (e?.response?.data?.message) {
      errMsg = e.response.data.message
    }
    
    message.error(errMsg)
    console.error('[Music Search Error]', e)
  } finally {
    searching.value = false
    loadingMsg.destroy() // ✅ 关闭加载提示
  }
}

// 快捷搜索（回车）
const handleKeyEnter = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch()
  }
}

// =======================
// 播放功能
// =======================
const handlePlay = async (song: Song) => {
  const success = await musicStore.playSong(song)
  if (success) {
    // 添加到播放列表
    musicStore.addToPlaylist(song)
  } else {
    message.error('播放失败，可能暂无可用Token或音乐资源不可用')
  }
}

// 查看歌词
const handleShowLyric = async (song: Song) => {
  await musicStore.playSong(song, false)
  showLyricDrawer.value = true
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
  const modes: Array<'sequence' | 'random' | 'loop'> = ['sequence', 'random', 'loop']
  const currentIndex = modes.indexOf(musicStore.playMode)
  const nextIndex = (currentIndex + 1) % modes.length
  const nextMode = modes[nextIndex]
  
  if (nextMode) {
    musicStore.setPlayMode(nextMode)
    const modeNames: Record<typeof nextMode, string> = { 
      sequence: '顺序播放', 
      random: '随机播放', 
      loop: '单曲循环' 
    }
    message.info(modeNames[nextMode])
  }
}

const playModeIcon = computed(() => {
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
      audioRef.value.play().catch(e => {
        console.error('播放失败:', e)
        musicStore.isPlaying = false
      })
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
  }
})

// 监听音量
watch(() => musicStore.volume, (vol) => {
  if (audioRef.value) {
    audioRef.value.volume = vol
  }
})

// =======================
// 歌词滚动
// =======================
const scrollToLyric = (index: number) => {
  const lyricEl = document.querySelector(`.lyric-line-${index}`)
  if (lyricEl) {
    lyricEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

watch(() => musicStore.currentLyricIndex, (index) => {
  if (showLyricDrawer.value && index >= 0) {
    scrollToLyric(index)
  }
})

// 点击歌词跳转
const handleLyricClick = (time: number) => {
  musicStore.seek(time)
  if (audioRef.value) {
    audioRef.value.currentTime = time
  }
}

// =======================
// 生命周期
// =======================
onMounted(() => {
  // 初始化音量
  if (audioRef.value) {
    audioRef.value.volume = musicStore.volume
  }
})

onUnmounted(() => {
  // 清理
  if (audioRef.value) {
    audioRef.value.pause()
  }
})
</script>

<template>
  <div class="music-player-page">
    <!-- 搜索区域 -->
    <div class="search-section glass-card">
      <div class="search-title">
        <n-icon size="28" color="#8b5cf6"><MusicalNotesOutline /></n-icon>
        <span>网易云音乐</span>
      </div>
      <div class="search-box">
        <n-input
          v-model:value="searchKeyword"
          size="large"
          placeholder="搜索歌曲、歌手、专辑..."
          clearable
          @keydown="handleKeyEnter"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button
          type="primary"
          size="large"
          :loading="searching"
          @click="handleSearch"
        >
          <template #icon><n-icon><SearchOutline /></n-icon></template>
          搜索
        </n-button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searching" class="results-section">
      <n-space vertical size="large">
        <n-skeleton v-for="i in 8" :key="i" height="80px" />
      </n-space>
    </div>

    <div v-else-if="searchResults.length > 0" class="results-section">
      <h3 class="section-title">搜索结果 ({{ searchResults.length }})</h3>
      <div class="song-list">
        <div
          v-for="(song, index) in searchResults"
          :key="`${song.id}-${index}`"
          class="song-item glass-card"
          :class="{ active: musicStore.currentSong?.id === song.id }"
        >
          <div class="song-cover">
            <img
              v-if="song.album?.picUrl"
              :src="song.album.picUrl"
              :alt="song.name"
              referrerpolicy="no-referrer"
            />
            <div v-else class="cover-placeholder">
              <n-icon size="32" color="#999"><MusicalNotesOutline /></n-icon>
            </div>
          </div>
          
          <div class="song-info">
            <div class="song-name">{{ song.name }}</div>
            <div class="song-meta">
              <span class="artist">{{ song.artists?.map(a => a.name).join(' / ') || '未知' }}</span>
              <span class="separator">·</span>
              <span class="album">{{ song.album?.name || '未知专辑' }}</span>
            </div>
          </div>

          <div class="song-duration">{{ formatDuration(song.duration) }}</div>

          <div class="song-actions">
            <n-button
              circle
              secondary
              type="primary"
              @click="handlePlay(song)"
            >
              <template #icon>
                <n-icon><PlayCircleOutline /></n-icon>
              </template>
            </n-button>
            <n-button
              circle
              secondary
              @click="handleShowLyric(song)"
            >
              <template #icon>
                <n-icon><ListOutline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!searching && searchKeyword" class="empty-section">
      <n-empty description="暂无搜索结果" size="large">
        <template #icon><n-icon><SearchOutline /></n-icon></template>
      </n-empty>
    </div>

    <div v-else class="welcome-section">
      <n-empty description="搜索你喜欢的音乐" size="large">
        <template #icon><n-icon size="80"><MusicalNotesOutline /></n-icon></template>
      </n-empty>
    </div>

    <!-- 底部播放器 -->
    <div v-if="musicStore.currentSong" class="player-bar glass-card">
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
          @click="toggleMute"
        >
          <template #icon>
            <n-icon>
              <VolumeMuteOutline v-if="musicStore.volume === 0" />
              <VolumeHighOutline v-else />
            </n-icon>
          </template>
        </n-button>
        <n-slider
          :value="musicStore.volume * 100"
          :max="100"
          :step="1"
          :tooltip="false"
          @update:value="handleVolumeChange"
          style="width: 100px;"
        />
        <n-button
          circle
          quaternary
          @click="showLyricDrawer = true"
        >
          <template #icon><n-icon><ListOutline /></n-icon></template>
        </n-button>
      </div>
    </div>

    <!-- 歌词抽屉 -->
    <n-drawer
      v-model:show="showLyricDrawer"
      :width="400"
      placement="right"
    >
      <div class="lyric-drawer">
        <div class="lyric-header">
          <div class="lyric-title">{{ musicStore.currentSong?.name || '暂无歌词' }}</div>
          <div class="lyric-artist">
            {{ musicStore.currentSong?.artists?.map(a => a.name).join(' / ') }}
          </div>
        </div>

        <n-scrollbar style="max-height: calc(100vh - 200px);">
          <div class="lyric-content">
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
              :class="[
                `lyric-line-${index}`,
                { active: index === musicStore.currentLyricIndex }
              ]"
              @click="handleLyricClick(line.time)"
            >
              {{ line.text }}
            </div>
          </div>
        </n-scrollbar>
      </div>
    </n-drawer>

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
.music-player-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 140px; /* 为底部播放器留出空间 */
}

.glass-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
}

/* 搜索区域 */
.search-section {
  padding: 32px;
  margin-bottom: 24px;
}

.search-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 24px;
}

.search-box {
  display: flex;
  gap: 12px;
}

.search-box :deep(.n-input) {
  flex: 1;
}

/* 结果区域 */
.results-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.song-item {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s;
  cursor: pointer;
}

.song-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.song-item.active {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.song-cover {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f3f4f6;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-meta {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.separator {
  color: #d1d5db;
}

.song-duration {
  font-size: 14px;
  color: #9ca3af;
  margin-right: 16px;
}

.song-actions {
  display: flex;
  gap: 8px;
}

/* 空状态 */
.empty-section,
.welcome-section {
  padding: 80px 20px;
  text-align: center;
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
  z-index: 1000;
  border-radius: 0;
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

/* 歌词抽屉 */
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
  color: #8b5cf6;
  font-weight: 600;
  font-size: 17px;
  transform: scale(1.1);
}

.lyric-empty {
  padding: 80px 20px;
}

/* 响应式 */
@media (max-width: 768px) {
  .music-player-page {
    padding: 16px;
    padding-bottom: 180px;
  }

  .search-section {
    padding: 20px;
  }

  .search-box {
    flex-direction: column;
  }

  .player-bar {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .player-left {
    width: 100%;
  }

  .player-center {
    width: 100%;
  }

  .player-right {
    width: 100%;
    justify-content: space-between;
  }

  .song-duration {
    display: none;
  }
}
</style>
