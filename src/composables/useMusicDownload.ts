import type { MessageApi } from 'naive-ui'
import type { Song } from '@/api/music'
import { signDownloadUrl } from '@/api/download'
import {
  getMusicUnavailableMessage,
  getPlayableUrl,
  userMusicApi,
} from '@/api/music'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface MusicDownloadOptions {
  message: MessageApi
}

export function useMusicDownload(options: MusicDownloadOptions) {
  async function downloadSong(song: Song) {
    try {
      const res = await userMusicApi.getUrl(song.id, 'exhigh')
      const url = getPlayableUrl(res)

      if (!url) {
        options.message.error(getMusicUnavailableMessage(res))
        return
      }

      await startSignedDownload(url, getMusicDownloadFilename(song))
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '下载失败')
    }
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

  return {
    downloadSong,
  }
}

function getMusicDownloadFilename(song: Song) {
  return `${song.name} - ${song.artists.map(artist => artist.name).join(', ')}.mp3`
}
