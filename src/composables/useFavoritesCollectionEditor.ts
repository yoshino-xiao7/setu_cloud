import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type {
  FavoriteCollection,
  FavoriteCollectionVisibility,
} from '@/composables/useFavoritesCollections'
import { ref } from 'vue'
import {
  createCollection,
  deleteCollection,
  updateCollection,
} from '@/api/collections'

interface FavoritesCollectionEditorOptions {
  fetchCollections: () => Promise<void>
  message: MessageApi
  refreshAll: () => Promise<void>
  resetSelectedCollection: () => void
  selectedCollection: ComputedRef<FavoriteCollection | null>
}

export function useFavoritesCollectionEditor(options: FavoritesCollectionEditorOptions) {
  const showCreate = ref(false)
  const showEdit = ref(false)
  const createForm = ref({ name: '', description: '', visibility: 0 as FavoriteCollectionVisibility })
  const editForm = ref({ id: 0, name: '', description: '', visibility: 0 as FavoriteCollectionVisibility })
  const saving = ref(false)

  function openCreate() {
    createForm.value = { name: '', description: '', visibility: 0 }
    showCreate.value = true
  }

  async function submitCreate() {
    const name = createForm.value.name.trim()
    if (!name) {
      options.message.warning('请输入收藏夹名称')
      return
    }

    saving.value = true
    try {
      await createCollection({
        name,
        description: createForm.value.description?.trim() || '',
        visibility: createForm.value.visibility,
      })
      options.message.success('创建成功')
      showCreate.value = false
      await options.fetchCollections()
    }
    catch {
      options.message.error('创建失败')
    }
    finally {
      saving.value = false
    }
  }

  function openEdit() {
    const collection = options.selectedCollection.value
    if (!collection)
      return

    editForm.value = {
      id: collection.id,
      name: collection.name,
      description: collection.description || '',
      visibility: (collection.visibility as FavoriteCollectionVisibility),
    }
    showEdit.value = true
  }

  async function submitEdit() {
    const collection = options.selectedCollection.value
    if (!collection)
      return

    const payload: { name?: string, description?: string, visibility?: number } = {
      description: editForm.value.description?.trim() || '',
    }

    if (!collection.isDefault) {
      const name = editForm.value.name.trim()
      if (!name) {
        options.message.warning('请输入收藏夹名称')
        return
      }
      payload.name = name
      payload.visibility = editForm.value.visibility
    }

    saving.value = true
    try {
      await updateCollection(editForm.value.id, payload)
      options.message.success('保存成功')
      showEdit.value = false
      await options.fetchCollections()
    }
    catch {
      options.message.error('保存失败')
    }
    finally {
      saving.value = false
    }
  }

  async function handleDeleteCollection() {
    const collection = options.selectedCollection.value
    if (!collection)
      return
    if (collection.isDefault) {
      options.message.warning('默认收藏夹不可删除')
      return
    }

    saving.value = true
    try {
      await deleteCollection(collection.id)
      options.message.success('已删除收藏夹')
      options.resetSelectedCollection()
      await options.refreshAll()
    }
    catch {
      options.message.error('删除失败')
    }
    finally {
      saving.value = false
    }
  }

  return {
    createForm,
    editForm,
    handleDeleteCollection,
    openCreate,
    openEdit,
    saving,
    showCreate,
    showEdit,
    submitCreate,
    submitEdit,
  }
}
