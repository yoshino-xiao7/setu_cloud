import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { ImageAuditListDTO, ImageAuditListStats, ImageAuditScope } from '@/api/admin'
import {
  getCurrentImageAuditTime,
  getImageAuditScopeStatKey,
  parseImageAuditTime,
} from '@/composables/useImageAuditViewHelpers'

interface ImageAuditPaginationState {
  page: number
  pageSize: number
  itemCount: number
}

interface UseImageAuditReviewSettlementOptions {
  dueBefore: Ref<string | null>
  fetchData: () => void
  list: ShallowRef<ImageAuditListDTO[]>
  pageCount: ComputedRef<number>
  pagination: ImageAuditPaginationState
  removeSelectedImageIds: (imageIds: number[]) => void
  scope: Ref<ImageAuditScope>
  stats: Ref<ImageAuditListStats | null>
}

export function useImageAuditReviewSettlement(options: UseImageAuditReviewSettlementOptions) {
  function decreaseStat(key: keyof ImageAuditListStats, amount = 1) {
    if (!options.stats.value)
      return
    options.stats.value = {
      ...options.stats.value,
      [key]: Math.max(0, options.stats.value[key] - amount),
    }
  }

  function isDueReviewImage(row: ImageAuditListDTO) {
    const dueBeforeTime = parseImageAuditTime(options.dueBefore.value)
    const auditTime = parseImageAuditTime(row.lastAuditTime)
    return dueBeforeTime > 0 && auditTime > 0 && auditTime <= dueBeforeTime
  }

  function settleReviewedImages(imageIds: number[], auditStatus: 1 | 2, remark?: string | null) {
    const imageIdSet = new Set(imageIds)
    const reviewedImages = options.list.value.filter(item => imageIdSet.has(item.id))
    if (reviewedImages.length === 0)
      return

    options.removeSelectedImageIds(imageIds)

    if (options.scope.value === 'ALL') {
      const unreviewedCount = reviewedImages.filter(item => !item.lastAuditTime).length
      const dueReviewCount = reviewedImages.filter(item => isDueReviewImage(item)).length
      if (unreviewedCount > 0)
        decreaseStat('unreviewed', unreviewedCount)
      if (dueReviewCount > 0)
        decreaseStat('dueReview', dueReviewCount)

      const lastAuditTime = getCurrentImageAuditTime()
      options.list.value = options.list.value.map(item =>
        imageIdSet.has(item.id)
          ? {
              ...item,
              lastAuditStatus: auditStatus,
              lastAuditRemark: remark || null,
              lastAuditTime,
            }
          : item,
      )
      return
    }

    const nextList = options.list.value.filter(item => !imageIdSet.has(item.id))
    options.list.value = nextList
    options.pagination.itemCount = Math.max(0, options.pagination.itemCount - reviewedImages.length)
    decreaseStat(getImageAuditScopeStatKey(options.scope.value), reviewedImages.length)

    if (nextList.length === 0 && options.pagination.itemCount > 0) {
      options.pagination.page = Math.min(options.pagination.page, options.pageCount.value)
      options.fetchData()
    }
  }

  function settleReviewedImage(imageId: number, auditStatus: 1 | 2, remark?: string | null) {
    const reviewedImage = options.list.value.find(item => item.id === imageId)
    if (!reviewedImage)
      return
    settleReviewedImages([imageId], auditStatus, remark)
  }

  return {
    settleReviewedImage,
    settleReviewedImages,
  }
}
