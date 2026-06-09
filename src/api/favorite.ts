import http from '@/api/http'

export interface FavoriteImageDTO {
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

export interface FavoriteItemDTO {
  favoriteId: number
  imageId?: number
  pid: number
  p: number
  favoritedAt?: string
  image?: FavoriteImageDTO
}

export interface FavoritePageDTO {
  page: number
  size: number
  total: number
  items: FavoriteItemDTO[]
}

/**
 * 添加收藏（默认收藏夹）
 * POST /favorite/{pid}/{p}
 */
export function addFavorite(pid: number | string, p: number = 0) {
  return http.post<string>(`/favorite/${pid}/${p}`)
}

/**
 * 取消收藏（默认收藏夹）
 * DELETE /favorite/{pid}/{p}
 */
export function removeFavorite(pid: number | string, p: number = 0) {
  return http.delete<string>(`/favorite/${pid}/${p}`)
}

/**
 * 检查是否已收藏（默认收藏夹）
 * GET /favorite/exists/{pid}/{p}
 */
export function checkFavoriteExists(pid: number | string, p: number = 0) {
  return http.get<boolean>(`/favorite/exists/${pid}/${p}`)
}

/**
 * 默认收藏夹列表（分页）
 * GET /favorite/list?page=&size=
 */
export function getFavoriteList(params: { page: number, size?: number }) {
  return http.get<FavoritePageDTO>('/favorite/list', { params })
}
