import type { MessageApi } from 'naive-ui'
import type { MusicHistoryRecord, Song } from '@/api/music'
import { computed, onMounted, ref } from 'vue'
import { musicHistoryApi } from '@/api/music'
import { unwrapApiData, unwrapApiList } from '@/api/response'
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
      id: index,
      name: name.trim(),
    })),
    album: {
      id: 0,
      name: record.albumName || '未知专辑',
      picUrl: record.coverUrl,
    },
    duration: record.duration,
    picUrl: record.coverUrl,
  }
}

export function useMusicHistory(options: UseMusicHistoryOptions) {
  const loading = ref(false)
  const historyRecords = ref<MusicHistoryRecord[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

  async function loadHistory() {
    loading.value = true
    try {
      const offset = (currentPage.value - 1) * pageSize.value
      const [historyRes, countRes] = await Promise.all([
        musicHistoryApi.getHistory(pageSize.value, offset),
        musicHistoryApi.getCount(),
      ])

      historyRecords.value = unwrapApiList<MusicHistoryRecord>(historyRes)
      totalCount.value = unwrapApiData<number>(countRes, 0)
    }
    catch {
      options.message.error('加载失败')
      historyRecords.value = []
      totalCount.value = 0
    }
    finally {
      loading.value = false
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
    try {
      await musicHistoryApi.clearHistory()
      options.message.success('已清空播放历史')
      historyRecords.value = []
      totalCount.value = 0
      currentPage.value = 1
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '清空失败')
    }
  }

  onMounted(() => {
    void loadHistory()
  })

  return {
    currentPage,
    handleAddToPlaylist,
    handleClearHistory,
    handlePageChange,
    handlePlay,
    historyRecords,
    loading,
    pageSize,
    totalCount,
    totalPages,
  }
}
