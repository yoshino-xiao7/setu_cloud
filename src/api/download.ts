import http from '@/api/http'
import { unwrapApiData } from '@/api/response'

export interface DownloadSignRequest {
  url: string
  filename: string
}

export interface DownloadSignResponse {
  downloadUrl: string
}

export async function signDownloadUrl(payload: DownloadSignRequest) {
  const res = await http.post('/download/sign', payload)
  const data = unwrapApiData<DownloadSignResponse | null>(res, null)
  const downloadUrl = data?.downloadUrl

  if (!downloadUrl) {
    throw new Error('下载签名失败：后端未返回下载地址')
  }

  return downloadUrl
}
