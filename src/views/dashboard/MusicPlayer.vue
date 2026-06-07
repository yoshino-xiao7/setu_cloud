<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
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
  NSlider,
  NSwitch,
  useMessage
} from 'naive-ui'
import {
  PauseOutline,
  SearchOutline,
  PlayOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline,
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
  TimeOutline,
  TrashOutline
} from '@vicons/ionicons5'
import {
  userMusicApi,
  userPlaylistApi,
  type Song,
  type UserPlaylist,
  type AddSongToPlaylistDto,
  type CreatePlaylistDto,
  type HotSearchItem,
  type HotSearchResponse,
  type MusicUrlResponse,
  type MvUrl,
  type MvUrlResponse,
  type SearchResult
} from '@/api/music'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { useMusicStore } from '@/stores/music'
import { getApiErrorMessage } from '@/composables/useApiError'
import LyricsPanel from '@/components/music/LyricsPanel.vue'
import MvPanel from '@/components/music/MvPanel.vue'
import QueuePanel from '@/components/music/QueuePanel.vue'

/** 网易云 API 搜索接口返回的原始歌曲数据结构 */
interface RawNeteaseSong {
  id: number
  name?: string
  ar?: { id: number; name: string }[]
  al?: { id: number; name: string; picUrl?: string }
  dt?: number
  mv?: number
}

/** catch 块中使用的通用错误类型 */
interface ApiError {
  code?: string
  message?: string
  response?: { status?: number; data?: { message?: string } }
}

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

const qualityOptions = [
  { value: 'standard', label: '标准', desc: '128kbps' },
  { value: 'higher', label: '较高', desc: '192kbps' },
  { value: 'exhigh', label: '极高', desc: '320kbps' },
  { value: 'lossless', label: '无损', desc: 'FLAC' },
  { value: 'hires', label: 'Hi-Res', desc: '高解析' }
] as const

const currentQualityLabel = computed(() => {
  const option = qualityOptions.find(item => item.value === musicStore.audioQuality)
  return option ? `${option.label} · ${option.desc}` : '标准 · 128kbps'
})

const currentArtistText = computed(() =>
  musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家'
)

const currentDuration = computed(() => {
  const fallbackDuration = Math.round((musicStore.currentSong?.duration || 0) / 1000)
  return musicStore.duration || fallbackDuration || 1
})

const playbackProgress = computed(() => {
  if (!currentDuration.value) return 0
  return Math.min(100, Math.round((musicStore.currentTime / currentDuration.value) * 100))
})

