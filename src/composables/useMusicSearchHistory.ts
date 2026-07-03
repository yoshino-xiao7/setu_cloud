import { ref } from 'vue'

const DEFAULT_STORAGE_KEY = 'music_search_history'
const DEFAULT_MAX_HISTORY = 10

interface MusicSearchHistoryOptions {
  maxHistory?: number
  storageKey?: string
}

export function useMusicSearchHistory(options: MusicSearchHistoryOptions = {}) {
  const searchHistory = ref<string[]>([])
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
  const maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY

  function loadSearchHistory() {
    try {
      const history = localStorage.getItem(storageKey)
      const parsedHistory = history ? JSON.parse(history) : []
      searchHistory.value = Array.isArray(parsedHistory) ? parsedHistory : []
    }
    catch {
      searchHistory.value = []
    }
  }

  function persistSearchHistory() {
    localStorage.setItem(storageKey, JSON.stringify(searchHistory.value))
  }

  function saveSearchHistory(keyword: string) {
    try {
      const normalizedKeyword = keyword.trim()
      if (!normalizedKeyword)
        return

      const nextHistory = [
        normalizedKeyword,
        ...searchHistory.value.filter(item => item !== normalizedKeyword),
      ]
      searchHistory.value = nextHistory.slice(0, maxHistory)
      persistSearchHistory()
    }
    catch {}
  }

  function clearSearchHistory() {
    searchHistory.value = []
    try {
      localStorage.removeItem(storageKey)
      return true
    }
    catch {
      return false
    }
  }

  function removeHistoryItem(keyword: string) {
    searchHistory.value = searchHistory.value.filter(item => item !== keyword)
    try {
      persistSearchHistory()
    }
    catch {}
  }

  return {
    clearSearchHistory,
    loadSearchHistory,
    removeHistoryItem,
    saveSearchHistory,
    searchHistory,
  }
}
