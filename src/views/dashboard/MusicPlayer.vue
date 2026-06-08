<script setup lang="ts">
import type { AddSongToPlaylistDto, CreatePlaylistDto, HotSearchItem, HotSearchResponse, MusicUrlResponse, MvUrl, MvUrlResponse, SearchResult, Song, UserPlaylist } from '@/api/music'
import {
  AddCircleOutline,
  AddOutline,
  AlbumsOutline,
  CheckmarkCircle,
  CloseOutline,
  DownloadOutline,
  FlameOutline,
  ListOutline,
  MusicalNotesOutline,
  PauseOutline,
  PlayCircleOutline,
  PlayOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline,
  SearchOutline,
  TimeOutline,
  TrashOutline,
  TrendingUpOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NList,
  NListItem,
  NModal,
  NSkeleton,
  NSlider,
  NSpace,
  NSwitch,
  useMessage
} from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { DOWNLOAD_PROXY_URL } from '@/api/env'
import {

  userMusicApi,

  userPlaylistApi
} from '@/api/music'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import LyricsPanel from '@/components/music/LyricsPanel.vue'
import MvPanel from '@/components/music/MvPanel.vue'
import QueuePanel from '@/components/music/QueuePanel.vue'
import { getApiErrorMessage } from '@/composables/useApiError'
import { useMusicStore } from '@/stores/music'
import { formatDuration } from '@/utils/dateFormat'

/** 网易云 API 搜索接口返回的原始歌曲数据结构 */
interface RawNeteaseSong {
  id: number
  name?: string
  ar?: { id: number, name: string }[]
  al?: { id: number, name: string, picUrl?: string }
  dt?: number
  mv?: number
}

/** catch 块中使用的通用错误类型 */
interface ApiError {
  code?: string
  message?: string
  response?: { status?: number, data?: { message?: string } }
}

const message = useMessage()
const router = useRouter()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = shallowRef<Song[]>([])

// ✅ 热门搜索
const hotSearchList = ref<HotSearchItem[]>([])
const showHotSearch = ref(false) // 是否显示热门搜索下拉框
const loadingHotSearch = ref(false)
const searchInputFocused = ref(false) // 搜索框是否聚焦

// ✅ 历史搜索
const searchHistory = ref<string[]>([])
const MAX_HISTORY = 10 // 最多保存 10 条历史

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
  if (!currentDuration.value)
    return 0
  return Math.min(100, Math.round((musicStore.currentTime / currentDuration.value) * 100))
})

// =======================
// 辅助函数
// =======================

// ✅ 格式化热度
function formatHotCount(count: number) {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  }
  return count.toString()
}

// =======================
// 搜索功能
// =======================

// ✅ 加载历史搜索
function loadSearchHistory() {
  try {
    const history = localStorage.getItem('music_search_history')
    if (history) {
      searchHistory.value = JSON.parse(history)
    }
  }
  catch {
    searchHistory.value = []
  }
}

// ✅ 保存历史搜索
function saveSearchHistory(keyword: string) {
  try {
    // 去除重复，将新搜索放在最前面
    const newHistory = [keyword, ...searchHistory.value.filter(k => k !== keyword)]
    // 限制数量
    searchHistory.value = newHistory.slice(0, MAX_HISTORY)
    // 保存到 localStorage
    localStorage.setItem('music_search_history', JSON.stringify(searchHistory.value))
  }
  catch {}
}

// ✅ 清空历史搜索
function clearSearchHistory() {
  searchHistory.value = []
  try {
    localStorage.removeItem('music_search_history')
    message.success('已清空搜索历史')
  }
  catch {}
}

// ✅ 删除单条历史
function removeHistoryItem(keyword: string) {
  searchHistory.value = searchHistory.value.filter(k => k !== keyword)
  try {
    localStorage.setItem('music_search_history', JSON.stringify(searchHistory.value))
  }
  catch {}
}

// ✅ 获取热门搜索
async function fetchHotSearch() {
  if (hotSearchList.value.length > 0) {
    // 已经加载过，直接显示
    return
  }

  loadingHotSearch.value = true
  try {
    const res = await userMusicApi.getHotSearch()
    const data = unwrapApiData<HotSearchResponse | null>(res, null)
    hotSearchList.value = data?.result?.hots || []
  }
  catch {
    hotSearchList.value = []
  }
  finally {
    loadingHotSearch.value = false
  }
}

