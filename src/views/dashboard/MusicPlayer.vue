<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
  AddOutline,
  CheckmarkCircle,
  FlameOutline,
  TrendingUpOutline,
  VideocamOutline,
  CloseOutline,
  ContractOutline,
  ExpandOutline,
  TimeOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { userMusicApi, userPlaylistApi, type Song, type UserPlaylist, type AddSongToPlaylistDto, type CreatePlaylistDto, type HotSearchItem } from '@/api/music'
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

// ✅ 热门搜索
const hotSearchList = ref<HotSearchItem[]>([])
const showHotSearch = ref(false)  // 是否显示热门搜索下拉框
const loadingHotSearch = ref(false)
const searchInputFocused = ref(false)  // 搜索框是否聚焦

// ✅ 历史搜索
const searchHistory = ref<string[]>([])
const MAX_HISTORY = 10  // 最多保存 10 条历史

// ✅ 分页状态
const currentPage = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loadingMore = ref(false)
const totalSearched = ref(0)

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

// ✅ MV 播放
const loadingMv = ref(false)

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

// ✅ 格式化热度
const formatHotCount = (count: number) => {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count.toString()
}

// =======================
// 搜索功能
// =======================

// ✅ 加载历史搜索
const loadSearchHistory = () => {
  try {
    const history = localStorage.getItem('music_search_history')
    if (history) {
      searchHistory.value = JSON.parse(history)
    }
  } catch (e) {
    console.error('加载搜索历史失败:', e)
    searchHistory.value = []
  }
}

// ✅ 保存历史搜索
const saveSearchHistory = (keyword: string) => {
  try {
    // 去除重复，将新搜索放在最前面
    const newHistory = [keyword, ...searchHistory.value.filter(k => k !== keyword)]
    // 限制数量
    searchHistory.value = newHistory.slice(0, MAX_HISTORY)
    // 保存到 localStorage
    localStorage.setItem('music_search_history', JSON.stringify(searchHistory.value))
  } catch (e) {
    console.error('保存搜索历史失败:', e)
  }
}

// ✅ 清空历史搜索
const clearSearchHistory = () => {
  searchHistory.value = []
  try {
    localStorage.removeItem('music_search_history')
    message.success('已清空搜索历史')
  } catch (e) {
    console.error('清空搜索历史失败:', e)
  }
}

// ✅ 删除单条历史
const removeHistoryItem = (keyword: string) => {
  searchHistory.value = searchHistory.value.filter(k => k !== keyword)
  try {
    localStorage.setItem('music_search_history', JSON.stringify(searchHistory.value))
  } catch (e) {
    console.error('删除搜索历史失败:', e)
  }
}

// ✅ 获取热门搜索
const fetchHotSearch = async () => {
  if (hotSearchList.value.length > 0) {
    // 已经加载过，直接显示
    return
  }
  
  loadingHotSearch.value = true
  try {
    const res = await userMusicApi.getHotSearch()
    const data = unwrap(res)
    hotSearchList.value = data?.result?.hots || []
  } catch (e) {
    console.error('获取热门搜索失败:', e)
    hotSearchList.value = []
  } finally {
    loadingHotSearch.value = false
  }
}

// ✅ 搜索框聚焦
const handleSearchFocus = async () => {
  searchInputFocused.value = true
  // 只有当搜索框为空时才显示热门搜索
  if (!searchKeyword.value.trim()) {
    showHotSearch.value = true
    await fetchHotSearch()
  }
}

// ✅ 搜索框失焦
const handleSearchBlur = () => {
  searchInputFocused.value = false
  // 延迟隐藏，以便点击热门搜索项
  setTimeout(() => {
    if (!searchInputFocused.value) {
      showHotSearch.value = false
    }
  }, 200)
}

// ✅ 搜索词变化
const handleSearchInput = () => {
  // 用户输入内容后隐藏热门搜索
  if (searchKeyword.value.trim()) {
    showHotSearch.value = false
  } else {
    // ✅ 如果清空了内容
    if (searchInputFocused.value) {
      // 显示热门搜索
      showHotSearch.value = true
    }
    // ✅ 清空搜索结果
    if (searchResults.value.length > 0) {
      searchResults.value = []
      currentPage.value = 1
      hasMore.value = true
      totalSearched.value = 0
    }
  }
}

