import type { Song } from '@/api/music'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { showApiError } from '@/composables/useApiError'
import { useMusicDownload } from '@/composables/useMusicDownload'
import { useMusicHotSearch } from '@/composables/useMusicHotSearch'
import { useMusicMvPlayback } from '@/composables/useMusicMvPlayback'
import { useMusicPlaylists } from '@/composables/useMusicPlaylists'
import { useMusicSearchBox } from '@/composables/useMusicSearchBox'
import { useMusicSearchHistory } from '@/composables/useMusicSearchHistory'
import { useMusicSearchResults } from '@/composables/useMusicSearchResults'
import { useMusicStore } from '@/stores/music'
import { safePush } from '@/utils/navigation'

export function useMusicPlayerPage() {
  const message = useMessage()
  const router = useRouter()
  const musicStore = useMusicStore()

  const downloadState = useMusicDownload({ message })
  const searchResultsState = useMusicSearchResults({
    message,
    onError: (error, title, messageOverride) => {
      showApiError(message, error, title, messageOverride ? { messageOverride } : {})
    },
  })
  const hotSearchState = useMusicHotSearch()
  const searchHistoryState = useMusicSearchHistory()
  const mvState = useMusicMvPlayback({ message, musicStore })
  const playlistState = useMusicPlaylists({ message })
  const searchBoxState = useMusicSearchBox({
    clearSearchResultsIfNeeded: searchResultsState.clearSearchResultsIfNeeded,
    clearStoredSearchHistory: searchHistoryState.clearSearchHistory,
    fetchHotSearch: hotSearchState.fetchHotSearch,
    loadMoreSearchResults: searchResultsState.loadMoreSearchResults,
    loadSearchHistory: searchHistoryState.loadSearchHistory,
    message,
    saveSearchHistory: searchHistoryState.saveSearchHistory,
    searchFirstPage: searchResultsState.searchFirstPage,
    searchKeyword: searchResultsState.searchKeyword,
  })

  function goTo(path: string) {
    void safePush(router, path)
  }

  async function handlePlay(song: Song) {
    const success = await musicStore.playSong(song)
    if (success) {
      musicStore.addToPlaylist(song)
      message.success('开始播放')
      return
    }
    message.error(musicStore.lastPlaybackError || '播放失败，可能暂无可用Token或音乐资源不可用')
  }

  function handleAddToPlayingList(song: Song) {
    musicStore.addToPlaylist(song)
    message.success(`已添加 "${song.name}" 到播放列表`)
  }

  return {
    ...downloadState,
    ...searchResultsState,
    ...hotSearchState,
    ...searchHistoryState,
    ...mvState,
    ...playlistState,
    ...searchBoxState,
    goTo,
    handleAddToPlayingList,
    handlePlay,
    musicStore,
  }
}
