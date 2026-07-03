import type { MessageApi } from 'naive-ui'
import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'

export interface UseMusicSearchBoxOptions {
  clearSearchResultsIfNeeded: () => void
  clearStoredSearchHistory: () => boolean
  fetchHotSearch: () => Promise<void>
  loadMoreSearchResults: () => Promise<void>
  loadSearchHistory: () => void
  message: Pick<MessageApi, 'success' | 'warning'>
  saveSearchHistory: (keyword: string) => void
  searchFirstPage: () => Promise<void>
  searchKeyword: Ref<string>
}

export function useMusicSearchBox(options: UseMusicSearchBoxOptions) {
  const showHotSearch = ref(false)
  const searchInputFocused = ref(false)

  function clearSearchHistory() {
    const cleared = options.clearStoredSearchHistory()
    if (cleared)
      options.message.success('已清空搜索历史')
  }

  async function handleSearchFocus() {
    searchInputFocused.value = true
    if (!options.searchKeyword.value.trim()) {
      showHotSearch.value = true
      await options.fetchHotSearch()
    }
  }

  function handleSearchBlur() {
    searchInputFocused.value = false
    setTimeout(() => {
      if (!searchInputFocused.value)
        showHotSearch.value = false
    }, 200)
  }

  function handleSearchInput() {
    if (options.searchKeyword.value.trim()) {
      showHotSearch.value = false
      return
    }

    if (searchInputFocused.value)
      showHotSearch.value = true
    options.clearSearchResultsIfNeeded()
  }

  function handleHotSearchClick(keyword: string) {
    options.searchKeyword.value = keyword
    showHotSearch.value = false
    void handleSearch()
  }

  async function handleSearch() {
    const keyword = options.searchKeyword.value.trim()
    if (!keyword) {
      options.message.warning('请输入搜索关键词')
      return
    }

    showHotSearch.value = false
    options.saveSearchHistory(keyword)
    await options.searchFirstPage()
  }

  async function handleLoadMore() {
    await options.loadMoreSearchResults()
  }

  function handleKeyEnter(e: KeyboardEvent) {
    if (e.key === 'Enter')
      void handleSearch()
  }

  onMounted(() => {
    options.loadSearchHistory()
  })

  return {
    clearSearchHistory,
    handleHotSearchClick,
    handleKeyEnter,
    handleLoadMore,
    handleSearch,
    handleSearchBlur,
    handleSearchFocus,
    handleSearchInput,
    showHotSearch,
  }
}