// ✅ 点击热门搜索项
const handleHotSearchClick = (keyword: string) => {
  searchKeyword.value = keyword
  showHotSearch.value = false
  handleSearch()
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }

  // ✅ 搜索时关闭热门搜索下拉框
  showHotSearch.value = false
  
  // ✅ 保存到搜索历史
  saveSearchHistory(searchKeyword.value.trim())

  // ✅ 重置分页状态
  currentPage.value = 1
  searchResults.value = []
  hasMore.value = true
  totalSearched.value = 0

  await performSearch(false)
}

// ✅ 加载更多
const handleLoadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  currentPage.value++
  await performSearch(true)
}

// ✅ 执行搜索（append: 是否追加模式）
const performSearch = async (append: boolean = false) => {
  if (append) {
    loadingMore.value = true
  } else {
    searching.value = true
  }
  
  const loadingMsg = message.loading('正在搜索中，请稍候...', { duration: 0 })
  
  try {
    const offset = (currentPage.value - 1) * pageSize
    const res = await userMusicApi.search(searchKeyword.value.trim(), pageSize, offset)
    const data = unwrap(res)
    const rawSongs = data?.result?.songs || []
    
    // 映射网易云API的字段名到前端统一格式
    const newSongs = rawSongs.map((song: any) => ({
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
      picUrl: song.al?.picUrl,
      mv: song.mv || 0  // ✅ 添加 MV ID
    }))
    
    // ✅ 追加或替换结果
    if (append) {
      searchResults.value = [...searchResults.value, ...newSongs]
    } else {
      searchResults.value = newSongs
    }
    
    totalSearched.value = data?.result?.songCount || 0
    
    // ✅ 判断是否还有更多
    hasMore.value = searchResults.value.length < totalSearched.value
    
    if (!append) {
      if (searchResults.value.length === 0) {
        message.info('没有找到相关歌曲')
      } else {
        message.success(`找到 ${totalSearched.value} 首歌曲，显示前 ${searchResults.value.length} 首`)
      }
    } else {
      message.success(`加载了 ${newSongs.length} 首歌曲`)
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
    loadingMore.value = false
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

// =======================
// ✅ MV 播放功能
// =======================
const handlePlayMv = async (song: Song) => {
  if (!song.mv || song.mv === 0) {
    message.warning('该歌曲没有 MV')
    return
  }
  
  loadingMv.value = true
  const loadingMsg = message.loading('正在加载 MV...', { duration: 0 })
  
  try {
    // 获取 MV 播放地址
    console.log('[MV Debug] Requesting MV for id:', song.mv)
    const res = await userMusicApi.getMvUrl(song.mv)
    console.log('[MV Debug] Raw response:', res)
    
    const responseData = unwrap(res)
    console.log('[MV Debug] Unwrapped data:', responseData)
    
    // ✅ 处理响应数据
    let mvData = null
    
    // 尝试多种可能的数据结构
    if (responseData?.data) {
      mvData = responseData.data
    } else if (responseData?.url) {
      mvData = responseData
    }
    
    console.log('[MV Debug] Extracted MV data:', mvData)
    
    if (!mvData || !mvData.url) {
      console.error('[MV Debug] Invalid data structure:', {
        responseData,
        mvData,
        hasUrl: !!mvData?.url
      })
      throw new Error('无法获取 MV 播放地址')
    }
    
    console.log('[MV Debug] Successfully loaded MV:', {
      url: mvData.url,
      quality: mvData.r
    })
    
    // ✅ 使用 store 播放 MV
    console.log('[MV Debug] musicStore:', musicStore)
    console.log('[MV Debug] musicStore.playMv:', musicStore.playMv)
    
    if (typeof musicStore.playMv !== 'function') {
      console.error('[MV Debug] playMv is not a function!', {
        type: typeof musicStore.playMv,
        musicStore: Object.keys(musicStore)
      })
      throw new Error('musicStore.playMv is not a function')
    }
    
    musicStore.playMv(mvData.url, {
      name: song.name,
      artist: song.artists.map(a => a.name).join(' / '),
      songId: song.id
    })
    
    message.success('MV 加载成功')
  } catch (e: any) {
    let errMsg = '加载 MV 失败'
    
    if (e.code === 'ECONNABORTED') {
      errMsg = '请求超时，请稍后重试'
    } else if (e.message?.includes('Network Error')) {
      errMsg = '网络连接失败，请检查网络'
    } else if (e?.response?.data?.message) {
      errMsg = e.response.data.message
    } else if (e.message) {
      errMsg = e.message
    }
    
    message.error(errMsg)
    console.error('[MV Load Error]', e)
    console.error('[MV Load Error Detail]', {
      message: e.message,
      response: e.response,
      data: e.response?.data
    })
  } finally {
    loadingMv.value = false
    loadingMsg.destroy()
  }
}

// ✅ 组件挂载时加载历史搜索
onMounted(() => {
  loadSearchHistory()
})
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
        <div class="search-input-wrapper">
          <n-input
            v-model:value="searchKeyword"
            size="large"
            placeholder="搜索歌曲、歌手、专辑..."
            clearable
            @keydown="handleKeyEnter"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @input="handleSearchInput"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
          
          <!-- ✅ 热门搜索下拉框 -->
          <transition name="hot-search">
            <div v-if="showHotSearch" class="hot-search-dropdown">
              <!-- ✅ 历史搜索 -->
              <div v-if="searchHistory.length > 0" class="search-history-section">
                <div class="search-history-header">
                  <div class="history-title">
                    <n-icon size="18" color="#6b7280"><TimeOutline /></n-icon>
                    <span>搜索历史</span>
                  </div>
                  <n-button text size="small" @click="clearSearchHistory">
                    <template #icon>
                      <n-icon size="16"><TrashOutline /></n-icon>
                    </template>
                    清空
                  </n-button>
                </div>
                <div class="search-history-list">
                  <div
                    v-for="(keyword, index) in searchHistory"
                    :key="index"
                    class="search-history-item"
                  >
                    <div class="history-keyword" @click="handleHotSearchClick(keyword)">
                      <n-icon size="16" color="#9ca3af"><SearchOutline /></n-icon>
                      <span>{{ keyword }}</span>
                    </div>
                    <n-button
                      text
                      circle
                      size="small"
                      @click.stop="removeHistoryItem(keyword)"
                      class="history-remove"
                    >
                      <template #icon>
                        <n-icon size="14"><CloseOutline /></n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
              </div>
              
              <!-- ✅ 热门搜索 -->
              <div class="hot-search-header">
                <n-icon size="18" color="#f586a9"><FlameOutline /></n-icon>
                <span>热门搜索</span>
              </div>
              
              <div v-if="loadingHotSearch" class="hot-search-loading">
                <n-skeleton text :repeat="5" />
              </div>
              
              <div v-else-if="hotSearchList.length > 0" class="hot-search-list">
                <div
                  v-for="(item, index) in hotSearchList.slice(0, 10)"
                  :key="index"
                  class="hot-search-item"
                  @click="handleHotSearchClick(item.first)"
                >
                  <div class="hot-search-rank" :class="{ top: index < 3 }">{{ index + 1 }}</div>
                  <div class="hot-search-keyword">{{ item.first }}</div>
                  <div class="hot-search-count">
                    <n-icon size="14" color="#f586a9"><TrendingUpOutline /></n-icon>
                    <span>{{ formatHotCount(item.second) }}</span>
                  </div>
                </div>
              </div>
              
              <div v-else class="hot-search-empty">
                <n-empty description="暂无热门搜索" size="small" />
              </div>
            </div>
          </transition>
        </div>
        
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
      <h3 class="section-title">搜索结果 ({{ searchResults.length }}/{{ totalSearched }})</h3>
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
              class="download-btn"
            >
              <template #icon>
                <n-icon><DownloadOutline /></n-icon>
              </template>
            </n-button>
            
            <!-- ✅ MV 按钮 -->
            <n-button
              v-if="song.mv && song.mv !== 0"
              circle
              secondary
              type="warning"
              @click="handlePlayMv(song)"
              title="播放 MV"
            >
              <template #icon>
                <n-icon><VideocamOutline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- ✅ 加载更多按钮 -->
      <div v-if="hasMore" class="load-more-section">
        <n-button
          size="large"
          :loading="loadingMore"
          @click="handleLoadMore"
          block
          secondary
        >
          <template #icon>
            <n-icon><AddCircleOutline /></n-icon>
          </template>
          加载更多 ({{ searchResults.length }}/{{ totalSearched }})
        </n-button>
      </div>

      <!-- ✅ 已加载全部提示 -->
      <div v-else class="no-more-section">
        <div class="no-more-text">
          <n-icon size="20" color="#9ca3af"><CheckmarkCircle /></n-icon>
          <span>已加载全部 {{ totalSearched }} 首歌曲</span>
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

/* ✅ 搜索输入框包装器 */
.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-box :deep(.n-input) {
  flex: 1;
}

/* ✅ 热门搜索下拉框 */
.hot-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(245, 134, 169, 0.2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  z-index: 1500;  /* ✅ 提高 z-index 确保在搜索结果上方 */
  max-height: 500px;
  overflow-y: auto;
}

/* ✅ 历史搜索区域 */
.search-history-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.search-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px 8px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #6b7280;
}

.search-history-list {
  padding: 4px 0;
}

.search-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
}

.search-history-item:hover {
  background: rgba(107, 114, 128, 0.05);
}

.history-keyword {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #4b5563;
}

.history-keyword span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-remove {
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.search-history-item:hover .history-remove {
  opacity: 1;
}

.hot-search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 12px;
  font-size: 14px;
  font-weight: 700;
  color: #f586a9;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.hot-search-loading {
  padding: 16px 20px;
}

.hot-search-list {
  padding: 8px 0;
}

.hot-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hot-search-item:hover {
  background: rgba(245, 134, 169, 0.08);
}

.hot-search-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #9ca3af;
  background: #f3f4f6;
  border-radius: 6px;
  flex-shrink: 0;
}

