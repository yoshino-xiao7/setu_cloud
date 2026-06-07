import http from '@/api/http'
import { SITE_URL } from '@/api/env'

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
  isShared?: boolean
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
  return `${SITE_URL}/c/${id}`
}

// =======================
// 🌐 广场相关 API
// =======================

/** 分享到广场 */
export function shareToSquare(collectionId: number | string) {
  return http.post<string>(`/collections/${collectionId}/share`)
}

/** 取消分享 */
export function unshareFromSquare(collectionId: number | string) {
  return http.delete<string>(`/collections/${collectionId}/share`)
}

/** 设置收藏夹封面 */
export function setCover(collectionId: number | string, pid: number, p: number = 0) {
  // ✅ 后端使用 Query 参数而不是 Request Body
  return http.put<string>(`/collections/${collectionId}/cover`, null, {
    params: { pid, p }
  })
}

/** 广场列表 DTO */
export type SquareCollectionDTO = {
  id: number
  name: string
  description?: string
  coverPid?: number
  coverP?: number
  coverUrl?: string  // ✅ 后端返回的封面图URL（small尺寸 360x360）
  userId?: number  // ✅ 分享者ID
  ownerNickname?: string
  ownerAvatarUrl?: string
  itemCount: number
  shareViewCount: number
  likeCount: number
  favoriteCount: number
  createdAt?: string
  updatedAt?: string
  shareCreatedAt?: string  // ✅ 分享到广场的时间
  // 当前用户是否点赞/收藏
  isLiked?: boolean
  isFavorited?: boolean
}

export type SquarePageResult = {
  page: number
  size: number
  total: number
  items: SquareCollectionDTO[]
}

/** 广场列表 */
export function getSquareCollections(params: {
  page: number
  size?: number
  sort?: 'hot' | 'new' | 'like'
  keyword?: string
}) {
  return http.get<SquarePageResult>('/square/collections', { params })
}

/** 广场详情（自动 +1 浏览量） */
export function getSquareCollectionDetail(id: number | string) {
  return http.get<SquareCollectionDTO>(`/square/collections/${id}`)
}

/** 点赞 */
export function likeSquareCollection(id: number | string) {
  return http.post<string>(`/square/collections/${id}/like`)
}

/** 取消点赞 */
export function unlikeSquareCollection(id: number | string) {
  return http.delete<string>(`/square/collections/${id}/like`)
}

/** 收藏（关注） */
export function favoriteSquareCollection(id: number | string) {
  return http.post<string>(`/square/collections/${id}/favorite`)
}

/** 取消收藏 */
export function unfavoriteSquareCollection(id: number | string) {
  return http.delete<string>(`/square/collections/${id}/favorite`)
}