// ✅ 搜索框聚焦
async function handleSearchFocus() {
  searchInputFocused.value = true
  // 只有当搜索框为空时才显示热门搜索
  if (!searchKeyword.value.trim()) {
    showHotSearch.value = true
    await fetchHotSearch()
  }
}

// ✅ 搜索框失焦
function handleSearchBlur() {
  searchInputFocused.value = false
  // 延迟隐藏，以便点击热门搜索项
  setTimeout(() => {
    if (!searchInputFocused.value) {
      showHotSearch.value = false
    }
  }, 200)
}

// ✅ 搜索词变化
function handleSearchInput() {
  // 用户输入内容后隐藏热门搜索
  if (searchKeyword.value.trim()) {
    showHotSearch.value = false
  }
  else {
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
function handleHotSearchClick(keyword: string) {
  searchKeyword.value = keyword
  showHotSearch.value = false
  handleSearch()
}

async function handleSearch() {
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
async function handleLoadMore() {
  if (loadingMore.value || !hasMore.value)
    return

  currentPage.value++
  await performSearch(true)
}

// ✅ 执行搜索（append: 是否追加模式）
async function performSearch(append: boolean = false) {
  if (append) {
    loadingMore.value = true
  }
  else {
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
      artists: (song.ar || []).map((artist: { id: number, name: string }) => ({
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
      mv: song.mv || 0 // ✅ 添加 MV ID
    }))

    // ✅ 追加或替换结果
    if (append) {
      searchResults.value = [...searchResults.value, ...newSongs]
    }
    else {
      searchResults.value = newSongs
    }

    totalSearched.value = data?.result?.songCount || 0

    // ✅ 判断是否还有更多
    hasMore.value = searchResults.value.length < totalSearched.value

    if (!append) {
      if (searchResults.value.length === 0) {
        message.info('没有找到相关歌曲')
      }
      else {
        message.success(`找到 ${totalSearched.value} 首歌曲，显示前 ${searchResults.value.length} 首`)
      }
    }
    else {
      message.success(`加载了 ${newSongs.length} 首歌曲`)
    }
  }
  catch (e: unknown) {
    let errMsg = getApiErrorMessage(e, '搜索失败')
    const err = e as ApiError

    if (err.code === 'ECONNABORTED') {
      errMsg = '请求超时，请稍后重试'
    }
    else if (err.message?.includes('Network Error')) {
      errMsg = '网络连接失败，请检查网络'
    }
    else if (err.response?.status === 500) {
      errMsg = '后端Token不可用或网易云服务异常'
    }

    message.error(errMsg)
  }
  finally {
    searching.value = false
    loadingMore.value = false
    loadingMsg.destroy()
  }
}

function handleKeyEnter(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSearch()
  }
}

// =======================
// 播放功能
// =======================
async function handlePlay(song: Song) {
  const success = await musicStore.playSong(song)
  if (success) {
    musicStore.addToPlaylist(song)
    message.success('开始播放')
  }
  else {
    message.error('播放失败，可能暂无可用Token或音乐资源不可用')
  }
}

async function handleTogglePlay() {
  if (!musicStore.currentSong) {
    message.warning('请先选择要播放的歌曲')
    return
  }
  if (!musicStore.currentSong.url) {
    const success = await musicStore.playSong(musicStore.currentSong)
    if (!success)
      message.error('播放失败，请尝试其他歌曲')
    return
  }
  musicStore.togglePlay()
}

function handlePlayerSeek(value: number) {
  if (!musicStore.currentSong)
    return
  musicStore.updateCurrentTime(value)
}

async function handleQualityChange(quality: typeof musicStore.audioQuality) {
  const success = await musicStore.setAudioQuality(quality)
  if (success) {
    const option = qualityOptions.find(item => item.value === quality)
    message.success(`已切换到${option?.label || '所选'}音质`)
  }
  else {
    message.error('切换音质失败')
  }
}

// ✅ 添加到播放列表（不播放）
function handleAddToPlayingList(song: Song) {
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

async function handleDownload(song: Song) {
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
  }
  catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '下载失败')
    message.error(errMsg)
  }
}

