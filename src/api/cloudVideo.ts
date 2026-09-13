import http from '@/api/http'

export interface CloudVideoItem {
  id: number
  title: string
  description?: string | null
  tags?: string | null
  durationSeconds?: number
  width?: number
  height?: number
  coverUrl?: string | null
  status?: string
  visibility?: string
  encodeProgress?: number
  createdAt?: string
  updatedAt?: string
}

export interface CloudVideoPage {
  items: CloudVideoItem[]
  total: number
  offset: number
  limit: number
}

export interface CloudVideoPlayback {
  id: number
  title: string
  hlsUrl: string
  posterUrl?: string | null
  expireAt: number
}

export function fetchCloudVideoList(params: { offset?: number, limit?: number } = {}) {
  return http.get<CloudVideoPage>('/user/cloud-video', { params })
}

export function searchCloudVideos(params: { keywords?: string, offset?: number, limit?: number }) {
  return http.get<CloudVideoPage>('/user/cloud-video/search', { params })
}

export function fetchCloudVideo(id: number) {
  return http.get<CloudVideoItem>(`/user/cloud-video/${id}`)
}

export function fetchCloudVideoPlayback(id: number) {
  return http.get<CloudVideoPlayback>(`/user/cloud-video/${id}/playback`)
}
