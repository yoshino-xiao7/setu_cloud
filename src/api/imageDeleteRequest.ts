/**
 * 图片删除申请相关 API
 */
import http from './http'

// ============ 类型定义 ============

/** 申请状态 */
export const REQUEST_STATUS = {
  PENDING: 0, // 待审核
  APPROVED: 1, // 已批准
  REJECTED: 2, // 已拒绝
} as const

/** 状态配置 */
export const STATUS_CONFIG = {
  [REQUEST_STATUS.PENDING]: {
    text: '待审核',
    color: '#faad14',
    type: 'warning' as const,
  },
  [REQUEST_STATUS.APPROVED]: {
    text: '已批准',
    color: '#52c41a',
    type: 'success' as const,
  },
  [REQUEST_STATUS.REJECTED]: {
    text: '已拒绝',
    color: '#ff4d4f',
    type: 'error' as const,
  },
}

/** 列表项类型 */
export interface ImageDeleteRequestItem {
  id: number
  userId: number
  userEmail: string
  userNickname: string
  pid: number
  p: number
  reason: string
  status: number
  statusText: string
  createdAt: string
  imageTitle?: string | null
  imageAuthor?: string | null
  thumbnailUrl?: string | null
}

/** 详情类型 */
export interface ImageDeleteRequestDetail extends ImageDeleteRequestItem {
  title?: string | null
  author?: string | null
  uid?: number | null
  r18?: number
  width?: number
  height?: number
  ext?: string
  aiType?: number
  uploadDate?: number
  urlOriginal?: string | null
  tags?: string[]
  adminId?: number | null
  adminEmail?: string | null
  adminRemark?: string | null
  reviewedAt?: string | null
}

/** 分页响应 */
export interface PageResult<T> {
  total: number
  page: number
  pageSize: number
  list: T[]
}

// ============ 用户端 API ============

/**
 * 提交删除申请
 */
export function submitDeleteRequest(pid: number, p: number, reason?: string) {
  return http.post('/image-delete/submit', { pid, p, reason })
}

/**
 * 获取我的申请列表
 */
export function fetchMyDeleteRequests(page = 1, pageSize = 10) {
  return http.get<PageResult<ImageDeleteRequestItem>>('/image-delete/my', {
    params: { page, pageSize },
  })
}

/**
 * 获取我的申请详情
 */
export function fetchMyDeleteRequestDetail(id: number) {
  return http.get<ImageDeleteRequestDetail>(`/image-delete/my/${id}`)
}

// ============ 管理员端 API ============

/**
 * 管理员获取申请列表
 */
export function fetchAdminDeleteRequestList(
  status?: number,
  page = 1,
  pageSize = 20,
) {
  return http.get<PageResult<ImageDeleteRequestItem>>('/admin/image-delete/list', {
    params: { status, page, pageSize },
  })
}

/**
 * 管理员获取待审核列表
 */
export function fetchAdminPendingList(page = 1, pageSize = 20) {
  return http.get<PageResult<ImageDeleteRequestItem>>('/admin/image-delete/pending', {
    params: { page, pageSize },
  })
}

/**
 * 管理员获取申请详情
 */
export function fetchAdminDeleteRequestDetail(id: number) {
  return http.get<ImageDeleteRequestDetail>(`/admin/image-delete/${id}`)
}

/**
 * 管理员审核申请
 */
export function reviewDeleteRequest(requestId: number, approve: boolean, remark?: string) {
  return http.post('/admin/image-delete/review', {
    requestId,
    approve,
    remark,
  })
}
