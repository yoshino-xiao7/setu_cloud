import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useFavoritesCollectionEditor } from '@/composables/useFavoritesCollectionEditor'
import { useFavoritesCollections } from '@/composables/useFavoritesCollections'
import { useFavoritesCover } from '@/composables/useFavoritesCover'
import { useFavoritesMoveItem } from '@/composables/useFavoritesMoveItem'
import { useFavoritesPageEffects } from '@/composables/useFavoritesPageEffects'
import { useFavoritesShare } from '@/composables/useFavoritesShare'
import { safePush } from '@/utils/navigation'

export function useFavoritesPage() {
  const router = useRouter()
  const message = useMessage()
  let syncSharedStatus = () => {}

  const collectionsState = useFavoritesCollections({
    message,
    onCollectionSelectionSynced: () => syncSharedStatus(),
  })

  const editorState = useFavoritesCollectionEditor({
    fetchCollections: collectionsState.fetchCollections,
    message,
    refreshAll: collectionsState.refreshAll,
    resetSelectedCollection: () => {
      collectionsState.selectedCollectionId.value = null
    },
    selectedCollection: collectionsState.selectedCollection,
  })

  const shareState = useFavoritesShare({
    message,
    patchCollection: collectionsState.patchCollection,
    router,
    selectedCollection: collectionsState.selectedCollection,
  })
  syncSharedStatus = shareState.updateSharedStatus

  const coverState = useFavoritesCover({
    message,
    selectedCollection: collectionsState.selectedCollection,
  })

  const moveState = useFavoritesMoveItem({
    collections: collectionsState.collections,
    message,
    removeItemFromCurrentList: collectionsState.removeItemFromCurrentList,
    selectedCollectionId: collectionsState.selectedCollectionId,
    selectedIsDefault: collectionsState.selectedIsDefault,
  })

  useFavoritesPageEffects({
    fetchCollections: collectionsState.fetchCollections,
    fetchItems: collectionsState.fetchItems,
  })

  function goExploreDocs() {
    void safePush(router, '/dashboard/docs')
  }

  return {
    ...collectionsState,
    ...editorState,
    ...shareState,
    ...coverState,
    ...moveState,
    goExploreDocs,
  }
}
