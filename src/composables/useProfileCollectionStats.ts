import type { CollectionInfoDTO } from '@/api/collections'
import { reactive } from 'vue'
import { listMyCollections } from '@/api/collections'
import { unwrapApiList } from '@/api/response'

interface ProfileCollectionStatsOptions {
  canLoad: () => boolean
}

export function useProfileCollectionStats(options: ProfileCollectionStatsOptions) {
  const collectionStats = reactive({
    total: 0,
    items: [] as { id: number, name: string, isDefault: boolean, visibility: number }[],
    loading: false,
  })

  async function fetchCollectionStats() {
    if (!options.canLoad())
      return

    collectionStats.loading = true
    try {
      const res = await listMyCollections()
      const arr = unwrapApiList<CollectionInfoDTO>(res)
      collectionStats.total = arr.length
      collectionStats.items = arr.map(collection => ({
        id: collection.id,
        name: collection.name,
        isDefault: !!collection.isDefault,
        visibility: Number(collection.visibility ?? 0),
      }))
    }
    catch {
    }
    finally {
      collectionStats.loading = false
    }
  }

  return {
    collectionStats,
    fetchCollectionStats,
  }
}
