<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NInput,
  NButton,
  NIcon,
  NSpace,
  NEmpty,
  NSkeleton,
  NModal,
  NList,
  NListItem,
  NForm,
  NFormItem,
  NSwitch,
  useMessage
} from 'naive-ui'
import {
  SearchOutline,
  PlayCircleOutline,
  AddCircleOutline,
  DownloadOutline,
  ListOutline,
  MusicalNotesOutline,
  AlbumsOutline,
  AddOutline
} from '@vicons/ionicons5'
import { userMusicApi, userPlaylistApi, type Song, type UserPlaylist, type AddSongToPlaylistDto, type CreatePlaylistDto } from '@/api/music'
import { useMusicStore } from '@/stores/music'

const message = useMessage()
const router = useRouter()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<Song[]>([])

// 添加到歌单
const showAddToPlaylistDialog = ref(false)
const selectedSong = ref<Song | null>(null)
const myPlaylists = ref<UserPlaylist[]>([])
const loadingPlaylists = ref(false)

// 创建新歌单
const showCreatePlaylistDialog = ref(false)
const createPlaylistForm = ref<CreatePlaylistDto>({
  name: '',
  description: '',
  coverUrl: '',
  isPublic: 0
})

// =======================
// 辅助函数
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
  const loadingMsg = message.loading('正在搜索中，请稍候...', { duration: 0 })
  
  try {
    const res = await userMusicApi.search(searchKeyword.value.trim())
    const data = unwrap(res)
    const rawSongs = data?.result?.songs || []
    
    // 映射网易云API的字段名到前端统一格式
    searchResults.value = rawSongs.map((song: any) => ({
      id: song.id,
      name: song.name,
      artists: (song.ar || []).map((artist: any) => ({
        id: artist.id,
        name: artist.name
      })),
      album: {
        id: song.al?.id,
        name: song.al?.name,
        picUrl: song.al?.picUrl
      },
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
    loadingMsg.destroy()
  }
}

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
    musicStore.addToPlaylist(song)
    message.success('开始播放')
  } else {
    message.error('播放失败，可能暂无可用Token或音乐资源不可用')
  }
}

// ✅ 添加到播放列表（不播放）
const handleAddToPlayingList = (song: Song) => {
  musicStore.addToPlaylist(song)
  message.success(`已添加 "${song.name}" 到播放列表`)
}

// =======================
// 下载功能
// =======================
const handleDownload = async (song: Song) => {
  try {
    const res = await userMusicApi.getUrl(song.id, 'exhigh')
    const data = unwrap(res) || []
    
    if (!Array.isArray(data) || data.length === 0 || !data[0]?.url) {
      message.error('无法获取下载地址')
      return
    }
    
    const url = data[0].url
    const a = document.createElement('a')
    a.href = url
    a.download = `${song.name} - ${song.artists.map(a => a.name).join(',')}.mp3`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    message.success('开始下载')
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || '下载失败'
    message.error(errMsg)
    console.error('下载失败:', e)
  }
}

// =======================
// 歌单管理
// =======================
const loadMyPlaylists = async () => {
  loadingPlaylists.value = true
  try {
    const res = await userPlaylistApi.getMyPlaylists()
    myPlaylists.value = unwrap(res) || []
  } catch (e: any) {
    console.error('加载歌单失败:', e)
    myPlaylists.value = []
  } finally {
    loadingPlaylists.value = false
  }
}

const handleShowAddToPlaylist = async (song: Song) => {
  selectedSong.value = song
  showAddToPlaylistDialog.value = true
  await loadMyPlaylists()
}

const handleAddToPlaylist = async (playlistId: number) => {
  if (!selectedSong.value) return

  try {
    const songData: AddSongToPlaylistDto = {
      songId: selectedSong.value.id,
      songName: selectedSong.value.name,
      artistName: selectedSong.value.artists.map(a => a.name).join('/'),
      albumName: selectedSong.value.album.name,
      coverUrl: selectedSong.value.album.picUrl,
      duration: selectedSong.value.duration
    }

    await userPlaylistApi.addSongToPlaylist(playlistId, songData)
    message.success('已添加到歌单')
    showAddToPlaylistDialog.value = false
  } catch (e: any) {
    let errMsg = '添加失败'
    
    if (e?.response?.status === 409) {
      errMsg = '歌曲已存在于歌单中'
    } else if (e?.response?.data?.message) {
      errMsg = e.response.data.message
    }
    
    message.error(errMsg)
    console.error('添加到歌单失败:', e)
  }
}

// =======================
// 创建歌单
// =======================
const handleShowCreatePlaylist = () => {
  showAddToPlaylistDialog.value = false
  showCreatePlaylistDialog.value = true
}

const handleCreatePlaylist = async () => {
  if (!createPlaylistForm.value.name.trim()) {
    message.warning('请输入歌单名称')
    return
  }

  try {
    const newPlaylist = await userPlaylistApi.createPlaylist(createPlaylistForm.value)
    message.success('创建成功')
    
    // 重置表单
    createPlaylistForm.value = {
      name: '',
      description: '',
      coverUrl: '',
      isPublic: 0
    }
    
    showCreatePlaylistDialog.value = false
    
    // 如果有选中的歌曲，创建完后直接添加
    if (selectedSong.value && newPlaylist) {
      const playlistData = unwrap(newPlaylist)
      if (playlistData?.id) {
        await handleAddToPlaylist(playlistData.id)
      }
    } else {
      // 没有选中歌曲，重新加载歌单列表并打开对话框
      await loadMyPlaylists()
      showAddToPlaylistDialog.value = true
    }
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || '创建失败'
    message.error(errMsg)
    console.error('创建歌单失败:', e)
  }
}

