import type { MessageApi } from 'naive-ui'
import type { MvUrl, MvUrlResponse, Song } from '@/api/music'
import type { useMusicStore } from '@/stores/music'
import { ref } from 'vue'
import { userMusicApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface MusicMvPlaybackOptions {
  message: MessageApi
  musicStore: ReturnType<typeof useMusicStore>
}

interface ApiError {
  code?: string
  message?: string
}

export function useMusicMvPlayback(options: MusicMvPlaybackOptions) {
  const loadingMv = ref(false)

  async function handlePlayMv(song: Song) {
    if (!song.mv || song.mv === 0) {
      options.message.warning('该歌曲没有 MV')
      return
    }

    loadingMv.value = true
    const loadingMsg = options.message.loading('正在加载 MV...', { duration: 0 })

    try {
      const res = await userMusicApi.getMvUrl(song.mv)
      const responseData = unwrapApiData<MvUrlResponse | MvUrl | MvUrl[] | null>(res, null)
      const mvData = resolveMvUrl(responseData)

      if (!mvData?.url)
        throw new Error('无法获取 MV 播放地址')

      if (typeof options.musicStore.playMv !== 'function')
        throw new TypeError('musicStore.playMv is not a function')

      // 浏览器会拦截 HTTPS 页面中的 HTTP 媒体；保留原地址用于播放器降级。
      const originalMvUrl = mvData.url || ''
      const mvUrl = originalMvUrl.replace(/^http:\/\//i, 'https://')

      options.musicStore.playMv(mvUrl, {
        name: song.name,
        artist: song.artists.map(artist => artist.name).join(' / '),
        songId: song.id,
      }, false, originalMvUrl !== mvUrl ? originalMvUrl : undefined)

      options.message.success('MV 加载成功')
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return

      const err = error as ApiError
      if (err.code === 'ECONNABORTED') {
        showApiError(options.message, error, '加载 MV 失败', { messageOverride: '请求超时，请稍后重试' })
        return
      }

      if (err.message?.includes('Network Error')) {
        showApiError(options.message, error, '加载 MV 失败', { messageOverride: '网络连接失败，请检查网络' })
        return
      }

      showApiError(options.message, error, '加载 MV 失败')
    }
    finally {
      loadingMv.value = false
      loadingMsg.destroy()
    }
  }

  return {
    handlePlayMv,
    loadingMv,
  }
}

function resolveMvUrl(responseData: MvUrlResponse | MvUrl | MvUrl[] | null): MvUrl | null {
  if (Array.isArray(responseData))
    return responseData[0] || null

  if (responseData && 'data' in responseData) {
    const data = responseData.data
    return Array.isArray(data) ? (data[0] || null) : data
  }

  if (responseData && 'url' in responseData)
    return responseData

  return null
}
