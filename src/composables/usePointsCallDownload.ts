import type { MessageApi } from 'naive-ui'
import type { SetuImageItem } from '@/api/setu'
import { signDownloadUrl } from '@/api/download'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { getPointsCallDownloadFilename } from '@/composables/usePointsCallDefaults'

export interface UsePointsCallDownloadOptions {
  message: MessageApi
}

export function usePointsCallDownload(options: UsePointsCallDownloadOptions) {
  function openOriginal(url?: string | null) {
    if (!url)
      return options.message.warning('原图链接为空')
    window.open(url, '_blank')
  }

  async function startSignedDownload(url: string, filename: string) {
    const loading = options.message.loading('正在准备下载...', { duration: 0 })
    try {
      const downloadUrl = await signDownloadUrl({ url, filename })
      loading.destroy()
      window.location.href = downloadUrl
    }
    catch (error) {
      loading.destroy()
      throw error
    }
  }

  async function downloadOriginal(url?: string | null, item?: SetuImageItem) {
    if (!url)
      return options.message.warning('下载链接为空')

    try {
      await startSignedDownload(url, getPointsCallDownloadFilename(item))
    }
    catch (error) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '下载失败')
    }
  }

  return {
    downloadOriginal,
    openOriginal,
  }
}
