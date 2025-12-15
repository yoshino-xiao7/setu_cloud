import http from '@/api/http'

/**
 * 添加收藏
 * POST /favorite/{pid}/{p}
 */
export function addFavorite(pid: number | string, p: number = 0) {
  return http.post(`/favorite/${pid}/${p}`)
}

/**
 * 取消收藏
 * DELETE /favorite/{pid}/{p}
 */
export function removeFavorite(pid: number | string, p: number = 0) {
  return http.delete(`/favorite/${pid}/${p}`)
}

/**
 * 检查是否已收藏
 * GET /favorite/exists/{pid}/{p}
 */
export function checkFavoriteExists(pid: number | string, p: number = 0) {
  return http.get<boolean>(`/favorite/exists/${pid}/${p}`)
}

/**
 * 获取列表
 */
export function getFavoriteList(params: { page: number; size?: number }) {
  return http.get('/favorite/list', { params })
}