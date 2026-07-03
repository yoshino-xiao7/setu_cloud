import type { HotSearchItem, HotSearchResponse } from '@/api/music'
import { ref } from 'vue'
import { userMusicApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'

export function useMusicHotSearch() {
  const hotSearchList = ref<HotSearchItem[]>([])
  const loadingHotSearch = ref(false)

  async function fetchHotSearch() {
    if (hotSearchList.value.length > 0)
      return

    loadingHotSearch.value = true
    try {
      const res = await userMusicApi.getHotSearch()
      const data = unwrapApiData<HotSearchResponse | null>(res, null)
      hotSearchList.value = data?.result?.hots || []
    }
    catch {
      hotSearchList.value = []
    }
    finally {
      loadingHotSearch.value = false
    }
  }

  function formatHotCount(count: number) {
    if (count >= 10000)
      return `${(count / 10000).toFixed(1)}万`

    return count.toString()
  }

  return {
    fetchHotSearch,
    formatHotCount,
    hotSearchList,
    loadingHotSearch,
  }
}
