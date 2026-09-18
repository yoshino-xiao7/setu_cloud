import http from '@/api/http'

export interface QqSpaceCharacter {
  id: number
  slug: 'yukiryou' | 'suzuki' | string
  name: string
  aliases?: string | null
  intro?: string | null
  personality?: string | null
  background?: string | null
  quote?: string | null
  themeColor?: string | null
  avatarUrl?: string | null
  portraitUrl?: string | null
}

export interface QqSpaceAsset {
  id: number
  mediaType: 'IMAGE' | 'VIDEO' | string
  status: string
  contentType?: string | null
  width?: number
  height?: number
  durationSeconds?: number
  url?: string | null
  posterUrl?: string | null
  playbackUrl?: string | null
}

export interface QqSpaceAlbumItem extends QqSpaceAsset {
  id: number
  caption?: string | null
  sortOrder?: number
}

export interface QqSpaceAlbum {
  id: number
  title: string
  description?: string | null
  ownerSlug?: string
  coverUrl?: string | null
  status?: string
  sortOrder?: number
  itemCount?: number
  characters?: string[]
  items?: QqSpaceAlbumItem[]
}

export interface QqSpaceChapter {
  id: number
  storyId: number
  title: string
  bodyMarkdown: string
  sortOrder?: number
}

export interface QqSpaceStoryProgress {
  chapter_id?: number
  chapterId?: number
  page_index?: number
  pageIndex?: number
}

export interface QqSpaceStory {
  id: number
  title: string
  subtitle?: string | null
  description?: string | null
  ownerSlug?: string
  coverUrl?: string | null
  status?: string
  chapterCount?: number
  characters?: string[]
  chapters?: QqSpaceChapter[]
  progress?: QqSpaceStoryProgress | null
  assets?: QqSpaceAsset[]
}

export interface QqSpaceVideoSession extends QqSpaceAsset {
  bunnyVideoId: string
  libraryId: number
  tusEndpoint: string
  authorizationExpire: number
  authorizationSignature: string
}

export function fetchQqCharacters() {
  return http.get<QqSpaceCharacter[]>('/user/qq-space/characters')
}

export function fetchQqCharacter(slug: string) {
  return http.get<QqSpaceCharacter>(`/user/qq-space/characters/${slug}`)
}

export function fetchQqAlbums(params: { character?: string, page?: number, pageSize?: number } = {}) {
  return http.get<QqSpaceAlbum[]>('/user/qq-space/albums', { params })
}

export function fetchQqAlbum(id: number) {
  return http.get<QqSpaceAlbum>(`/user/qq-space/albums/${id}`)
}

export function fetchQqStories(params: { character?: string, page?: number, pageSize?: number } = {}) {
  return http.get<QqSpaceStory[]>('/user/qq-space/stories', { params })
}

export function fetchQqStory(id: number) {
  return http.get<QqSpaceStory>(`/user/qq-space/stories/${id}`)
}

export function saveQqStoryProgress(id: number, payload: { chapterId: number, pageIndex: number }) {
  return http.put(`/user/qq-space/stories/${id}/progress`, payload)
}

export function fetchAdminQqCharacters() {
  return http.get<QqSpaceCharacter[]>('/admin/qq-space/characters')
}

export function updateAdminQqCharacter(slug: string, payload: Partial<QqSpaceCharacter> & { avatarAssetId?: number, portraitAssetId?: number }) {
  return http.put<QqSpaceCharacter>(`/admin/qq-space/characters/${slug}`, payload)
}

export function uploadQqImage(file: File, params: { ownerType: string, ownerId?: number, ownerSlug?: string }) {
  const body = new FormData()
  body.append('file', file)
  return http.post<QqSpaceAsset>('/admin/qq-space/assets/images', body, { params })
}

export function createAdminQqVideoSession(payload: { title: string }, params: { ownerType: string, ownerId?: number, ownerSlug?: string }) {
  return http.post<QqSpaceVideoSession>('/admin/qq-space/assets/videos/session', payload, { params })
}

export function syncAdminQqVideo(id: number) {
  return http.post<QqSpaceAsset>(`/admin/qq-space/assets/${id}/sync`)
}

export function fetchAdminQqAlbums(params: { character?: string, page?: number, pageSize?: number } = {}) {
  return http.get<QqSpaceAlbum[]>('/admin/qq-space/albums', { params })
}

export function createAdminQqAlbum(payload: { title: string, description?: string, characterSlugs?: string[], coverAssetId?: number }) {
  return http.post<QqSpaceAlbum>('/admin/qq-space/albums', payload)
}

export function updateAdminQqAlbum(id: number, payload: { title: string, description?: string, characterSlugs?: string[], coverAssetId?: number }) {
  return http.put<QqSpaceAlbum>(`/admin/qq-space/albums/${id}`, payload)
}

export function fetchAdminQqAlbum(id: number) {
  return http.get<QqSpaceAlbum>(`/admin/qq-space/albums/${id}`)
}

export function addAdminQqAlbumItem(id: number, payload: { assetId: number, caption?: string }) {
  return http.post<QqSpaceAlbum>(`/admin/qq-space/albums/${id}/items`, payload)
}

export function publishAdminQqAlbum(id: number) {
  return http.post(`/admin/qq-space/albums/${id}/publish`)
}

export function unpublishAdminQqAlbum(id: number) {
  return http.post(`/admin/qq-space/albums/${id}/unpublish`)
}

export function deleteAdminQqAlbum(id: number) {
  return http.delete(`/admin/qq-space/albums/${id}`)
}

export function fetchAdminQqStories(params: { character?: string, page?: number, pageSize?: number } = {}) {
  return http.get<QqSpaceStory[]>('/admin/qq-space/stories', { params })
}

export function createAdminQqStory(payload: { title: string, subtitle?: string, description?: string, characterSlugs?: string[], coverAssetId?: number }) {
  return http.post<QqSpaceStory>('/admin/qq-space/stories', payload)
}

export function updateAdminQqStory(id: number, payload: { title: string, subtitle?: string, description?: string, characterSlugs?: string[], coverAssetId?: number }) {
  return http.put<QqSpaceStory>(`/admin/qq-space/stories/${id}`, payload)
}

export function fetchAdminQqStory(id: number) {
  return http.get<QqSpaceStory>(`/admin/qq-space/stories/${id}`)
}

export function createAdminQqChapter(storyId: number, payload: { title: string, bodyMarkdown: string }) {
  return http.post<QqSpaceChapter>(`/admin/qq-space/stories/${storyId}/chapters`, payload)
}

export function updateAdminQqChapter(storyId: number, chapterId: number, payload: { title: string, bodyMarkdown: string }) {
  return http.put<QqSpaceChapter>(`/admin/qq-space/stories/${storyId}/chapters/${chapterId}`, payload)
}

export function publishAdminQqStory(id: number) {
  return http.post(`/admin/qq-space/stories/${id}/publish`)
}

export function unpublishAdminQqStory(id: number) {
  return http.post(`/admin/qq-space/stories/${id}/unpublish`)
}

export function deleteAdminQqStory(id: number) {
  return http.delete(`/admin/qq-space/stories/${id}`)
}