function confirmProxyDownload() {
  doProxyDownload(pendingDownloadUrl.value, pendingDownloadFilename.value)
  downloadModalVisible.value = false
}

function confirmNativeDownload() {
  doNativeDownload(pendingDownloadUrl.value, pendingDownloadFilename.value)
  downloadModalVisible.value = false
}

// 代理下载
function doProxyDownload(url: string, filename: string) {
  const proxyUrl = `${DOWNLOAD_PROXY_URL}/d/${url}?filename=${encodeURIComponent(filename)}`
  window.open(proxyUrl, '_blank')
  message.success('开始下载')
}

// 原生下载
function doNativeDownload(url: string, filename: string) {
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
async function loadMyPlaylists() {
  loadingPlaylists.value = true
  try {
    const res = await userPlaylistApi.getMyPlaylists()
    myPlaylists.value = unwrapApiList<UserPlaylist>(res)
  }
  catch {
    myPlaylists.value = []
  }
  finally {
    loadingPlaylists.value = false
  }
}

async function handleShowAddToPlaylist(song: Song) {
  selectedSong.value = song
  showAddToPlaylistDialog.value = true
  await loadMyPlaylists()
}

async function handleAddToPlaylist(playlistId: number) {
  if (!selectedSong.value)
    return

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
  }
  catch (e: unknown) {
    let errMsg = getApiErrorMessage(e, '添加失败')
    const err = e as ApiError

    if (err.response?.status === 409) {
      errMsg = '歌曲已存在于歌单中'
    }

    message.error(errMsg)
  }
}

// =======================
// 创建歌单
// =======================
function handleShowCreatePlaylist() {
  showAddToPlaylistDialog.value = false
  showCreatePlaylistDialog.value = true
}

async function handleCreatePlaylist() {
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
    }
    else {
      // 没有选中歌曲，重新加载歌单列表并打开对话框
      await loadMyPlaylists()
      showAddToPlaylistDialog.value = true
    }
  }
  catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '创建失败')
    message.error(errMsg)
  }
}

function handleCancelCreate() {
  showCreatePlaylistDialog.value = false
  showAddToPlaylistDialog.value = true
}

