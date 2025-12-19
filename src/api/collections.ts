import http from '@/api/http'

/** 0=私有 1=公开 */
export type Visibility = 0 | 1

export type CollectionInfoDTO = {
  id: number
  userId: number
  name: string
  description?: string
  visibility: Visibility
  isDefault: boolean
  coverPid?: number
  coverP?: number
  createdAt?: string
  updatedAt?: string

  // 公开页展示分享者信息（如果后端有返回就能用）
  ownerNickname?: string
  ownerAvatarUrl?: string
  itemCount?: number
}

export type FavoriteImageDTO = {
  id: number
  pid: number
  p: number
  uid: number
  title: string
  author: string
  r18: number
  width: number
  height: number
  ext?: string
  aiType?: number
  uploadDate?: number
  tags: string[]

  urlOriginal?: string
  urlRegular?: string
  urlSmall?: string
}

export type CollectionItemDTO = {
  itemId: number
  pid: number
  p: number
  addedAt?: string
  image?: FavoriteImageDTO
}

export type CollectionItemPageDTO = {
  page: number
  size: number
  total: number
  items: CollectionItemDTO[]
}

// =======================
// 我的收藏夹（需要登录）
// =======================

export function listMyCollections() {
  return http.get<CollectionInfoDTO[]>('/collections/mine')
}

export function createCollection(payload: {
  name: string
  description?: string
  visibility: Visibility
}) {
  return http.post<number>('/collections', payload)
}

/** 你后端支持 PUT /collections/{id} */
export function updateCollection(
  id: number | string,
  payload: { name?: string; description?: string; visibility?: Visibility }
) {
  return http.put<string>(`/collections/${id}`, payload)
}

export function deleteCollection(id: number | string) {
  return http.delete<string>(`/collections/${id}`)
}

// =======================
// 公开页/分享页可用：收藏夹信息
// GET /collections/{id}
// =======================

export function getCollectionInfo(id: number | string) {
  return http.get<CollectionInfoDTO>(`/collections/${id}`)
}

// =======================
// items
// GET /collections/{id}/items?page=&size=
// =======================

export function getCollectionItems(
  id: number | string,
  params: { page: number; size?: number }
) {
  return http.get<CollectionItemPageDTO>(`/collections/${id}/items`, { params })
}

export function addToCollection(
  collectionId: number | string,
  pid: number | string,
  p: number = 0
) {
  return http.post<string>(`/collections/${collectionId}/items/${pid}/${p}`)
}

export function removeFromCollection(
  collectionId: number | string,
  pid: number | string,
  p: number = 0
) {
  return http.delete<string>(`/collections/${collectionId}/items/${pid}/${p}`)
}

// =======================
// 分享链接（前端用）
// =======================

export function buildPublicCollectionUrl(id: number | string) {
  return `${window.location.origin}/c/${id}`
}
