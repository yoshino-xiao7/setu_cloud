import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song, LyricLine } from '@/api/music'
import { userMusicApi } from '@/api/music'

export type PlayMode = 'sequence' | 'random' | 'loop'

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
  
  // 播放历史（存储在 localStorage）
  const playHistory = ref<Song[]>([])
  
  // =======================
  // 计算属性
  // =======================
  
  const currentIndex = computed(() => {
    if (!currentSong.value) return -1
    return playlist.value.findIndex(s => s.id === currentSong.value!.id)
  })
  
  const hasNext = computed(() => {
    return playlist.value.length > 0 && currentIndex.value < playlist.value.length - 1
  })
  
  const hasPrev = computed(() => {
    return playlist.value.length > 0 && currentIndex.value > 0
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
      // 获取播放地址
      const res = await userMusicApi.getUrl(song.id)
      const unwrap = (r: any) => {
        if (r && r.data && r.data.data !== undefined) return r.data.data
        if (r && r.data !== undefined) return r.data
        return r
      }
      const data = unwrap(res) || []
      
      if (!Array.isArray(data) || data.length === 0 || !data[0]?.url) {
        throw new Error('无法获取播放地址')
      }
      
      currentSong.value = {
        ...song,
        url: data[0].url
      }
      
      // 加载歌词
      await loadLyric(song.id)
      
      // 添加到播放历史
      addToHistory(song)
      
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
      const unwrap = (r: any) => {
        if (r && r.data && r.data.data !== undefined) return r.data.data
        if (r && r.data !== undefined) return r.data
        return r
      }
      const lyricData = unwrap(res)
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
          const minutes = parseInt(match[1])
          const seconds = parseInt(match[2])
          const milliseconds = parseInt(match[3].padEnd(3, '0'))
          const time = minutes * 60 + seconds + milliseconds / 1000
          const text = match[4].trim()
          
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
  const playNext = async () => {
    if (playlist.value.length === 0) return
    
    let nextIndex = currentIndex.value + 1
    
    // 根据播放模式计算下一曲
    switch (playMode.value) {
      case 'random':
        nextIndex = Math.floor(Math.random() * playlist.value.length)
        break
      case 'loop':
        nextIndex = currentIndex.value // 单曲循环
        break
      case 'sequence':
      default:
        if (nextIndex >= playlist.value.length) {
          nextIndex = 0 // 循环到第一首
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
    
    if (prevIndex < 0) {
      prevIndex = playlist.value.length - 1
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
  
  // 初始化时加载播放历史
  loadHistory()
  
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
  }
})
