import type { ComputedRef } from 'vue'
import type { ImageAuditListDTO } from '@/api/admin'
import { ref } from 'vue'
import { submitImageAuditBatch } from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import { getImageAuditBatchFailureText } from '@/composables/useImageAuditViewHelpers'

interface UseImageAuditBatchReviewOptions {
  selectedAuditableImages: ComputedRef<ImageAuditListDTO[]>
  settleReviewedImages: (imageIds: number[], auditStatus: 1 | 2, remark?: string | null) => void
  shouldIgnoreError: (error: unknown) => boolean
  showError: (error: unknown, fallbackMessage: string) => void
  error: (content: string) => void
  success: (content: string) => void
  warning: (content: string) => void
}

interface ImageAuditBatchResult {
  imageId: number
  success: boolean
  message?: string
  code?: string
}

export function useImageAuditBatchReview(options: UseImageAuditBatchReviewOptions) {
  const bulkAuditLoading = ref(false)

  async function runBatchAudit(auditStatus: 1 | 2, remark?: string) {
    const targets = [...options.selectedAuditableImages.value]
    if (targets.length === 0) {
      options.warning('请先选择要审核的图片')
      return false
    }

    bulkAuditLoading.value = true
    try {
      const res = await submitImageAuditBatch({
        imageIds: targets.map(item => item.id),
        status: auditStatus,
        remark,
      })
      const data = unwrapApiData(res, {
        total: targets.length,
        successCount: 0,
        failureCount: targets.length,
        results: [] as ImageAuditBatchResult[],
      })
      const successIds = data.results.filter(item => item.success).map(item => item.imageId)

      if (successIds.length > 0)
        options.settleReviewedImages(successIds, auditStatus, remark)

      if (data.failureCount === 0) {
        options.success(auditStatus === 1
          ? `已批量标记 ${data.successCount} 张图片为正常`
          : `已批量标记 ${data.successCount} 张图片为有问题，并自动创建/复用删除申请`)
      }
      else if (data.successCount > 0) {
        const failureText = getImageAuditBatchFailureText(data.results)
        options.warning(`已处理 ${data.successCount} 张，${data.failureCount} 张失败${failureText ? `：${failureText}` : ''}`)
      }
      else {
        options.error(getImageAuditBatchFailureText(data.results) || '批量审核失败')
      }
      return data.successCount > 0
    }
    catch (e: unknown) {
      if (options.shouldIgnoreError(e))
        return false
      options.showError(e, '批量审核失败')
      return false
    }
    finally {
      bulkAuditLoading.value = false
    }
  }

  return {
    bulkAuditLoading,
    runBatchAudit,
  }
}