// =======================
// 辅助函数
// =======================
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
    const data = unwrapApiData<HotSearchResponse | null>(res, null)
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
    const data = unwrapApiData<SearchResult | null>(res, null)
    const rawSongs = data?.result?.songs || []
    
    // 映射网易云API的字段名到前端统一格式
    const newSongs = rawSongs.map((song: RawNeteaseSong) => ({
      id: song.id,
      name: song.name,
      artists: (song.ar || []).map((artist: { id: number; name: string }) => ({
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
  } catch (e: unknown) {
    let errMsg = getApiErrorMessage(e, '搜索失败')
    const err = e as ApiError
    
    if (err.code === 'ECONNABORTED') {
      errMsg = '请求超时，请稍后重试'
    } else if (err.message?.includes('Network Error')) {
      errMsg = '网络连接失败，请检查网络'
    } else if (err.response?.status === 500) {
      errMsg = '后端Token不可用或网易云服务异常'
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

const handlePlayerSeek = (value: number) => {
  if (!musicStore.currentSong) return
  musicStore.updateCurrentTime(value)
}

const handleQualityChange = async (quality: typeof musicStore.audioQuality) => {
  const success = await musicStore.setAudioQuality(quality)
  if (success) {
    const option = qualityOptions.find(item => item.value === quality)
    message.success(`已切换到${option?.label || '所选'}音质`)
  } else {
    message.error('切换音质失败')
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
// 会话内是否跳过代理确认
const skipProxyConfirm = ref(false)
// 下载弹窗状态
const downloadModalVisible = ref(false)
const pendingDownloadUrl = ref('')
const pendingDownloadFilename = ref('')

const handleDownload = async (song: Song) => {
  try {
    const res = await userMusicApi.getUrl(song.id, 'exhigh')
    const data = unwrapApiData<MusicUrlResponse['data']>(res, [])
    
    if (!Array.isArray(data) || data.length === 0 || !data[0]?.url) {
      message.error('无法获取下载地址')
      return
    }
    
    const url = data[0].url
    const filename = `${song.name} - ${song.artists.map(a => a.name).join(', ')}.mp3`
    
    // 如果已勾选"不再提示"，直接使用代理下载
    if (skipProxyConfirm.value) {
      doProxyDownload(url, filename)
      return
    }
    
    // 保存待下载信息，显示弹窗
    pendingDownloadUrl.value = url
    pendingDownloadFilename.value = filename
    downloadModalVisible.value = true
  } catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '下载失败')
    message.error(errMsg)
    console.error('下载失败:', e)
  }
}

const confirmProxyDownload = () => {
  doProxyDownload(pendingDownloadUrl.value, pendingDownloadFilename.value)
  downloadModalVisible.value = false
}

const confirmNativeDownload = () => {
  doNativeDownload(pendingDownloadUrl.value, pendingDownloadFilename.value)
  downloadModalVisible.value = false
}

// 代理下载
const doProxyDownload = (url: string, filename: string) => {
  const proxyUrl = `https://download.yukiryou.top/d/${url}?filename=${encodeURIComponent(filename)}`
  window.open(proxyUrl, '_blank')
  message.success('开始下载')
}

// 原生下载
const doNativeDownload = (url: string, filename: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  message.success('开始下载')
}

// =======================
// 歌单管理
// =======================
const loadMyPlaylists = async () => {
  loadingPlaylists.value = true
  try {
    const res = await userPlaylistApi.getMyPlaylists()
    myPlaylists.value = unwrapApiList<UserPlaylist>(res)
  } catch (e: unknown) {
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
  } catch (e: unknown) {
    let errMsg = getApiErrorMessage(e, '添加失败')
    const err = e as ApiError
    
    if (err.response?.status === 409) {
      errMsg = '歌曲已存在于歌单中'
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
      const playlistData = unwrapApiData<UserPlaylist | null>(newPlaylist, null)
      if (playlistData?.id) {
        await handleAddToPlaylist(playlistData.id)
      }
    } else {
      // 没有选中歌曲，重新加载歌单列表并打开对话框
      await loadMyPlaylists()
      showAddToPlaylistDialog.value = true
    }
  } catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '创建失败')
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
    const res = await userMusicApi.getMvUrl(song.mv)
    
    const responseData = unwrapApiData<MvUrlResponse | MvUrl | MvUrl[] | null>(res, null)
    
    // ✅ 处理响应数据
    let mvData: MvUrl | null = null
    
    // 尝试多种可能的数据结构
    if (Array.isArray(responseData)) {
      mvData = responseData[0] || null
    } else if (responseData && 'data' in responseData) {
      const data = responseData.data
      mvData = Array.isArray(data) ? (data[0] || null) : data
    } else if (responseData && 'url' in responseData) {
      mvData = responseData
    }
    
    if (!mvData || !mvData.url) {
      throw new Error('无法获取 MV 播放地址')
    }
    
    // ✅ 使用 store 播放 MV
    if (typeof musicStore.playMv !== 'function') {
      throw new Error('musicStore.playMv is not a function')
    }
    
    // ✅ 将 HTTP URL 转换为 HTTPS，避免混合内容导致浏览器显示不安全
    // 同时保存原始 URL 用于降级
    const originalMvUrl = mvData.url || ''
    const mvUrl = originalMvUrl.replace(/^http:\/\//i, 'https://')
    
    musicStore.playMv(mvUrl, {
      name: song.name,
      artist: song.artists.map(a => a.name).join(' / '),
      songId: song.id
    }, false, originalMvUrl !== mvUrl ? originalMvUrl : undefined)
    
    message.success('MV 加载成功')
  } catch (e: unknown) {
    let errMsg = getApiErrorMessage(e, '加载 MV 失败')
    const err = e as ApiError
    
    if (err.code === 'ECONNABORTED') {
      errMsg = '请求超时，请稍后重试'
    } else if (err.message?.includes('Network Error')) {
      errMsg = '网络连接失败，请检查网络'
    }
    
    message.error(errMsg)
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
  <div class="music-player-page page-container ui-page">
    <!-- 搜索区域 -->
    <div class="search-section ui-card">
      <div class="search-title">
        <div class="search-title-main">
          <n-icon size="30" color="#f586a9"><MusicalNotesOutline /></n-icon>
          <div>
            <h2 class="ui-page-title">网易云音乐</h2>
            <p class="ui-page-subtitle">搜索歌曲、播放音乐、收藏到你的歌单</p>
          </div>
        </div>
        <div class="search-title-actions">
          <n-button secondary @click="router.push('/dashboard/my-playlists')">
            <template #icon><n-icon><AlbumsOutline /></n-icon></template>
            我的歌单
          </n-button>
          <n-button secondary @click="router.push('/dashboard/music-history')">
            <template #icon><n-icon><TimeOutline /></n-icon></template>
            播放历史
          </n-button>
        </div>
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
                      <n-icon size="16" color="#6b7280"><SearchOutline /></n-icon>
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

    <section class="playback-workspace">
      <div class="now-playing-card ui-card">
        <div class="player-stage">
          <div class="now-cover">
            <img
              v-if="musicStore.currentSong?.album?.picUrl"
              :src="musicStore.currentSong.album.picUrl"
              :alt="musicStore.currentSong.name"
              referrerpolicy="no-referrer"
            />
            <n-icon v-else size="34"><MusicalNotesOutline /></n-icon>
          </div>
          <div class="disc-shadow" :class="{ spinning: musicStore.isPlaying }"></div>
        </div>

        <div class="now-copy">
          <div class="now-label">
            <span class="live-dot" :class="{ playing: musicStore.isPlaying }"></span>
            {{ musicStore.isPlaying ? '正在播放' : '播放器' }}
          </div>
          <h3>{{ musicStore.currentSong?.name || '还没有正在播放的歌曲' }}</h3>
          <p>
            {{ musicStore.currentSong ? currentArtistText : '搜索歌曲后即可开始播放' }}
          </p>
          <div class="album-chip" v-if="musicStore.currentSong?.album?.name">
            {{ musicStore.currentSong.album.name }}
          </div>
        </div>

        <div class="player-progress">
          <div class="progress-meta">
            <span>{{ musicStore.formatTime(musicStore.currentTime) }}</span>
            <span>{{ playbackProgress }}%</span>
            <span>{{ musicStore.formatTime(currentDuration) }}</span>
          </div>
          <n-slider
            :value="musicStore.currentTime"
            :max="currentDuration"
            :step="0.1"
            :tooltip="false"
            :disabled="!musicStore.currentSong"
            @update:value="handlePlayerSeek"
          />
        </div>

        <div class="now-controls">
          <n-button circle secondary size="large" :disabled="!musicStore.hasPrev" @click="musicStore.playPrev()">
            <template #icon><n-icon><PlaySkipBackOutline /></n-icon></template>
          </n-button>
          <n-button circle type="primary" size="large" class="main-play-button" :disabled="!musicStore.currentSong" @click="handleTogglePlay">
            <template #icon>
              <n-icon size="26">
                <PauseOutline v-if="musicStore.isPlaying" />
                <PlayOutline v-else />
              </n-icon>
            </template>
          </n-button>
          <n-button circle secondary size="large" :disabled="!musicStore.hasNext" @click="musicStore.playNext(true)">
            <template #icon><n-icon><PlaySkipForwardOutline /></n-icon></template>
          </n-button>
        </div>

        <div class="quality-strip">
          <div class="quality-current">音质：{{ currentQualityLabel }}</div>
          <div class="quality-options">
            <n-button
              v-for="option in qualityOptions"
              :key="option.value"
              size="tiny"
              :type="musicStore.audioQuality === option.value ? 'primary' : 'default'"
              secondary
              @click="handleQualityChange(option.value)"
            >
              {{ option.label }}
            </n-button>
          </div>
        </div>
      </div>

      <QueuePanel />
      <LyricsPanel />
    </section>

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
          class="song-item ui-card ui-card-hover"
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
          <n-icon size="20" color="#6b7280"><CheckmarkCircle /></n-icon>
          <span>已加载全部 {{ totalSearched }} 首歌曲</span>
        </div>
      </div>
    </div>

    <div v-else-if="!searching && searchKeyword" class="empty-section ui-card">
      <n-empty description="暂无搜索结果" size="large">
        <template #icon><n-icon><SearchOutline /></n-icon></template>
      </n-empty>
    </div>

    <div v-else class="welcome-section ui-card">
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

    <!-- 下载方式选择弹窗 -->
    <n-modal v-model:show="downloadModalVisible">
      <n-card 
        style="width: 400px; max-width: 92vw;" 
        title="选择下载方式" 
        :bordered="false"
        class="download-modal-card"
      >
        <div class="download-modal-content">
          <p class="download-desc">请选择您的下载方式：</p>
          <p class="download-tip">💡 温馨提示：代理下载可解决您无法正常下载的问题</p>
          
          <label class="download-checkbox">
            <input 
              type="checkbox" 
              v-model="skipProxyConfirm"
            />
            <span>本次登录不再提示</span>
          </label>
        </div>
        
        <template #footer>
          <n-space justify="end">
            <n-button @click="downloadModalVisible = false">取消</n-button>
            <n-button secondary @click="confirmNativeDownload">原生下载</n-button>
            <n-button type="primary" color="#f586a9" @click="confirmProxyDownload">代理下载</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <MvPanel />
  </div>
</template>

<style scoped>
/* 搜索区域 */
.search-section {
  padding: 28px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at 92% 12%, rgba(96, 165, 250, 0.15), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.search-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-title-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.search-title-main h2,
.search-title-main p {
  margin: 0;
}

.search-title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.playback-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 1.2fr) minmax(280px, 0.9fr) minmax(280px, 0.9fr);
  gap: 16px;
  align-items: stretch;
  margin-bottom: 24px;
}

.now-playing-card {
  position: relative;
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 18px;
  min-height: 430px;
  overflow: hidden;
  padding: 24px;
  background:
    radial-gradient(circle at 16% 16%, rgba(96, 165, 250, 0.16), transparent 32%),
    radial-gradient(circle at 88% 10%, rgba(245, 134, 169, 0.22), transparent 34%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.now-playing-card::before {
  content: "";
  position: absolute;
  inset: -22% -18% auto auto;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: rgba(91, 141, 239, 0.08);
  pointer-events: none;
}

.player-stage {
  position: relative;
  display: grid;
  min-height: 188px;
  place-items: center;
  isolation: isolate;
}

.now-cover {
  position: relative;
  z-index: 2;
  width: 180px;
  height: 180px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 8px solid rgba(255, 255, 255, 0.86);
  border-radius: 26px;
  background:
    linear-gradient(135deg, rgba(255, 243, 247, 0.98), rgba(232, 240, 255, 0.94));
  color: #f586a9;
  box-shadow: 0 22px 44px rgba(31, 41, 55, 0.18);
}

.now-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.disc-shadow {
  position: absolute;
  z-index: 1;
  width: 154px;
  height: 154px;
  border-radius: 999px;
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.95) 0 13%, rgba(31, 41, 55, 0.88) 14% 33%, rgba(245, 134, 169, 0.45) 34% 36%, rgba(31, 41, 55, 0.86) 37% 100%);
  transform: translateX(58px);
  box-shadow: 0 18px 36px rgba(31, 41, 55, 0.2);
  opacity: 0.82;
}

.disc-shadow.spinning {
  animation: disc-spin 18s linear infinite;
}

@keyframes disc-spin {
  from {
    transform: translateX(58px) rotate(0deg);
  }
  to {
    transform: translateX(58px) rotate(360deg);
  }
}

.now-copy {
  position: relative;
  z-index: 2;
  min-width: 0;
  text-align: center;
}

.now-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #f586a9;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #6b7280;
}

.live-dot.playing {
  background: #34d399;
  box-shadow: 0 0 0 5px rgba(52, 211, 153, 0.16);
}

.now-copy h3,
.now-copy p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.now-copy h3 {
  color: #1f2937;
  font-size: 22px;
  font-weight: 900;
}

.now-copy p {
  margin-top: 6px;
  color: #6b7280;
  font-size: 14px;
}

.album-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  margin-top: 12px;
  padding: 5px 12px;
  border: 1px solid rgba(96, 165, 250, 0.18);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.74);
  color: #3b6fb6;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-progress {
  position: relative;
  z-index: 2;
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

.now-controls {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
}

.main-play-button {
  width: 58px;
  height: 58px;
  box-shadow: 0 12px 26px rgba(245, 134, 169, 0.28);
}

.quality-strip {
  position: relative;
  z-index: 2;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(245, 134, 169, 0.12);
}

.quality-current {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
}

.quality-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

/* ✅ 热门搜索下拉框 */
.hot-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--ui-border);
  box-shadow: var(--ui-shadow-lg);
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
  color: #6b7280;
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
  color: #6b7280;
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
  font-weight: 800;
  color: var(--ui-text);
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
  cursor: pointer;
}

.song-item:hover {
  transform: translateY(-2px);
}

.song-item.active {
  background: rgba(255, 245, 248, 0.96);
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
  color: var(--ui-text);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-meta {
  font-size: 13px;
  color: var(--ui-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.separator {
  color: #d1d5db;
}

.song-duration {
  font-size: 14px;
  color: #6b7280;
  margin-right: 16px;
}

.song-actions {
  display: flex;
  gap: 8px;
}

/* 空状态 */
.empty-section,
.welcome-section {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
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
  color: #6b7280;
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
@media (max-width: 1180px) {
  .playback-workspace {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .now-playing-card {
    grid-column: 1 / -1;
    min-height: auto;
  }

  .player-stage {
    min-height: 170px;
  }

  .now-cover {
    width: 156px;
    height: 156px;
  }

  .disc-shadow {
    width: 136px;
    height: 136px;
  }
}

@media (max-width: 768px) {
  .search-section {
    padding: 20px;
  }

  .search-title {
    align-items: stretch;
  }

  .search-title-actions {
    width: 100%;
  }

  .search-title-actions :deep(.n-button) {
    flex: 1;
  }

  .search-box {
    flex-direction: column;
  }

  .playback-workspace {
    grid-template-columns: 1fr;
  }

  .now-playing-card {
    gap: 15px;
    min-height: auto;
    padding: 18px;
  }

  .player-stage {
    min-height: 136px;
  }

  .now-cover {
    width: 128px;
    height: 128px;
    border-width: 6px;
    border-radius: 20px;
  }

  .disc-shadow {
    width: 112px;
    height: 112px;
    transform: translateX(42px);
  }

  .disc-shadow.spinning {
    animation-name: disc-spin-mobile;
  }

  @keyframes disc-spin-mobile {
    from {
      transform: translateX(42px) rotate(0deg);
    }
    to {
      transform: translateX(42px) rotate(360deg);
    }
  }

  .now-copy h3 {
    font-size: 18px;
  }

  .now-copy p {
    font-size: 13px;
  }

  .quality-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .quality-options {
    justify-content: flex-start;
  }

  .main-play-button {
    width: 54px;
    height: 54px;
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
}

@media (prefers-reduced-motion: reduce) {
  .disc-shadow.spinning,
  .hot-search-enter-active,
  .hot-search-leave-active {
    animation: none;
    transition: none;
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

/* 下载弹窗样式 */
.download-modal-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.download-modal-content {
  padding: 8px 0;
}

.download-desc {
  color: #1f2937;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 8px;
}

.download-tip {
  color: #f586a9;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: rgba(245, 134, 169, 0.1);
  border-radius: 8px;
}

.download-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
}

.download-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #f586a9;
  cursor: pointer;
}
</style>
