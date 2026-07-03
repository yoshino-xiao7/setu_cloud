import { submitImageAuditResult } from '@/api/admin'
import { unwrapApiData } from '@/api/response'

interface UseImageAuditSingleReviewOptions {
  settleReviewedImage: (imageId: number, auditStatus: 1 | 2, remark?: string | null) => void
  shouldIgnoreError: (error: unknown) => boolean
  showError: (error: unknown, fallbackMessage: string) => void
  success: (content: string) => void
}

export function useImageAuditSingleReview(options: UseImageAuditSingleReviewOptions) {
  async function submitPassReview(imageId: number) {
    try {
      await submitImageAuditResult({
        imageId,
        status: 1,
      })
      options.success('审核完成（正常）')
      options.settleReviewedImage(imageId, 1)
      return true
    }
    catch (e: unknown) {
      if (options.shouldIgnoreError(e))
        return false
      options.showError(e, '操作失败')
      return false
    }
  }

  async function submitRejectReview(imageId: number, remark: string) {
    try {
      const result = await submitImageAuditResult({
        imageId,
        status: 2,
        remark,
      })

      // 后端返回的 string 提示可能包含“已自动创建删除申请”等后续动作信息。
      options.success(unwrapApiData<string | null>(result, null) || '审核完成（有问题）')
      options.settleReviewedImage(imageId, 2, remark)
      return true
    }
    catch (e: unknown) {
      if (options.shouldIgnoreError(e))
        return false
      options.showError(e, '操作失败')
      return false
    }
  }

  return {
    submitPassReview,
    submitRejectReview,
  }
}
