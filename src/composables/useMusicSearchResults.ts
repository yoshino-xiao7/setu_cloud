import type { MessageApi } from 'naive-ui'
import type { Song } from '@/api/music'
import { ref, shallowRef } from 'vue'
import { userMusicApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError } from '@/composables/useApiError'

interface RawNeteaseSong {
  id: number
  name?: string
  ar?: { id: number, name: string }[]
  al?: { id?: number, name?: string, picUrl?: string }
  dt?: number
  mv?: number
}

interface RawNeteaseSearchResult {
  result?: {
    songs?: RawNeteaseSong[]
    songCount?: number
  }
}

interface MusicSearchApiError {
  code?: string
  message?: string
  response?: { status?: number }
}

interface MusicSearchResultsOptions {
  message: Pick<MessageApi, 'info' | 'success'>
  onError: (error: unknown, title: string, messageOverride?: string) => void
  pageSize?: number
}

export function useMusicSearchResults(options: MusicSearchResultsOptions) {
  const pageSize = options.pageSize ?? 10
  const searchKeyword = ref('')
  const searching = ref(false)
  const searchResults = shallowRef<Song[]>([])
  const currentPage = ref(1)
  const hasMore = ref(true)
  const loadingMore = ref(false)
  const totalSearched = ref(0)

  function resetSearchResults() {
    currentPage.value = 1
    searchResults.value = []
    hasMore.value = true
    totalSearched.value = 0
  }

  function clearSearchResultsIfNeeded() {
    if (searchResults.value.length > 0)
      resetSearchResults()
  }

  async function searchFirstPage() {
    resetSearchResults()
    await performSearch(false)
  }

  async function loadMoreSearchResults() {
    if (loadingMore.value || !hasMore.value)
      return

    currentPage.value++
    await performSearch(true)
  }

  async function performSearch(append = false) {
    if (append)
      loadingMore.value = true
    else
      searching.value = true

    try {
      const offset = (currentPage.value - 1) * pageSize
      const res = await userMusicApi.search(searchKeyword.value.trim(), pageSize, offset)
      const data = unwrapApiData<RawNeteaseSearchResult | null>(res, null)
      const newSongs = (data?.result?.songs || []).map(mapNeteaseSongToSong)

      searchResults.value = append
        ? [...searchResults.value, ...newSongs]
        : newSongs
      totalSearched.value = data?.result?.songCount || 0
      hasMore.value = searchResults.value.length < totalSearched.value

      if (!append) {
        if (searchResults.value.length === 0)
          options.message.info('没有找到相关歌曲')
        else
          options.message.success(`找到 ${totalSearched.value} 首歌曲，显示前 ${searchResults.value.length} 首`)
      }
      else {
        options.message.success(`加载了 ${newSongs.length} 首歌曲`)
      }
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return

      handleSearchError(e)
    }
    finally {
      searching.value = false
      loadingMore.value = false
    }
  }

  function handleSearchError(error: unknown) {
    const err = error as MusicSearchApiError

    if (err.code === 'ECONNABORTED') {
      options.onError(error, '搜索失败', '请求超时，请稍后重试')
    }
    else if (err.message?.includes('Network Error')) {
      options.onError(error, '搜索失败', '网络连接失败，请检查网络')
    }
    else if (err.response?.status === 500) {
      options.onError(error, '搜索失败', '后端Token不可用或网易云服务异常')
    }
    else {
      options.onError(error, '搜索失败')
    }
  }

  return {
    clearSearchResultsIfNeeded,
    hasMore,
    loadMoreSearchResults,
    loadingMore,
    resetSearchResults,
    searchFirstPage,
    searchKeyword,
    searching,
    searchResults,
    totalSearched,
  }
}

function mapNeteaseSongToSong(song: RawNeteaseSong): Song {
  return {
    id: song.id,
    name: song.name || '',
    artists: (song.ar || []).map(artist => ({
      id: artist.id,
      name: artist.name,
    })),
    album: {
      id: song.al?.id || 0,
      name: song.al?.name || '',
      picUrl: song.al?.picUrl,
    },
    duration: song.dt || 0,
    picUrl: song.al?.picUrl,
    mv: song.mv || 0,
  }
}
