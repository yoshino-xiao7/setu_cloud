import type { LyricLine, MusicQuality, PlaylistSong, Song, UserPlaylist } from '@/api/music'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { observeMusic, installMusicExceptionObservation } from '@/api/musicObservation'
import { musicFlags } from '@/api/musicFlags'
import { musicHistoryApi, userPlaylistApi } from '@/api/music'
import { resolveSongPlayback, resolveSongLyrics } from '@/api/musicV2'
import { normalizeMusicIDs } from '@/api/musicIdentity'
import { createMusicLibraryState } from '@/composables/useMusicLibrary'
import { useAuthStore } from '@/stores/auth'
import { unwrapApiData, unwrapApiList } from '@/api/response'

export type PlayMode = 'sequence' | 'random' | 'loop' | 'single' // ✅ 添加 single 模式
export type AudioQuality = MusicQuality // ✅ 音质类型
export type PlayerDrawerTab = 'now' | 'lyrics' | 'queue'

const PLAYER_STATE_KEY = 'music_player_state_v1'

interface PersistedPlayerState {
  currentSong: Song | null
  playlist: Song[]
  playMode: PlayMode
  volume: number
  audioQuality: AudioQuality
}

export const useMusicStore = defineStore('music', () => {
  const auth = useAuthStore()
  const library = createMusicLibraryState(() => auth.user ? String(auth.user.id) : null)
  let playbackGeneration = 0
  let canonicalSession = false
  let observationStart: number | undefined
  let lyricGeneration = 0
  // =======================
  // 状态
  // =======================

  // 当前播放
  const currentSong = ref<Song | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  // 播放列表
  const playlist = ref<Song[]>([])
  const playMode = ref<PlayMode>('sequence')

  // 歌词
  const lyricLoading = ref(false)
  const lyricError = ref('')
  const lyrics = ref<LyricLine[]>([])
  const currentLyricIndex = ref(0)

  // 音量
  const volume = ref(0.7)

  // ✅ 音质（默认标准音质，保存到 localStorage）
  const audioQuality = ref<AudioQuality>('standard')
  const lastPlaybackError = ref('')

  // 播放历史（存储在 localStorage，使用 shallowRef 避免深度响应式开销）
  const playHistory = shallowRef<Song[]>([])

  // ✅ 用户歌单状态
  const myPlaylists = ref<UserPlaylist[]>([])
  const currentPlaylist = ref<UserPlaylist | null>(null)

  // ✅ MV 播放状态
  const currentMvUrl = ref('')
  const currentMvInfo = ref<{ name: string, artist: string, songId: string, originalUrl?: string } | null>(null)
  const mvPlayerMinimized = ref(false)
  const showMvModal = ref(false)

  // ✅ 播放器详情抽屉 UI 状态
  const playerDrawerVisible = ref(false)
  const playerDrawerTab = ref<PlayerDrawerTab>('now')

  const sanitizeSong = (song: Song | null): Song | null => {
    if (!song)
      return null
    return {
      ...(normalizeMusicIDs(song) as Song),
      url: undefined,
      originalUrl: undefined,
    }
  }

  const sanitizePlaylist = (songs: Song[]) => songs.map(song => sanitizeSong(song)).filter(Boolean) as Song[]

  function normalizePlayableUrl(originalUrl: string) {
    const httpsUrl = originalUrl.replace(/^http:\/\//i, 'https://')
    return {
      originalUrl,
      url: httpsUrl,
      fallbackUrl: originalUrl !== httpsUrl ? originalUrl : undefined,
    }
  }

  function setPlaybackError(error: unknown, fallback: string) {
    lastPlaybackError.value = error instanceof Error && error.message ? error.message : fallback
  }

  const savePlaybackState = () => {
    try {
      const state: PersistedPlayerState = {
        currentSong: sanitizeSong(currentSong.value),
        playlist: sanitizePlaylist(playlist.value),
        playMode: playMode.value,
        volume: volume.value,
        audioQuality: audioQuality.value,
      }
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state))
    }
    catch {}
  }

  const loadPlaybackState = () => {
    try {
      const raw = localStorage.getItem(PLAYER_STATE_KEY)
      if (!raw)
        return

      const state = JSON.parse(raw) as Partial<PersistedPlayerState>
      currentSong.value = sanitizeSong(state.currentSong || null)
      playlist.value = sanitizePlaylist(Array.isArray(state.playlist) ? state.playlist : [])
      if (state.playMode && ['sequence', 'random', 'loop', 'single'].includes(state.playMode)) {
        playMode.value = state.playMode
      }
      if (typeof state.volume === 'number') {
        volume.value = Math.max(0, Math.min(1, state.volume))
      }
      if (state.audioQuality && ['standard', 'higher', 'exhigh', 'lossless', 'hires'].includes(state.audioQuality)) {
        audioQuality.value = state.audioQuality
      }
      isPlaying.value = false
    }
    catch {
      localStorage.removeItem(PLAYER_STATE_KEY)
    }
  }

  // =======================
  // 计算属性
  // =======================

  const currentIndex = computed(() => {
    if (!currentSong.value)
      return -1
    return playlist.value.findIndex(s => s.id === currentSong.value!.id)
  })

  const hasNext = computed(() => {
    // ✅ 列表不为空时，以下模式一定可以切换
    if (playlist.value.length === 0)
      return false

    // 单曲循环、列表循环、随机播放：总是可以切换
    if (playMode.value === 'single' || playMode.value === 'loop' || playMode.value === 'random') {
      return playlist.value.length > 1 // 至少需要2首歌才能切换
    }

    // 顺序播放：检查是否还有下一首
    return currentIndex.value < playlist.value.length - 1
  })

  const hasPrev = computed(() => {
    // ✅ 列表不为空时，以下模式一定可以切换
    if (playlist.value.length === 0)
      return false

    // 单曲循环、列表循环、随机播放：总是可以切换
    if (playMode.value === 'single' || playMode.value === 'loop' || playMode.value === 'random') {
      return playlist.value.length > 1 // 至少需要2首歌才能切换
    }

    // 顺序播放：检查是否还有上一首
    return currentIndex.value > 0
  })

  // 格式化时间 (秒 -> mm:ss)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // =======================
  // 方法
  // =======================

  /** 播放歌曲 */
  const playSong = async (song: Song, autoPlay = true, continuingSession = false) => {
    lastPlaybackError.value = ''
    observationStart = performance.now()
    const token = ++playbackGeneration
    try {
      // ✅ 获取播放地址（使用当前音质设置）
      const address = await resolveSongPlayback(song, audioQuality.value, continuingSession && canonicalSession)
      if (token !== playbackGeneration) return false
      canonicalSession = musicFlags.usesV2Playback || song.id.startsWith('netease:track:')
      const playableUrl = normalizePlayableUrl(address)

      currentSong.value = {
        ...song,
        url: playableUrl.url,
        // ✅ 保存原始 HTTP URL 用于降级
        originalUrl: playableUrl.fallbackUrl,
      }

      // 加载歌词
      await loadLyric(song.id)
      if (token !== playbackGeneration) return false

      // 添加到播放历史
      addToHistory(song)

      // ✅ 记录到后端播放历史
      try {
        await musicHistoryApi.addHistory({
          songId: song.id,
          songName: song.name,
          artistName: song.artists.map(a => a.name).join('/'),
          albumName: song.album.name,
          coverUrl: song.album.picUrl,
          duration: song.duration,
        })
      }
      catch {}

      if (token !== playbackGeneration) return false
      if (autoPlay) {
        isPlaying.value = true
      }

      return true
    }
    catch (e: unknown) {
      if (token === playbackGeneration) { observeMusic('playback.failed', canonicalSession || musicFlags.usesV2Playback, observationStart); setPlaybackError(e, '该歌曲暂不可播放') }
      return false
    }
  }

  /** 加载歌词 */
  async function loadLyric(songId: string) {
    const token = ++lyricGeneration
    lyricLoading.value = true
    lyricError.value = ''
    lyrics.value = []
    try {
      const lines = await resolveSongLyrics(songId)
      if (token !== lyricGeneration) return
      lyrics.value = lines
      currentLyricIndex.value = 0
    }
    catch (e) {
      if (token === lyricGeneration) lyricError.value = e instanceof Error ? e.message : '歌词加载失败'
    }
    finally { if (token === lyricGeneration) lyricLoading.value = false }
  }

  /** 添加到播放列表 */
  const addToPlaylist = (song: Song | Song[]) => {
    const songs = Array.isArray(song) ? song : [song]

    for (const s of songs) {
      // 去重
      const exists = playlist.value.some(item => item.id === s.id)
      if (!exists) {
        playlist.value.push(s)
      }
    }
  }

  /** 从播放列表移除 */
  const removeFromPlaylist = (songId: string) => {
    const index = playlist.value.findIndex(s => s.id === songId)
    if (index !== -1) {
      playlist.value.splice(index, 1)
    }
  }

  /** 清空播放列表 */
  const clearPlaylist = () => {
    playlist.value = []
  }

  /** 播放/暂停 */
  const togglePlay = () => {
    isPlaying.value = !isPlaying.value
  }

  /** 下一曲 */
  const playNext = async (manual = false) => { // ✅ 添加 manual 参数区分手动/自动
    if (playlist.value.length === 0)
      return

    let nextIndex = currentIndex.value + 1

    // ✅ 根据播放模式计算下一曲
    switch (playMode.value) {
      case 'single':
        // 单曲循环：手动切换时跳到下一首，自动播放完时重复当前
        if (manual) {
          // 手动切换：跳到下一首
          nextIndex = currentIndex.value + 1
          if (nextIndex >= playlist.value.length) {
            nextIndex = 0
          }
        }
        else {
          // 自动播放完：重复当前歌曲
          nextIndex = currentIndex.value
        }
        break
      case 'random':
        // 随机播放：随机选择一首歌（不是当前歌曲）
        do {
          nextIndex = Math.floor(Math.random() * playlist.value.length)
        } while (nextIndex === currentIndex.value && playlist.value.length > 1)
        break
      case 'loop':
        // 列表循环：播放完最后一首回到第一首
        if (nextIndex >= playlist.value.length) {
          nextIndex = 0
        }
        break
      case 'sequence':
      default:
        // 顺序播放：播放到最后一首就停止（不循环）
        if (nextIndex >= playlist.value.length) {
          isPlaying.value = false
          return
        }
        break
    }

    const nextSong = playlist.value[nextIndex]
    if (nextSong) {
      await playSong(nextSong, true, true)
    }
  }

  /** 上一曲 */
  const playPrev = async () => {
    if (playlist.value.length === 0)
      return

    let prevIndex = currentIndex.value - 1

    // ✅ 根据播放模式计算上一曲
    switch (playMode.value) {
      case 'single':
        // 单曲循环：手动切换时跳到上一首
        prevIndex = currentIndex.value - 1
        if (prevIndex < 0) {
          prevIndex = playlist.value.length - 1
        }
        break
      case 'random':
        // 随机播放：随机选择一首歌（不是当前歌曲）
        do {
          prevIndex = Math.floor(Math.random() * playlist.value.length)
        } while (prevIndex === currentIndex.value && playlist.value.length > 1)
        break
      case 'loop':
        // 列表循环：到第一首时跳到最后一首
        if (prevIndex < 0) {
          prevIndex = playlist.value.length - 1
        }
        break
      case 'sequence':
      default:
        // 顺序播放：到第一首时跳到最后一首
        if (prevIndex < 0) {
          prevIndex = playlist.value.length - 1
        }
        break
    }

    const prevSong = playlist.value[prevIndex]
    if (prevSong) {
      await playSong(prevSong, true, true)
    }
  }

  /** 更新当前时间 */
  const updateCurrentTime = (time: number) => {
    currentTime.value = time

    // 更新当前歌词索引
    for (let i = lyrics.value.length - 1; i >= 0; i--) {
      const lyric = lyrics.value[i]
      if (lyric && lyric.time <= time) {
        currentLyricIndex.value = i
        break
      }
    }
  }

  /** 设置播放模式 */
  const setPlayMode = (mode: PlayMode) => {
    playMode.value = mode
  }

  /** 设置音量 */
  const setVolume = (vol: number) => {
    volume.value = Math.max(0, Math.min(1, vol))
  }

  /** 跳转到指定时间 */
  const seek = (time: number) => {
    currentTime.value = time
  }

  const openPlayerDrawer = (tab: PlayerDrawerTab = 'now') => {
    playerDrawerTab.value = tab
    playerDrawerVisible.value = true
  }

  const closePlayerDrawer = () => {
    playerDrawerVisible.value = false
  }

  const setPlayerDrawerTab = (tab: PlayerDrawerTab) => {
    playerDrawerTab.value = tab
  }

  // =======================
  // ✅ 音质管理
  // =======================

  /** 设置音质 */
  const setAudioQuality = async (quality: AudioQuality) => {
    const oldQuality = audioQuality.value
    lastPlaybackError.value = ''
    audioQuality.value = quality

    // 保存到 localStorage
    try {
      localStorage.setItem('audio_quality', quality)
    }
    catch {}

    // 如果正在播放，重新加载当前歌曲以应用新音质
    if (currentSong.value && isPlaying.value) {
      const currentSongCopy = currentSong.value
      const wasPlaying = isPlaying.value

      const token = ++playbackGeneration
      try {
        // 重新获取播放地址
        const address = await resolveSongPlayback(currentSongCopy, quality, canonicalSession)
        if (token !== playbackGeneration) return false
        const playableUrl = normalizePlayableUrl(address)

        currentSong.value = {
          ...currentSongCopy,
          url: playableUrl.url,
          originalUrl: playableUrl.fallbackUrl,
        }

        // 恢复播放状态和进度
        if (wasPlaying) {
          isPlaying.value = true
        }
        // 进度会在 audio 组件中恢复
      }
      catch (e: unknown) {
        if (token !== playbackGeneration) return false
        // 恢复原音质
        audioQuality.value = oldQuality
        localStorage.setItem('audio_quality', oldQuality)
        setPlaybackError(e, '新音质不可用')
        return false
      }
    }

    return true
  }

  /** 从 localStorage 加载音质设置 */
  const loadAudioQuality = () => {
    try {
      const saved = localStorage.getItem('audio_quality')
      if (saved && ['standard', 'higher', 'exhigh', 'lossless', 'hires'].includes(saved)) {
        audioQuality.value = saved as AudioQuality
      }
    }
    catch {}
  }

  /** 添加到播放历史 */
  function addToHistory(song: Song) {
    // 去重 + 添加到最前面（shallowRef 要求创建新数组引用）
    let history = playHistory.value.filter(s => s.id !== song.id)
    history = [song, ...history]
    // 最多保留 100 条
    if (history.length > 100) {
      history = history.slice(0, 100)
    }
    playHistory.value = history
    // 保存到 localStorage
    try {
      localStorage.setItem('music_history', JSON.stringify(playHistory.value))
    }
    catch {}
  }

  /** 从 localStorage 加载播放历史 */
  const loadHistory = () => {
    try {
      const data = localStorage.getItem('music_history')
      if (data) {
        playHistory.value = sanitizePlaylist(normalizeMusicIDs(JSON.parse(data)) as Song[])
      }
    }
    catch {}
  }

  // =======================
  // ✅ 歌单管理方法
  // =======================

  /** 加载我的歌单 */
  const loadMyPlaylists = async () => {
    try {
      const res = await userPlaylistApi.getMyPlaylists()
      myPlaylists.value = unwrapApiList<UserPlaylist>(res)
    }
    catch {
      myPlaylists.value = []
    }
  }

  /** 加载歌单详情 */
  const loadPlaylistDetail = async (id: string) => {
    try {
      const res = await userPlaylistApi.getPlaylistById(id)
      currentPlaylist.value = unwrapApiData<UserPlaylist | null>(res, null)
      return currentPlaylist.value
    }
    catch {
      return null
    }
  }

  /** 播放歌单 */
  const playPlaylist = async (playlistData: UserPlaylist) => {
    currentPlaylist.value = playlistData

    if (!playlistData.songs || playlistData.songs.length === 0) {
      return false
    }

    // 记录播放次数
    try {
      await userPlaylistApi.recordPlay(playlistData.id)
    }
    catch {}

    // 将歌单歌曲转换为 Song 格式
    let songs: Song[] = playlistData.songs.map((ps: PlaylistSong) => ({
      id: ps.songId,
      name: ps.songName,
      artists: ps.artistName.split('/').map((name, index) => ({
        id: String(index),
        name: name.trim(),
      })),
      album: {
        id: '',
        name: ps.albumName || '未知专辑',
        picUrl: ps.coverUrl,
      },
      duration: ps.duration,
      picUrl: ps.coverUrl,
    }))

    // 根据播放模式处理
    switch (playlistData.playMode) {
      case 'random':
        // 随机打乱
        songs = shuffleArray(songs)
        break
      case 'sequence':
      case 'loop':
      case 'single':
        // 按 sortOrder 排序（默认已排序）
        break
    }

    // 设置播放列表和模式
    playlist.value = songs
    playMode.value = playlistData.playMode

    // 播放第一首
    if (songs.length > 0) {
      const firstSong = songs[0]
      if (firstSong) {
        return await playSong(firstSong)
      }
    }

    return false
  }

  /** 打乱数组 */
  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = arr[i]
      const swapItem = arr[j]
      if (temp !== undefined && swapItem !== undefined) {
        arr[i] = swapItem
        arr[j] = temp
      }
    }
    return arr
  }

  watch(() => auth.user?.id, () => {
    playbackGeneration++
    canonicalSession = false
    lyricGeneration++
    currentSong.value = null
    playlist.value = []
    lyrics.value = []
    isPlaying.value = false
  }, { flush: 'sync' })

  observeMusic('session', musicFlags.usesV2Playback)
  installMusicExceptionObservation(() => canonicalSession || musicFlags.usesV2Playback)
  function recordAudioStarted() {
    if (observationStart !== undefined) { observeMusic('playback.started', canonicalSession, observationStart); observationStart = undefined }
  }

  // 初始化时加载播放历史和音质设置
  loadHistory()
  loadAudioQuality() // ✅ 加载音质设置
  loadPlaybackState()

  // 去掉 deep: true 避免对整个 playlist 递归遍历，用 rAF 防抖减少 localStorage 写入频率
  let rafId = 0
  const debouncedSave = () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(savePlaybackState)
  }
  watch([currentSong, playlist, playMode, volume, audioQuality], debouncedSave)

  return {
    recordAudioStarted,
    library,
    // 状态
    currentSong,
    isPlaying,
    currentTime,
    duration,
    playlist,
    playMode,
    lyricLoading,
    lyricError,
    lyrics,
    currentLyricIndex,
    volume,
    playHistory,
    audioQuality, // ✅ 音质状态
    lastPlaybackError,
    playerDrawerVisible,
    playerDrawerTab,

    // ✅ 歌单状态
    myPlaylists,
    currentPlaylist,

    // 计算属性
    currentIndex,
    hasNext,
    hasPrev,
    formatTime,

    // 方法
    playSong,
    loadLyric,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    togglePlay,
    playNext,
    playPrev,
    updateCurrentTime,
    setPlayMode,
    setVolume,
    seek,
    setAudioQuality, // ✅ 音质设置方法
    openPlayerDrawer,
    closePlayerDrawer,
    setPlayerDrawerTab,

    // ✅ 歌单管理方法
    loadMyPlaylists,
    loadPlaylistDetail,
    playPlaylist,

    // ✅ MV 播放状态和方法
    currentMvUrl,
    currentMvInfo,
    mvPlayerMinimized,
    showMvModal,
    playMv: (url: string, info: { name: string, artist: string, songId: string }, minimized = false, originalUrl?: string) => {
      currentMvUrl.value = url
      currentMvInfo.value = {
        ...info,
        originalUrl, // ✅ 保存原始 URL 用于降级
      }
      mvPlayerMinimized.value = minimized
      showMvModal.value = !minimized
    },
    toggleMvMinimize: () => {
      mvPlayerMinimized.value = !mvPlayerMinimized.value
      showMvModal.value = !mvPlayerMinimized.value
    },
    closeMv: () => {
      currentMvUrl.value = ''
      currentMvInfo.value = null
      mvPlayerMinimized.value = false
      showMvModal.value = false
    },
  }
})
