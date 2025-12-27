import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song, LyricLine, UserPlaylist, PlaylistSong } from '@/api/music'
import { userMusicApi, userPlaylistApi, musicHistoryApi } from '@/api/music'

export type PlayMode = 'sequence' | 'random' | 'loop' | 'single' // ✅ 添加 single 模式

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
  
  // ✅ 用户歌单状态
  const myPlaylists = ref<UserPlaylist[]>([])
  const currentPlaylist = ref<UserPlaylist | null>(null)
  
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
      case 'single':
        // 单曲循环：重复播放当前歌曲
        nextIndex = currentIndex.value
        break
      case 'random':
        // 随机播放：随机选择一首歌
        nextIndex = Math.floor(Math.random() * playlist.value.length)
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
  
  // =======================
  // ✅ 歌单管理方法
  // =======================
  
  /** 加载我的歌单 */
  const loadMyPlaylists = async () => {
    try {
      const res = await userPlaylistApi.getMyPlaylists()
      const unwrap = (r: any) => {
        if (r && r.data && r.data.data !== undefined) return r.data.data
        if (r && r.data !== undefined) return r.data
        return r
      }
      myPlaylists.value = unwrap(res) || []
    } catch (error) {
      console.error('加载歌单失败:', error)
      myPlaylists.value = []
    }
  }
  
  /** 加载歌单详情 */
  const loadPlaylistDetail = async (id: number) => {
    try {
      const res = await userPlaylistApi.getPlaylistById(id)
      const unwrap = (r: any) => {
        if (r && r.data && r.data.data !== undefined) return r.data.data
        if (r && r.data !== undefined) return r.data
        return r
      }
      currentPlaylist.value = unwrap(res)
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
    switch(playlistData.playMode) {
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
    
    // ✅ 歌单管理方法
    loadMyPlaylists,
    loadPlaylistDetail,
    playPlaylist,
  }
})
