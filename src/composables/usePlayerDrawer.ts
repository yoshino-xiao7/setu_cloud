import type { AudioQuality, PlayerDrawerTab, PlayMode } from '@/stores/music'
import { useMessage } from 'naive-ui'
import { computed } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'

const QUALITY_OPTIONS = [
  { value: 'standard', label: '标准 · 128kbps' },
  { value: 'higher', label: '较高 · 192kbps' },
  { value: 'exhigh', label: '极高 · 320kbps' },
  { value: 'lossless', label: '无损 · FLAC' },
  { value: 'hires', label: 'Hi-Res' },
]

const PLAY_MODE_OPTIONS = [
  { value: 'sequence', label: '顺序播放' },
  { value: 'loop', label: '列表循环' },
  { value: 'single', label: '单曲循环' },
  { value: 'random', label: '随机播放' },
]

export function usePlayerDrawer() {
  const message = useMessage()
  const musicStore = useMusicStore()
  const { isMobile } = useBreakpoint()

  const artistText = computed(() =>
    musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
  )

  const currentDuration = computed(() => {
    const fallbackDuration = Math.round((musicStore.currentSong?.duration || 0) / 1000)
    return musicStore.duration || fallbackDuration || 1
  })

  const drawerHeight = computed(() => isMobile.value ? '72dvh' : '76vh')

  const playbackProgress = computed(() => {
    if (!currentDuration.value)
      return 0
    return Math.min(100, Math.round((musicStore.currentTime / currentDuration.value) * 100))
  })

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
    if (!musicStore.currentSong)
      return
    musicStore.seek(value)
  }

  function handleVolumeChange(value: number) {
    musicStore.setVolume(value / 100)
  }

  async function handleQualityChange(value: string) {
    const quality = value as AudioQuality
    const success = await musicStore.setAudioQuality(quality)
    if (!success)
      message.error(musicStore.lastPlaybackError || '切换音质失败')
  }

  function handlePlayModeChange(value: string) {
    musicStore.setPlayMode(value as PlayMode)
  }

  function handleTabChange(value: string | number) {
    musicStore.setPlayerDrawerTab(String(value) as PlayerDrawerTab)
  }

  function handleDrawerUpdate(show: boolean) {
    if (!show)
      musicStore.closePlayerDrawer()
  }

  return {
    musicStore,
    artistText,
    currentDuration,
    drawerHeight,
    playbackProgress,
    qualityOptions: QUALITY_OPTIONS,
    playModeOptions: PLAY_MODE_OPTIONS,
    handleTogglePlay,
    handleSeek,
    handleVolumeChange,
    handleQualityChange,
    handlePlayModeChange,
    handleTabChange,
    handleDrawerUpdate,
  }
}
