import type { Ref, ShallowRef } from 'vue'
import type { ImageAuditListDTO, ImageAuditScope } from '@/api/admin'
import { computed, ref } from 'vue'

interface UseImageAuditSelectionOptions {
  list: ShallowRef<ImageAuditListDTO[]>
  scope: Ref<ImageAuditScope>
}

export function useImageAuditSelection(options: UseImageAuditSelectionOptions) {
  const selectedImageIds = ref<number[]>([])
  const isAuditScope = computed(() => options.scope.value !== 'ALL')
  const auditableImages = computed(() => isAuditScope.value ? options.list.value : [])
  const selectedAuditableImages = computed(() => {
    const selectedIds = new Set(selectedImageIds.value)
    return auditableImages.value.filter(item => selectedIds.has(item.id))
  })
  const allCurrentImagesSelected = computed(() => {
    return auditableImages.value.length > 0 && auditableImages.value.every(item => selectedImageIds.value.includes(item.id))
  })
  const currentImagesIndeterminate = computed(() => {
    return selectedAuditableImages.value.length > 0 && !allCurrentImagesSelected.value
  })

  function syncSelectedImages() {
    const currentIds = new Set(auditableImages.value.map(item => item.id))
    selectedImageIds.value = selectedImageIds.value.filter(id => currentIds.has(id))
  }

  function setImageSelected(row: ImageAuditListDTO, checked: boolean) {
    if (!isAuditScope.value)
      return

    const selectedIds = new Set(selectedImageIds.value)
    if (checked)
      selectedIds.add(row.id)
    else
      selectedIds.delete(row.id)
    selectedImageIds.value = [...selectedIds]
  }

  function toggleCurrentImageSelection(checked: boolean) {
    selectedImageIds.value = checked
      ? auditableImages.value.map(item => item.id)
      : []
  }

  function clearSelectedImages() {
    selectedImageIds.value = []
  }

  function removeSelectedImageIds(imageIds: number[]) {
    const imageIdSet = new Set(imageIds)
    selectedImageIds.value = selectedImageIds.value.filter(id => !imageIdSet.has(id))
  }

  return {
    allCurrentImagesSelected,
    auditableImages,
    clearSelectedImages,
    currentImagesIndeterminate,
    isAuditScope,
    removeSelectedImageIds,
    selectedAuditableImages,
    selectedImageIds,
    setImageSelected,
    syncSelectedImages,
    toggleCurrentImageSelection,
  }
}