const handleCancelCreate = () => {
  showCreatePlaylistDialog.value = false
  showAddToPlaylistDialog.value = true
}
</script>

<template>
  <div class="music-player-page">
    <!-- 搜索区域 -->
    <div class="search-section glass-card">
      <div class="search-title">
        <n-icon size="28" color="#f586a9"><MusicalNotesOutline /></n-icon>
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
              title="播放"
            >
              <template #icon>
                <n-icon><PlayCircleOutline /></n-icon>
              </template>
            </n-button>
            
            <n-button
              circle
              secondary
              type="info"
              @click="handleAddToPlayingList(song)"
              title="添加到播放列表"
            >
              <template #icon>
                <n-icon><ListOutline /></n-icon>
              </template>
            </n-button>
            
            <n-button
              circle
              secondary
              type="success"
              @click="handleShowAddToPlaylist(song)"
              title="添加到歌单"
            >
              <template #icon>
                <n-icon><AddCircleOutline /></n-icon>
              </template>
            </n-button>
            
            <n-button
              circle
              secondary
              @click="handleDownload(song)"
              title="下载"
            >
              <template #icon>
                <n-icon><DownloadOutline /></n-icon>
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

    <!-- 添加到歌单对话框 -->
    <n-modal
      v-model:show="showAddToPlaylistDialog"
      preset="dialog"
      title="添加到歌单"
      positive-text="关闭"
      :show-icon="false"
    >
      <div class="add-to-playlist-dialog">
        <div v-if="selectedSong" class="selected-song-info">
          <n-icon size="20" color="#f586a9"><MusicalNotesOutline /></n-icon>
          <span>{{ selectedSong.name }} - {{ selectedSong.artists.map(a => a.name).join('/') }}</span>
        </div>

        <div v-if="loadingPlaylists" style="padding: 20px;">
          <n-skeleton height="60px" :repeat="3" />
        </div>

        <div v-else-if="myPlaylists.length === 0" style="padding: 20px; text-align: center;">
          <n-empty description="还没有歌单">
            <template #extra>
              <n-button type="primary" @click="handleShowCreatePlaylist">
                <template #icon><n-icon><AddOutline /></n-icon></template>
                创建新歌单
              </n-button>
            </template>
          </n-empty>
        </div>

        <div v-else>
          <!-- 创建新歌单按钮 -->
          <n-button
            block
            dashed
            @click="handleShowCreatePlaylist"
            style="margin-bottom: 12px;"
          >
            <template #icon><n-icon><AddOutline /></n-icon></template>
            创建新歌单
          </n-button>

          <n-list hoverable clickable>
            <n-list-item
              v-for="playlist in myPlaylists"
              :key="playlist.id"
              @click="handleAddToPlaylist(playlist.id)"
            >
              <template #prefix>
                <n-icon size="24" color="#f586a9"><AlbumsOutline /></n-icon>
              </template>
              <div class="playlist-item-content">
                <div class="playlist-item-name">{{ playlist.name }}</div>
                <div class="playlist-item-meta">{{ playlist.songCount }} 首歌曲</div>
              </div>
            </n-list-item>
          </n-list>
        </div>
      </div>
    </n-modal>

    <!-- 创建歌单对话框 -->
    <n-modal
      v-model:show="showCreatePlaylistDialog"
      preset="dialog"
      title="创建新歌单"
      positive-text="创建"
      negative-text="取消"
      @positive-click="handleCreatePlaylist"
      @negative-click="handleCancelCreate"
    >
      <n-form :model="createPlaylistForm" label-placement="left" label-width="80px" style="margin-top: 20px;">
        <n-form-item label="歌单名称" required>
          <n-input
            v-model:value="createPlaylistForm.name"
            placeholder="输入歌单名称"
            maxlength="50"
            show-count
          />
        </n-form-item>
        
        <n-form-item label="描述">
          <n-input
            v-model:value="createPlaylistForm.description"
            type="textarea"
            placeholder="描述一下这个歌单..."
            maxlength="200"
            show-count
            :rows="3"
          />
        </n-form-item>
        
        <n-form-item label="封面URL">
          <n-input
            v-model:value="createPlaylistForm.coverUrl"
            placeholder="可选，留空将显示默认封面"
          />
        </n-form-item>
        
        <n-form-item label="公开">
          <n-switch v-model:value="createPlaylistForm.isPublic" :checked-value="1" :unchecked-value="0">
            <template #checked>公开</template>
            <template #unchecked>私密</template>
          </n-switch>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.music-player-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
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
  background: rgba(245, 134, 169, 0.1);
  border-color: rgba(245, 134, 169, 0.3);
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

/* 添加到歌单对话框 */
.add-to-playlist-dialog {
  margin-top: 16px;
}

.selected-song-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(245, 134, 169, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.playlist-item-content {
  flex: 1;
}

.playlist-item-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.playlist-item-meta {
  font-size: 13px;
  color: #6b7280;
}

/* 响应式 */
@media (max-width: 768px) {
  .music-player-page {
    padding: 16px;
  }

  .search-section {
    padding: 20px;
  }

  .search-box {
    flex-direction: column;
  }

  .song-duration {
    display: none;
  }
}
</style>
