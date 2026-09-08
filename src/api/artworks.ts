import { isAxiosError } from 'axios'
import http from '@/api/http'
import { unwrapApiData } from '@/api/response'

export type ArtworkSource = 'pixiv' | 'gallery'
export interface ArtworkArtist {
  id: string
  name: string
  avatarUrl: string | null
  followed: boolean | null
}
export interface ArtworkPage {
  index: number
  pid: string
  width: number
  height: number
  thumbnailUrl: string | null
  previewUrl: string | null
  originalUrl: string | null
  bookmarked: boolean | null
}
export interface Artwork {
  source: ArtworkSource
  id: string
  pid: string
  title: string
  artist: ArtworkArtist
  kind: string
  pageCount: number
  pages: ArtworkPage[]
  tags: string[]
  caption: string | null
  createdAt: string | null
  views: number | null
  bookmarks: number | null
  bookmarked: boolean
  restricted: boolean
  aiGenerated: boolean
}
export interface ArtworkList {
  items: Artwork[]
  nextCursor: string | null
}
export interface PixivBinding {
  bound: boolean
  accountId: string | null
  name: string | null
  version: string | null
}
export interface ArtworkSpotlight {
  id: string
  title: string
  thumbnailUrl: string | null
  url: string
}
export interface ArtworkAnimation {
  id: string
  status: 'pending' | 'running' | 'ready' | 'failed'
  mediaUrl: string | null
  message: string | null
}
function pixivUnavailable(): never {
  throw new Error('Pixiv 在线暂未开放，请使用本站图库')
}
export const artworkBase = (source: ArtworkSource) => source === 'pixiv' ? pixivUnavailable() : '/user/images'
export async function fetchArtworks(source: ArtworkSource, params: Record<string, string | number | boolean | undefined>) {
  return unwrapApiData<ArtworkList>(await http.get(`${artworkBase(source)}/works`, { params }))
}
export async function fetchArtwork(source: ArtworkSource, id: string) {
  return unwrapApiData<Artwork>(await http.get(`${artworkBase(source)}/works/${encodeURIComponent(id)}`))
}
export async function fetchPixivBinding() {
  return { bound: false, accountId: null, name: null, version: null } satisfies PixivBinding
}
export async function unlinkPixiv() {
  pixivUnavailable()
}
export async function fetchArtworkArtists() {
  return [] as ArtworkArtist[]
}
export async function fetchArtworkSpotlights() {
  return [] as ArtworkSpotlight[]
}
export async function setArtworkBookmark(work: Artwork, enabled: boolean, page?: ArtworkPage, visibility = 'public') {
  const suffix = work.source === 'gallery' && page ? `/pages/${encodeURIComponent(page.pid)}/${page.index}` : ''
  await http.put(`${artworkBase(work.source)}/works/${encodeURIComponent(work.id)}${suffix}/bookmark`, { enabled, visibility, page: page?.index })
}
export async function setArtworkFollow(_artist: ArtworkArtist, _enabled: boolean) {
  pixivUnavailable()
}
export async function startArtworkAnimation(_id: string): Promise<ArtworkAnimation> {
  return pixivUnavailable()
}
export async function fetchArtworkAnimation(_id: string): Promise<ArtworkAnimation> {
  return pixivUnavailable()
}
export async function fetchArtworkBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  if (!/^\/user\/images\/media\/[a-f0-9-]+\?scope=gallery$/.test(path))
    throw new Error('图片资源地址无效，请重新加载作品')
  const response = await http.get<Blob>(path, { responseType: 'blob', signal })
  return response.data
}
export async function saveArtworkMedia(path: string, filename: string) {
  const blob = await fetchArtworkBlob(path)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4' }
  const ext = extensions[blob.type.split(';')[0] || '']
  anchor.download = ext ? filename.replace(/\.[^.]+$/, `.${ext}`) : filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export function artworkError(cause: unknown, fallback: string) {
  if (isAxiosError(cause)) {
    const body = cause.response?.data
    if (body && typeof body === 'object' && typeof body.message === 'string')
      return body.message
    return cause.code === 'ERR_NETWORK' ? '网络连接失败，请检查网络后重试' : fallback
  }
  return cause instanceof Error ? cause.message : fallback
}
