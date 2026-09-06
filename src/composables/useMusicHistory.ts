import type { MessageApi } from 'naive-ui'
import type { MusicHistoryRecord, Song } from '@/api/music'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRequestGuard } from './useRequestGuard'
import { musicHistoryApi } from '@/api/music'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface MusicStoreLike {
  addToPlaylist: (song: Song) => void
  lastPlaybackError?: string
  playSong: (song: Song) => Promise<boolean>
}

export interface UseMusicHistoryOptions {
  message: MessageApi
  musicStore: MusicStoreLike
}

export function mapMusicHistoryRecordToSong(record: MusicHistoryRecord): Song {
  return {
    id: record.songId,
    name: record.songName,
    artists: record.artistName.split('/').map((name, index) => ({
      id: String(index),
      name: name.trim(),
    })),
    album: {
      id: '',
      name: record.albumName || '未知专辑',
      picUrl: record.coverUrl,
    },
    duration: record.duration,
    picUrl: record.coverUrl,
  }
}

export function useMusicHistory(options: UseMusicHistoryOptions) {
  const loading = ref(false)
  const writing = ref(false)
  const errorMessage = ref('')
  const auth = useAuthStore()
  const guard = useRequestGuard()
  const historyRecords = ref<MusicHistoryRecord[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

  async function loadHistory() {
    if (writing.value || !auth.user) return
    const ticket = guard.next()
    loading.value = true
    errorMessage.value = ''
    try {
      const offset = (currentPage.value - 1) * pageSize.value
      const page = await musicHistoryApi.getPage(pageSize.value, offset)
      if (!guard.isCurrent(ticket)) return
      historyRecords.value = page.records
      totalCount.value = page.total
    }
    catch {
      if (guard.isCurrent(ticket)) errorMessage.value = '历史加载失败，请重试'
    }
    finally {
      if (guard.isCurrent(ticket)) loading.value = false
    }
  }

  function handlePageChange(page: number) {
    currentPage.value = page
    void loadHistory()
  }

  async function handlePlay(record: MusicHistoryRecord) {
    const song = mapMusicHistoryRecordToSong(record)
    const success = await options.musicStore.playSong(song)
    if (success) {
      options.musicStore.addToPlaylist(song)
      options.message.success('开始播放')
    }
    else {
      options.message.error(options.musicStore.lastPlaybackError || '播放失败')
    }
  }

  function handleAddToPlaylist(record: MusicHistoryRecord) {
    const song = mapMusicHistoryRecordToSong(record)
    options.musicStore.addToPlaylist(song)
    options.message.success(`已添加 "${song.name}" 到播放列表`)
  }

  async function handleClearHistory() {
    if (writing.value) return
    const ticket = guard.next(), before = historyRecords.value, count = totalCount.value, page = currentPage.value
    writing.value = true; loading.value = false
    historyRecords.value = []; totalCount.value = 0; currentPage.value = 1
    try {
      await musicHistoryApi.clearHistory()
      if (guard.isCurrent(ticket)) options.message.success('已清空播放历史')
    }
    catch (error) {
      if (!guard.isCurrent(ticket)) return
      historyRecords.value = before; totalCount.value = count; currentPage.value = page
      if (!shouldIgnoreApiError(error)) showApiError(options.message, error, '清空失败')
    }
    finally {
      if (guard.isCurrent(ticket)) { writing.value = false; void loadHistory() }
    }
  }
  watch(() => auth.user?.id, () => {
    guard.invalidate(); writing.value = false; loading.value = false
    historyRecords.value = []; totalCount.value = 0; currentPage.value = 1; errorMessage.value = ''
    void loadHistory()
  }, { immediate: true, flush: 'sync' })

  return {
    currentPage, handleAddToPlaylist, handleClearHistory, handlePageChange, handlePlay,
    historyRecords, loading, writing, errorMessage, loadHistory, pageSize, totalCount, totalPages,
  }
}