.hot-search-rank.top {
  background: linear-gradient(135deg, #f586a9, #fca5c8);
  color: white;
}

.hot-search-keyword {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-search-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.hot-search-empty {
  padding: 32px 20px;
}

/* 热门搜索动画 */
.hot-search-enter-active,
.hot-search-leave-active {
  transition: all 0.25s ease;
}

.hot-search-enter-from,
.hot-search-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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

/* ✅ 加载更多区域 */
.load-more-section {
  margin-top: 24px;
  padding: 0 16px;
}

.load-more-section .n-button {
  height: 56px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s;
}

.load-more-section .n-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* ✅ 已加载全部提示 */
.no-more-section {
  margin-top: 32px;
  padding: 24px;
  text-align: center;
}

.no-more-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #9ca3af;
  font-weight: 500;
  padding: 12px 24px;
  background: rgba(156, 163, 175, 0.1);
  border-radius: 24px;
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
  
  /* ✅ 移动端隐藏时长 */
  .song-duration {
    display: none;
  }
  
  /* ✅ 移动端优化歌曲列表布局 */
  .song-item {
    padding: 12px;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .song-cover {
    width: 48px;
    height: 48px;
  }
  
  .song-info {
    flex: 1;
    min-width: 120px;
  }
  
  .song-name {
    font-size: 14px;
  }
  
  .song-meta {
    font-size: 12px;
  }
  
  /* ✅ 移动端按钮布局优化 */
  .song-actions {
    width: 100%;
    justify-content: space-around;
    gap: 4px;
  }
  
  .song-actions .n-button {
    flex: 1;
    max-width: 40px;
  }
  
  /* ✅ 移动端隐藏下载按钮 */
  .song-actions .download-btn {
    display: none;
  }
}

/* ✅ MV 播放器样式 */
.mv-player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.mv-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mv-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mv-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mv-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.mv-artist {
  font-size: 14px;
  color: #6b7280;
}

.mv-player-content {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.mv-video {
  width: 100%;
  height: auto;
  max-height: 70vh;
  display: block;
  cursor: pointer;
}

.mv-player-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quality-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

/* ✅ 画中画浮动卡片 */
.mini-mv-player {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-width: calc(100vw - 40px);
  z-index: 2500;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-mv-player:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.4);
}

.mini-mv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.mini-mv-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.mini-mv-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.mini-mv-name {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-mv-artist {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-mv-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mini-mv-video-wrapper {
  width: 100%;
  background: #000;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.mini-mv-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  cursor: pointer;
}

/* ✅ 浮动卡片动画 */
.mini-player-enter-active,
.mini-player-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-player-enter-from {
  opacity: 0;
  transform: translateY(100px) scale(0.8);
}

.mini-player-leave-to {
  opacity: 0;
  transform: translateY(100px) scale(0.8);
}

/* ✅ 移动端适配 */
@media (max-width: 768px) {
  .mini-mv-player {
    width: 300px;
    bottom: 80px;
    right: 16px;
  }
}
</style>