// =======================
// ✅ MV 播放功能
// =======================
async function handlePlayMv(song: Song) {
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
    }
    else if (responseData && 'data' in responseData) {
      const data = responseData.data
      mvData = Array.isArray(data) ? (data[0] || null) : data
    }
    else if (responseData && 'url' in responseData) {
      mvData = responseData
    }

    if (!mvData || !mvData.url) {
      throw new Error('无法获取 MV 播放地址')
    }

    // ✅ 使用 store 播放 MV
    if (typeof musicStore.playMv !== 'function') {
      throw new TypeError('musicStore.playMv is not a function')
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
  }
  catch (e: unknown) {
    let errMsg = getApiErrorMessage(e, '加载 MV 失败')
    const err = e as ApiError

    if (err.code === 'ECONNABORTED') {
      errMsg = '请求超时，请稍后重试'
    }
    else if (err.message?.includes('Network Error')) {
      errMsg = '网络连接失败，请检查网络'
    }

    message.error(errMsg)
  }
  finally {
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
          <NIcon size="30" color="#f586a9">
            <MusicalNotesOutline />
          </NIcon>
          <div>
            <h2 class="ui-page-title">
              网易云音乐
            </h2>
            <p class="ui-page-subtitle">
              搜索歌曲、播放音乐、收藏到你的歌单
            </p>
          </div>
        </div>
        <div class="search-title-actions">
          <NButton secondary @click="router.push('/dashboard/my-playlists')">
            <template #icon>
              <NIcon><AlbumsOutline /></NIcon>
            </template>
            我的歌单
          </NButton>
          <NButton secondary @click="router.push('/dashboard/music-history')">
            <template #icon>
              <NIcon><TimeOutline /></NIcon>
            </template>
            播放历史
          </NButton>
        </div>
      </div>
      <div class="search-box">
        <div class="search-input-wrapper">
          <NInput
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
              <NIcon><SearchOutline /></NIcon>
            </template>
          </NInput>

          <!-- ✅ 热门搜索下拉框 -->
          <transition name="hot-search">
            <div v-if="showHotSearch" class="hot-search-dropdown">
              <!-- ✅ 历史搜索 -->
              <div v-if="searchHistory.length > 0" class="search-history-section">
                <div class="search-history-header">
                  <div class="history-title">
                    <NIcon size="18" color="#6b7280">
                      <TimeOutline />
                    </NIcon>
                    <span>搜索历史</span>
                  </div>
                  <NButton text size="small" @click="clearSearchHistory">
                    <template #icon>
                      <NIcon size="16">
                        <TrashOutline />
                      </NIcon>
                    </template>
                    清空
                  </NButton>
                </div>
                <div class="search-history-list">
                  <div
                    v-for="(keyword, index) in searchHistory"
                    :key="keyword"
                    class="search-history-item"
                  >
                    <div class="history-keyword" @click="handleHotSearchClick(keyword)">
                      <NIcon size="16" color="#6b7280">
                        <SearchOutline />
                      </NIcon>
                      <span>{{ keyword }}</span>
                    </div>
                    <NButton
                      text
                      circle
                      size="small"
                      class="history-remove"
                      @click.stop="removeHistoryItem(keyword)"
                    >
                      <template #icon>
                        <NIcon size="14">
                          <CloseOutline />
                        </NIcon>
                      </template>
                    </NButton>
                  </div>
                </div>
              </div>

              <!-- ✅ 热门搜索 -->
              <div class="hot-search-header">
                <NIcon size="18" color="#f586a9">
                  <FlameOutline />
                </NIcon>
                <span>热门搜索</span>
              </div>

              <div v-if="loadingHotSearch" class="hot-search-loading">
                <NSkeleton text :repeat="5" />
              </div>

              <div v-else-if="hotSearchList.length > 0" class="hot-search-list">
                <div
                  v-for="(item, index) in hotSearchList.slice(0, 10)"
                  :key="item.first"
                  class="hot-search-item"
                  @click="handleHotSearchClick(item.first)"
                >
                  <div class="hot-search-rank" :class="{ top: index < 3 }">
                    {{ index + 1 }}
                  </div>
                  <div class="hot-search-keyword">
                    {{ item.first }}
                  </div>
                  <div class="hot-search-count">
                    <NIcon size="14" color="#f586a9">
                      <TrendingUpOutline />
                    </NIcon>
                    <span>{{ formatHotCount(item.second) }}</span>
                  </div>
                </div>
              </div>

              <div v-else class="hot-search-empty">
                <NEmpty description="暂无热门搜索" size="small" />
              </div>
            </div>
          </transition>
        </div>

        <NButton
          type="primary"
          size="large"
          :loading="searching"
          @click="handleSearch"
        >
          <template #icon>
            <NIcon><SearchOutline /></NIcon>
          </template>
          搜索
        </NButton>
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
            >
            <NIcon v-else size="34">
              <MusicalNotesOutline />
            </NIcon>
          </div>
          <div class="disc-shadow" :class="{ spinning: musicStore.isPlaying }" />
        </div>

        <div class="now-copy">
          <div class="now-label">
            <span class="live-dot" :class="{ playing: musicStore.isPlaying }" />
            {{ musicStore.isPlaying ? '正在播放' : '播放器' }}
          </div>
          <h3>{{ musicStore.currentSong?.name || '还没有正在播放的歌曲' }}</h3>
          <p>
            {{ musicStore.currentSong ? currentArtistText : '搜索歌曲后即可开始播放' }}
          </p>
          <div v-if="musicStore.currentSong?.album?.name" class="album-chip">
            {{ musicStore.currentSong.album.name }}
          </div>
        </div>

        <div class="player-progress">
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
            @update:value="handlePlayerSeek"
          />
        </div>

        <div class="now-controls">
          <NButton circle secondary size="large" :disabled="!musicStore.hasPrev" @click="musicStore.playPrev()">
            <template #icon>
              <NIcon><PlaySkipBackOutline /></NIcon>
            </template>
          </NButton>
          <NButton circle type="primary" size="large" class="main-play-button" :disabled="!musicStore.currentSong" @click="handleTogglePlay">
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

        <div class="quality-strip">
          <div class="quality-current">
            音质：{{ currentQualityLabel }}
          </div>
          <div class="quality-options">
            <NButton
              v-for="option in qualityOptions"
              :key="option.value"
              size="tiny"
              :type="musicStore.audioQuality === option.value ? 'primary' : 'default'"
              secondary
              @click="handleQualityChange(option.value)"
            >
              {{ option.label }}
            </NButton>
          </div>
        </div>
      </div>

      <QueuePanel />
      <LyricsPanel />
    </section>

    <!-- 搜索结果 -->
    <div v-if="searching" class="results-section">
      <NSpace vertical size="large">
        <NSkeleton v-for="i in 8" :key="i" height="80px" />
      </NSpace>
    </div>

    <div v-else-if="searchResults.length > 0" class="results-section">
      <h3 class="section-title">
        搜索结果 ({{ searchResults.length }}/{{ totalSearched }})
      </h3>
      <div class="song-list">
        <div
          v-for="(song, index) in searchResults"
          :key="`${song.id}-${index}`"
          v-memo="[song.id, song.name, song.duration, song.mv, musicStore.currentSong?.id === song.id]"
          class="song-item ui-card ui-card-hover"
          :class="{ active: musicStore.currentSong?.id === song.id }"
        >
          <div class="song-cover">
            <img
              v-if="song.album?.picUrl"
              :src="song.album.picUrl"
              :alt="song.name"
              referrerpolicy="no-referrer"
            >
            <div v-else class="cover-placeholder">
              <NIcon size="32" color="#999">
                <MusicalNotesOutline />
              </NIcon>
            </div>
          </div>

          <div class="song-info">
            <div class="song-name">
              {{ song.name }}
            </div>
            <div class="song-meta">
              <span class="artist">{{ song.artists?.map(a => a.name).join(' / ') || '未知' }}</span>
              <span class="separator">·</span>
              <span class="album">{{ song.album?.name || '未知专辑' }}</span>
            </div>
          </div>

          <div class="song-duration">
            {{ formatDuration(song.duration) }}
          </div>

          <div class="song-actions">
            <NButton
              circle
              secondary
              type="primary"
              title="播放"
              @click="handlePlay(song)"
            >
              <template #icon>
                <NIcon><PlayCircleOutline /></NIcon>
              </template>
            </NButton>

            <NButton
              circle
              secondary
              type="info"
              title="添加到播放列表"
              @click="handleAddToPlayingList(song)"
            >
              <template #icon>
                <NIcon><ListOutline /></NIcon>
              </template>
            </NButton>

            <NButton
              circle
              secondary
              type="success"
              title="添加到歌单"
              @click="handleShowAddToPlaylist(song)"
            >
              <template #icon>
                <NIcon><AddCircleOutline /></NIcon>
              </template>
            </NButton>

            <NButton
              circle
              secondary
              title="下载"
              class="download-btn"
              @click="handleDownload(song)"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
            </NButton>

            <!-- ✅ MV 按钮 -->
            <NButton
              v-if="song.mv && song.mv !== 0"
              circle
              secondary
              type="warning"
              title="播放 MV"
              @click="handlePlayMv(song)"
            >
              <template #icon>
                <NIcon><VideocamOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </div>
      </div>

      <!-- ✅ 加载更多按钮 -->
      <div v-if="hasMore" class="load-more-section">
        <NButton
          size="large"
          :loading="loadingMore"
          block
          secondary
          @click="handleLoadMore"
        >
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          加载更多 ({{ searchResults.length }}/{{ totalSearched }})
        </NButton>
      </div>

      <!-- ✅ 已加载全部提示 -->
      <div v-else class="no-more-section">
        <div class="no-more-text">
          <NIcon size="20" color="#6b7280">
            <CheckmarkCircle />
          </NIcon>
          <span>已加载全部 {{ totalSearched }} 首歌曲</span>
        </div>
      </div>
    </div>

    <div v-else-if="!searching && searchKeyword" class="empty-section ui-card">
      <NEmpty description="暂无搜索结果" size="large">
        <template #icon>
          <NIcon><SearchOutline /></NIcon>
        </template>
      </NEmpty>
    </div>

    <div v-else class="welcome-section ui-card">
      <NEmpty description="搜索你喜欢的音乐" size="large">
        <template #icon>
          <NIcon size="80">
            <MusicalNotesOutline />
          </NIcon>
        </template>
      </NEmpty>
    </div>

    <!-- 添加到歌单对话框 -->
    <NModal
      v-model:show="showAddToPlaylistDialog"
      preset="dialog"
      title="添加到歌单"
      positive-text="关闭"
      :show-icon="false"
    >
      <div class="add-to-playlist-dialog">
        <div v-if="selectedSong" class="selected-song-info">
          <NIcon size="20" color="#f586a9">
            <MusicalNotesOutline />
          </NIcon>
          <span>{{ selectedSong.name }} - {{ selectedSong.artists.map(a => a.name).join('/') }}</span>
        </div>

        <div v-if="loadingPlaylists" style="padding: 20px;">
          <NSkeleton height="60px" :repeat="3" />
        </div>

        <div v-else-if="myPlaylists.length === 0" style="padding: 20px; text-align: center;">
          <NEmpty description="还没有歌单">
            <template #extra>
              <NButton type="primary" @click="handleShowCreatePlaylist">
                <template #icon>
                  <NIcon><AddOutline /></NIcon>
                </template>
                创建新歌单
              </NButton>
            </template>
          </NEmpty>
        </div>

        <div v-else>
          <!-- 创建新歌单按钮 -->
          <NButton
            block
            dashed
            style="margin-bottom: 12px;"
            @click="handleShowCreatePlaylist"
          >
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            创建新歌单
          </NButton>

          <NList hoverable clickable>
            <NListItem
              v-for="playlist in myPlaylists"
              :key="playlist.id"
              @click="handleAddToPlaylist(playlist.id)"
            >
              <template #prefix>
                <NIcon size="24" color="#f586a9">
                  <AlbumsOutline />
                </NIcon>
              </template>
              <div class="playlist-item-content">
                <div class="playlist-item-name">
                  {{ playlist.name }}
                </div>
                <div class="playlist-item-meta">
                  {{ playlist.songCount }} 首歌曲
                </div>
              </div>
            </NListItem>
          </NList>
        </div>
      </div>
    </NModal>

    <!-- 创建歌单对话框 -->
    <NModal
      v-model:show="showCreatePlaylistDialog"
      preset="dialog"
      title="创建新歌单"
      positive-text="创建"
      negative-text="取消"
      @positive-click="handleCreatePlaylist"
      @negative-click="handleCancelCreate"
    >
      <NForm :model="createPlaylistForm" label-placement="left" label-width="80px" style="margin-top: 20px;">
        <NFormItem label="歌单名称" required>
          <NInput
            v-model:value="createPlaylistForm.name"
            placeholder="输入歌单名称"
            maxlength="50"
            show-count
          />
        </NFormItem>

        <NFormItem label="描述">
          <NInput
            v-model:value="createPlaylistForm.description"
            type="textarea"
            placeholder="描述一下这个歌单..."
            maxlength="200"
            show-count
            :rows="3"
          />
        </NFormItem>

        <NFormItem label="封面URL">
          <NInput
            v-model:value="createPlaylistForm.coverUrl"
            placeholder="可选，留空将显示默认封面"
          />
        </NFormItem>

        <NFormItem label="公开">
          <NSwitch v-model:value="createPlaylistForm.isPublic" :checked-value="1" :unchecked-value="0">
            <template #checked>
              公开
            </template>
            <template #unchecked>
              私密
            </template>
          </NSwitch>
        </NFormItem>
      </NForm>
    </NModal>

    <!-- 下载方式选择弹窗 -->
    <NModal v-model:show="downloadModalVisible">
      <n-card
        style="width: 400px; max-width: 92vw;"
        title="选择下载方式"
        :bordered="false"
        class="download-modal-card"
      >
        <div class="download-modal-content">
          <p class="download-desc">
            请选择您的下载方式：
          </p>
          <p class="download-tip">
            💡 温馨提示：代理下载可解决您无法正常下载的问题
          </p>

          <label class="download-checkbox">
            <input
              v-model="skipProxyConfirm"
              type="checkbox"
            >
            <span>本次登录不再提示</span>
          </label>
        </div>

        <template #footer>
          <NSpace justify="end">
            <NButton @click="downloadModalVisible = false">
              取消
            </NButton>
            <NButton secondary @click="confirmNativeDownload">
              原生下载
            </NButton>
            <NButton type="primary" color="#f586a9" @click="confirmProxyDownload">
              代理下载
            </NButton>
          </NSpace>
        </template>
      </n-card>
    </NModal>

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
