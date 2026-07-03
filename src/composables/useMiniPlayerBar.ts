import type { AudioQuality, PlayMode } from '@/stores/music'
import { useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'

const COLLAPSED_STORAGE_KEY = 'mini_player_collapsed_v1'

function readCollapsedPreference() {
  if (typeof window === 'undefined')
    return false
  return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
}

export function useMiniPlayerBar() {
  const message = useMessage()
  const musicStore = useMusicStore()
  const { isCompact } = useBreakpoint()

  const audioRef = ref<HTMLAudioElement>()
  let pendingCanPlayListener: (() => void) | null = null
  const showVolume = ref(false)
  const isCollapsed = ref(readCollapsedPreference())
  let syncingFromAudio = false

  const artistText = computed(() =>
    musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
  )

  const qualityOptions = [
    { value: 'standard', label: '标准' },
    { value: 'higher', label: '较高' },
    { value: 'exhigh', label: '极高' },
    { value: 'lossless', label: '无损' },
    { value: 'hires', label: 'Hi-Res' },
  ]

  const playModeOptions = [
    { value: 'sequence', label: '顺序' },
    { value: 'loop', label: '循环' },
    { value: 'single', label: '单曲' },
    { value: 'random', label: '随机' },
  ]

  async function handleTogglePlay() {
    if (!musicStore.currentSong) {
      message.warning('请先选择要播放的歌曲')
      return
    }
    if (!musicStore.currentSong.url) {
      const success = await musicStore.playSong(musicStore.currentSong)
      if (!success)
        message.error(musicStore.lastPlaybackError || '播放失败，请尝试其他歌曲')
      return
    }
    musicStore.togglePlay()
  }

  function handleSeek(value: number) {
    if (!audioRef.value)
      return
    audioRef.value.currentTime = value
    musicStore.updateCurrentTime(value)
  }

  function handleVolumeChange(value: number) {
    musicStore.setVolume(value / 100)
  }

  async function handleQualityChange(value: string) {
    const success = await musicStore.setAudioQuality(value as AudioQuality)
    if (!success)
      message.error(musicStore.lastPlaybackError || '切换音质失败')
  }

  function handlePlayModeChange(value: string) {
    musicStore.setPlayMode(value as PlayMode)
  }

  function openDrawer(tab: 'now' | 'lyrics' | 'queue' = 'now') {
    musicStore.openPlayerDrawer(tab)
  }

  function setCollapsed(collapsed: boolean, persist = true) {
    isCollapsed.value = collapsed
    if (!persist || typeof window === 'undefined')
      return
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
  }

  function handleTimeUpdate() {
    if (!audioRef.value)
      return
    syncingFromAudio = true
    musicStore.updateCurrentTime(audioRef.value.currentTime)
    window.requestAnimationFrame(() => {
      syncingFromAudio = false
    })
  }

  function handleLoadedMetadata() {
    if (audioRef.value)
      musicStore.duration = audioRef.value.duration || 0
  }

  function handleEnded() {
    void musicStore.playNext()
  }

  function handleAudioError(event: Event) {
    const audio = event.target as HTMLAudioElement
    const currentSong = musicStore.currentSong

    if (currentSong?.originalUrl && currentSong.url !== currentSong.originalUrl) {
      audio.src = currentSong.originalUrl
      audio.load()
      musicStore.currentSong = {
        ...currentSong,
        url: currentSong.originalUrl,
        originalUrl: undefined,
      }

      if (musicStore.isPlaying) {
        audio.play().catch(() => {
          musicStore.isPlaying = false
          message.error('播放失败，请尝试其他歌曲')
        })
      }
      return
    }

    musicStore.isPlaying = false
    message.error('播放失败，请尝试其他歌曲')
  }

  function updateMediaSessionMetadata() {
    if (
      typeof navigator === 'undefined'
      || !('mediaSession' in navigator)
      || typeof MediaMetadata === 'undefined'
    ) {
      return
    }

    const song = musicStore.currentSong
    if (!song) {
      navigator.mediaSession.metadata = null
      return
    }

    const artwork = song.album?.picUrl
      ? [{ src: song.album.picUrl, sizes: '512x512', type: 'image/jpeg' }]
      : []

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name,
      artist: song.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
      album: song.album?.name || '',
      artwork,
    })
  }

  function updateMediaSessionPlaybackState() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return

    navigator.mediaSession.playbackState = musicStore.isPlaying ? 'playing' : 'paused'

    try {
      navigator.mediaSession.setPositionState?.({
        duration: musicStore.duration || Math.max(1, Math.round((musicStore.currentSong?.duration || 0) / 1000)),
        playbackRate: 1,
        position: Math.max(0, musicStore.currentTime),
      })
    }
    catch {}
  }

  function setupMediaSessionActions() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return

    const actions: MediaSessionAction[] = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      }
      catch {}
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        void handleTogglePlay()
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        if (musicStore.isPlaying)
          musicStore.togglePlay()
      })
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        void musicStore.playPrev()
      })
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        void musicStore.playNext(true)
      })
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number')
          handleSeek(details.seekTime)
      })
    }
    catch {}
  }

  watch(() => musicStore.isPlaying, (playing) => {
    if (!audioRef.value)
      return

    if (playing) {
      audioRef.value.play().catch(() => {
        musicStore.isPlaying = false
      })
    }
    else {
      audioRef.value.pause()
    }
    updateMediaSessionPlaybackState()
  })

  watch(() => musicStore.currentSong, (song, oldSong) => {
    updateMediaSessionMetadata()
    updateMediaSessionPlaybackState()

    if (!song?.url || !audioRef.value)
      return

    const isSameSong = oldSong && song.id === oldSong.id && song.url !== oldSong.url
    const savedTime = isSameSong ? audioRef.value.currentTime : 0

    audioRef.value.src = song.url
    audioRef.value.load()

    if (musicStore.isPlaying) {
      if (pendingCanPlayListener) {
        audioRef.value.removeEventListener('canplay', pendingCanPlayListener)
      }
      const playWhenReady = () => {
        if (!audioRef.value)
          return
        if (isSameSong && savedTime > 0)
          audioRef.value.currentTime = savedTime
        audioRef.value.play().catch(() => {
          musicStore.isPlaying = false
        })
        audioRef.value.removeEventListener('canplay', playWhenReady)
        pendingCanPlayListener = null
      }
      pendingCanPlayListener = playWhenReady
      audioRef.value.addEventListener('canplay', playWhenReady)
    }
  })

  watch(() => musicStore.currentTime, (time) => {
    if (!audioRef.value || syncingFromAudio)
      return
    if (Math.abs(audioRef.value.currentTime - time) > 0.75) {
      audioRef.value.currentTime = time
    }
    updateMediaSessionPlaybackState()
  })

  watch(() => musicStore.duration, () => {
    updateMediaSessionPlaybackState()
  })

  watch(() => musicStore.volume, (volume) => {
    if (audioRef.value)
      audioRef.value.volume = volume
  })

  watch(isCompact, (compact) => {
    if (compact && isCollapsed.value)
      setCollapsed(false, false)
  }, { immediate: true })

  onMounted(() => {
    if (audioRef.value)
      audioRef.value.volume = musicStore.volume
    setupMediaSessionActions()
    updateMediaSessionMetadata()
    updateMediaSessionPlaybackState()
  })

  onUnmounted(() => {
    if (audioRef.value && pendingCanPlayListener) {
      audioRef.value.removeEventListener('canplay', pendingCanPlayListener)
      pendingCanPlayListener = null
    }
    audioRef.value?.pause()
  })

  return {
    musicStore,
    isCompact,
    audioRef,
    showVolume,
    isCollapsed,
    artistText,
    qualityOptions,
    playModeOptions,
    handleTogglePlay,
    handleSeek,
    handleVolumeChange,
    handleQualityChange,
    handlePlayModeChange,
    openDrawer,
    setCollapsed,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleAudioError,
  }
}
