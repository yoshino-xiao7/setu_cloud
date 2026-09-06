import type { MessageApi } from 'naive-ui'
import type { Song } from '@/api/music'
import { ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { useAuthStore } from '@/stores/auth'
import { musicFlags } from '@/api/musicFlags'
import { musicV2Api } from '@/api/musicV2'
import { trackToSong } from '@/api/musicV2Models'
import { userMusicApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError } from '@/composables/useApiError'

interface RawNeteaseSong {
  id: string
  name?: string
  ar?: { id: string, name: string }[]
  al?: { id?: string, name?: string, picUrl?: string }
  dt?: number
  mv?: string
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
  const route = useRoute()
  const guard = useRequestGuard()
  const auth = useAuthStore()
  let nextOffset = 0
  watch(() => auth.user?.id, () => { guard.invalidate(); resetSearchResults() })
  const pageSize = options.pageSize ?? 10
  const searchKeyword = ref('')
  const searchError = ref('')
  const searching = ref(false)
  const searchResults = shallowRef<Song[]>([])
  const currentPage = ref(1)
  const hasMore = ref(true)
  const loadingMore = ref(false)
  const totalSearched = ref(0)

  function resetSearchResults() {
    guard.invalidate()
    nextOffset = 0
    currentPage.value = 1
    searchResults.value = []
    hasMore.value = true
    totalSearched.value = 0
    searchError.value = ''
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

    await performSearch(true)
  }

  async function performSearch(append = false) {
    const token = guard.next()
    searchError.value = ''
    if (append)
      loadingMore.value = true
    else
      searching.value = true

    try {
      const offset = append ? nextOffset : 0
      let newSongs: Song[]
      let total: number | null
      let more: boolean
      let next: number | null
      if (musicFlags.usesV2Search) {
        const page = await musicV2Api.search(searchKeyword.value.trim(), offset, pageSize)
        newSongs = page.items.map(trackToSong)
        total = page.total
        more = page.hasMore
        next = page.nextOffset
      }
      else {
        const res = await userMusicApi.search(searchKeyword.value.trim(), pageSize, offset)
        const data = unwrapApiData<RawNeteaseSearchResult | null>(res, null)
        newSongs = (data?.result?.songs || []).map(mapNeteaseSongToSong)
        total = data?.result?.songCount ?? 0
        more = offset + newSongs.length < total
        next = more ? offset + newSongs.length : null
      }
      if (!guard.isCurrent(token)) return
      if (more && (next === null || next <= offset)) throw new Error('搜索分页位置无效')
      searchResults.value = append ? [...searchResults.value, ...newSongs] : newSongs
      totalSearched.value = total ?? searchResults.value.length
      hasMore.value = more
      nextOffset = next ?? 0

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
      if (!guard.isCurrent(token) || shouldIgnoreApiError(e))
        return

      searchError.value = e instanceof Error ? e.message : '搜索失败'
      handleSearchError(e)
    }
    finally {
      if (guard.isCurrent(token)) { searching.value = false; loadingMore.value = false }
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

  watch(() => route.query.q, (query) => { if (typeof query === 'string' && query.trim()) { searchKeyword.value = query; void searchFirstPage() } }, { immediate: true })

  return {
    clearSearchResultsIfNeeded,
    hasMore,
    loadMoreSearchResults,
    loadingMore,
    resetSearchResults,
    searchFirstPage,
    searchKeyword,
    searchError,
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
      id: song.al?.id || '',
      name: song.al?.name || '',
      picUrl: song.al?.picUrl,
    },
    duration: song.dt || 0,
    picUrl: song.al?.picUrl,
    mv: song.mv || undefined,
  }
}
