import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { LyricResponse, MusicUrlResponse, Song, LyricLine, UserPlaylist, PlaylistSong } from '@/api/music'
import { userMusicApi, userPlaylistApi, musicHistoryApi } from '@/api/music'
import { unwrapApiData, unwrapApiList } from '@/api/response'

export type PlayMode = 'sequence' | 'random' | 'loop' | 'single' // ✅ 添加 single 模式
export type AudioQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' // ✅ 音质类型

const PLAYER_STATE_KEY = 'music_player_state_v1'

interface PersistedPlayerState {
  currentSong: Song | null
  playlist: Song[]
  playMode: PlayMode
  volume: number
  audioQuality: AudioQuality
}

export const useMusicStore = defineStore('music', () => {
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
  const lyrics = ref<LyricLine[]>([])
  const currentLyricIndex = ref(0)

  // 音量
  const volume = ref(0.7)

  // ✅ 音质（默认标准音质，保存到 localStorage）
  const audioQuality = ref<AudioQuality>('standard')

  // 播放历史（存储在 localStorage）
  const playHistory = ref<Song[]>([])

  // ✅ 用户歌单状态
  const myPlaylists = ref<UserPlaylist[]>([])
  const currentPlaylist = ref<UserPlaylist | null>(null)

  // ✅ MV 播放状态
  const currentMvUrl = ref('')
  const currentMvInfo = ref<{ name: string; artist: string; songId: number; originalUrl?: string } | null>(null)
  const mvPlayerMinimized = ref(false)
  const showMvModal = ref(false)

  const sanitizeSong = (song: Song | null): Song | null => {
    if (!song) return null
    return {
      ...song,
      url: undefined,
      originalUrl: undefined
    }
  }

  const sanitizePlaylist = (songs: Song[]) => songs.map(song => sanitizeSong(song)).filter(Boolean) as Song[]

  const savePlaybackState = () => {
    try {
      const state: PersistedPlayerState = {
        currentSong: sanitizeSong(currentSong.value),
        playlist: sanitizePlaylist(playlist.value),
        playMode: playMode.value,
        volume: volume.value,
        audioQuality: audioQuality.value
      }
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('保存播放状态失败:', error)
    }
  }

  const loadPlaybackState = () => {
    try {
      const raw = localStorage.getItem(PLAYER_STATE_KEY)
      if (!raw) return

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
    } catch (error) {
      console.error('加载播放状态失败:', error)
      localStorage.removeItem(PLAYER_STATE_KEY)
    }
  }

  // =======================
  // 计算属性
  // =======================

  const currentIndex = computed(() => {
    if (!currentSong.value) return -1
    return playlist.value.findIndex(s => s.id === currentSong.value!.id)
  })

  const hasNext = computed(() => {
    // ✅ 列表不为空时，以下模式一定可以切换
    if (playlist.value.length === 0) return false

    // 单曲循环、列表循环、随机播放：总是可以切换
    if (playMode.value === 'single' || playMode.value === 'loop' || playMode.value === 'random') {
      return playlist.value.length > 1  // 至少需要2首歌才能切换
    }

    // 顺序播放：检查是否还有下一首
    return currentIndex.value < playlist.value.length - 1
  })

  const hasPrev = computed(() => {
    // ✅ 列表不为空时，以下模式一定可以切换
    if (playlist.value.length === 0) return false

    // 单曲循环、列表循环、随机播放：总是可以切换
    if (playMode.value === 'single' || playMode.value === 'loop' || playMode.value === 'random') {
      return playlist.value.length > 1  // 至少需要2首歌才能切换
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
  const playSong = async (song: Song, autoPlay = true) => {
    try {
      // ✅ 获取播放地址（使用当前音质设置）
      const res = await userMusicApi.getUrl(song.id, audioQuality.value)
      const data = unwrapApiData<MusicUrlResponse['data']>(res, [])

      if (!Array.isArray(data) || data.length === 0 || !data[0]?.url) {
        throw new Error('无法获取播放地址')
      }

      // ✅ 将 HTTP URL 转换为 HTTPS，避免混合内容导致浏览器显示不安全
      // 同时保存原始 URL 用于降级
      const originalUrl = data[0].url || ''
      const httpsUrl = originalUrl.replace(/^http:\/\//i, 'https://')

      currentSong.value = {
        ...song,
        url: httpsUrl,
        // ✅ 保存原始 HTTP URL 用于降级
        originalUrl: originalUrl !== httpsUrl ? originalUrl : undefined
      }

      // 加载歌词
      await loadLyric(song.id)

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
          duration: song.duration
        })
      } catch (e) {
        console.warn('记录播放历史失败:', e)
      }

      if (autoPlay) {
        isPlaying.value = true
      }

      return true
    } catch (error) {
      console.error('播放失败:', error)
      return false
    }
  }

  /** 加载歌词 */
  const loadLyric = async (songId: number) => {
    try {
      const res = await userMusicApi.getLyric(songId)
      const lyricData = unwrapApiData<LyricResponse | null>(res, null)
      const lyricText = lyricData?.lrc?.lyric || ''

      if (!lyricText) {
        lyrics.value = []
        return
      }

      // 解析歌词 [00:23.26]歌词内容
      const lines = lyricText.split('\n')
      const parsed: LyricLine[] = []

      for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
        if (match) {
          const [, minuteText, secondText, millisecondText, lyricLine = ''] = match
          if (!minuteText || !secondText || !millisecondText) continue
          const minutes = parseInt(minuteText)
          const seconds = parseInt(secondText)
          const milliseconds = parseInt(millisecondText.padEnd(3, '0'))
          const time = minutes * 60 + seconds + milliseconds / 1000
          const text = lyricLine.trim()

          if (text) {
            parsed.push({ time, text })
          }
        }
      }

      lyrics.value = parsed.sort((a, b) => a.time - b.time)
      currentLyricIndex.value = 0
    } catch (error) {
      console.error('加载歌词失败:', error)
      lyrics.value = []
    }
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
  const removeFromPlaylist = (songId: number) => {
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
  const playNext = async (manual = false) => {  // ✅ 添加 manual 参数区分手动/自动
    if (playlist.value.length === 0) return

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
        } else {
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
      await playSong(nextSong)
    }
  }

  /** 上一曲 */
  const playPrev = async () => {
    if (playlist.value.length === 0) return

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
      await playSong(prevSong)
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

  // =======================
  // ✅ 音质管理
  // =======================

  /** 设置音质 */
  const setAudioQuality = async (quality: AudioQuality) => {
    const oldQuality = audioQuality.value
    audioQuality.value = quality

    // 保存到 localStorage
    try {
      localStorage.setItem('audio_quality', quality)
    } catch (e) {
      console.error('保存音质设置失败:', e)
    }

    // 如果正在播放，重新加载当前歌曲以应用新音质
    if (currentSong.value && isPlaying.value) {
      const currentSongCopy = currentSong.value
      const wasPlaying = isPlaying.value

      try {
        // 重新获取播放地址
        const res = await userMusicApi.getUrl(currentSongCopy.id, quality)
        const data = unwrapApiData<MusicUrlResponse['data']>(res, [])

        if (Array.isArray(data) && data.length > 0 && data[0]?.url) {
          // ✅ 将 HTTP URL 转换为 HTTPS，保存原始 URL 用于降级
          const originalUrl = data[0].url || ''
          const newUrl = originalUrl.replace(/^http:\/\//i, 'https://')

          currentSong.value = {
            ...currentSongCopy,
            url: newUrl,
            originalUrl: originalUrl !== newUrl ? originalUrl : undefined
          }

          // 恢复播放状态和进度
          if (wasPlaying) {
            isPlaying.value = true
          }
          // 进度会在 audio 组件中恢复
        } else {
          throw new Error('新音质不可用')
        }
      } catch (error) {
        console.error('切换音质失败:', error)
        // 恢复原音质
        audioQuality.value = oldQuality
        localStorage.setItem('audio_quality', oldQuality)
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
    } catch (e) {
      console.error('加载音质设置失败:', e)
    }
  }

  /** 添加到播放历史 */
  const addToHistory = (song: Song) => {
    // 去重
    playHistory.value = playHistory.value.filter(s => s.id !== song.id)
    // 添加到最前面
    playHistory.value.unshift(song)
    // 最多保留 100 条
    if (playHistory.value.length > 100) {
      playHistory.value = playHistory.value.slice(0, 100)
    }
    // 保存到 localStorage
    try {
      localStorage.setItem('music_history', JSON.stringify(playHistory.value))
    } catch (e) {
      console.error('保存播放历史失败:', e)
    }
  }

  /** 从 localStorage 加载播放历史 */
  const loadHistory = () => {
    try {
      const data = localStorage.getItem('music_history')
      if (data) {
        playHistory.value = JSON.parse(data)
      }
    } catch (e) {
      console.error('加载播放历史失败:', e)
    }
  }

  // =======================
  // ✅ 歌单管理方法
  // =======================

  /** 加载我的歌单 */
  const loadMyPlaylists = async () => {
    try {
      const res = await userPlaylistApi.getMyPlaylists()
      myPlaylists.value = unwrapApiList<UserPlaylist>(res)
    } catch (error) {
      console.error('加载歌单失败:', error)
      myPlaylists.value = []
    }
  }

  /** 加载歌单详情 */
  const loadPlaylistDetail = async (id: number) => {
    try {
      const res = await userPlaylistApi.getPlaylistById(id)
      currentPlaylist.value = unwrapApiData<UserPlaylist | null>(res, null)
      return currentPlaylist.value
    } catch (error) {
      console.error('加载歌单详情失败:', error)
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
    } catch (e) {
      console.warn('记录播放失败:', e)
    }

    // 将歌单歌曲转换为 Song 格式
    let songs: Song[] = playlistData.songs.map((ps: PlaylistSong) => ({
      id: ps.songId,
      name: ps.songName,
      artists: ps.artistName.split('/').map((name, index) => ({
        id: index,
        name: name.trim()
      })),
      album: {
        id: 0,
        name: ps.albumName || '未知专辑',
        picUrl: ps.coverUrl
      },
      duration: ps.duration,
      picUrl: ps.coverUrl
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
        await playSong(firstSong)
        return true
      }
    }

    return false
  }

  /** 打乱数组 */
  const shuffleArray = <T>(array: T[]): T[] => {
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

  // 初始化时加载播放历史和音质设置
  loadHistory()
  loadAudioQuality()  // ✅ 加载音质设置
  loadPlaybackState()

  watch([currentSong, playlist, playMode, volume, audioQuality], savePlaybackState, { deep: true })

  return {
    // 状态
    currentSong,
    isPlaying,
    currentTime,
    duration,
    playlist,
    playMode,
    lyrics,
    currentLyricIndex,
    volume,
    playHistory,
    audioQuality,  // ✅ 音质状态

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
    setAudioQuality,  // ✅ 音质设置方法

    // ✅ 歌单管理方法
    loadMyPlaylists,
    loadPlaylistDetail,
    playPlaylist,

    // ✅ MV 播放状态和方法
    currentMvUrl,
    currentMvInfo,
    mvPlayerMinimized,
    showMvModal,
    playMv: (url: string, info: { name: string; artist: string; songId: number }, minimized = false, originalUrl?: string) => {
      currentMvUrl.value = url
      currentMvInfo.value = {
        ...info,
        originalUrl  // ✅ 保存原始 URL 用于降级
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
