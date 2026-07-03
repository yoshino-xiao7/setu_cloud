import type { ShallowRef } from 'vue'
import type { ImageAuditListDTO, ImageAvailabilityStatus } from '@/api/admin'
import { ref } from 'vue'
import { checkImageAvailability } from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import {
  getCurrentImageAuditTime,
  getImageAvailabilityDetail,
  getImageAvailabilityMeta,
} from '@/composables/useImageAuditViewHelpers'

interface UseImageAuditAvailabilityOptions {
  list: ShallowRef<ImageAuditListDTO[]>
  shouldIgnoreError: (error: unknown) => boolean
  showError: (error: unknown, fallbackMessage: string) => void
  success: (content: string) => void
  warning: (content: string) => void
}

interface ImageAvailabilityCheckResult {
  imageId: number
  success?: boolean
  status?: ImageAvailabilityStatus
  httpStatus?: number
  message?: string
}

export function useImageAuditAvailability(options: UseImageAuditAvailabilityOptions) {
  const availabilityCheckLoading = ref(false)

  function applyAvailabilityResults(results: ImageAvailabilityCheckResult[]) {
    const resultMap = new Map(results.map(result => [result.imageId, result]))
    options.list.value = options.list.value.map((item) => {
      const result = resultMap.get(item.id)
      if (!result)
        return item

      return {
        ...item,
        availabilityStatus: result.status || item.availabilityStatus,
        lastAvailabilityCheckAt: getCurrentImageAuditTime(),
        lastAvailabilityHttpStatus: result.httpStatus ?? item.lastAvailabilityHttpStatus,
        lastAvailabilityError: result.message || null,
        availabilityFailCount: result.status === 'OK'
          ? 0
          : (item.availabilityFailCount || 0) + 1,
      }
    })
  }

  async function runAvailabilityCheck(imageIds: number[]) {
    const targets = Array.from(new Set(imageIds)).slice(0, 100)
    if (targets.length === 0) {
      options.warning('当前没有可检测的图片')
      return
    }

    availabilityCheckLoading.value = true
    try {
      const data = unwrapApiData(await checkImageAvailability(targets), {
        total: targets.length,
        successCount: 0,
        failureCount: targets.length,
        results: [] as ImageAvailabilityCheckResult[],
      })
      applyAvailabilityResults(data.results)
      if (data.failureCount > 0) {
        const failure = data.results.find(item => !item.success)
        options.warning(`已检测 ${data.successCount} 张，${data.failureCount} 张失败${failure?.message ? `：${failure.message}` : ''}`)
      }
      else {
        options.success(`已检测 ${data.successCount} 张图片`)
      }
    }
    catch (e: unknown) {
      if (!options.shouldIgnoreError(e))
        options.showError(e, '检测图片可用性失败')
    }
    finally {
      availabilityCheckLoading.value = false
    }
  }

  return {
    availabilityCheckLoading,
    getAvailabilityDetail: getImageAvailabilityDetail,
    getAvailabilityMeta: getImageAvailabilityMeta,
    runAvailabilityCheck,
  }
}
