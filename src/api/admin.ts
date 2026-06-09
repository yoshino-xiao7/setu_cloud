// src/api/admin.ts
import http from '@/api/http'

// ==========================================
// Type Definitions (类型定义)
// ==========================================

// 7.1 博客统计数据结构
export interface AdminBlogStats {
  id: number
  totalCalls: number
  updatedAt: string
}

// 7.2 用户列表查询参数
export interface UserQueryParams {
  page: number
  pageSize: number
  email?: string
  nickname?: string // ✅ 建议加上这个，虽然 UserList 目前是用 keyword 传给 email，但接口定义最好完整
  status?: number // 1=正常, 0=封禁
  role?: number // 0=普通用户, 1=管理员
}

// 用户列表项结构
export interface AdminUserItem {
  id: number
  email: string
  nickname?: string | null // ✅ 核心修复：必须有这个字段，UserList.vue 才不会报错
  status: number
  role: number
  emailVerified: boolean
  registerIp: string
  lastLoginIp: string
  createdAt: string
}

// 用户列表响应结构
export interface AdminUserListResponse {
  total: number
  page: number
  pageSize: number
  list: AdminUserItem[]
}

// 7.3 用户详情（包含 API Keys）
export interface AdminUserApiKey {
  id: number
  name: string
  status: number
  createdAt: string
  lastUsedAt?: string
  totalCalls: number
  callsToday: number
  dailyQuota: number
  totalQuota: number
}

// 详情接口继承列表项，所以也会自动包含 nickname
export interface AdminUserDetail extends AdminUserItem {
  updatedAt: string
  apiKeys: AdminUserApiKey[]
}

// 7.5 IP 黑名单项
export interface BlacklistIpItem {
  id?: number
  ip: string
  reason?: string
  createdAt?: string
}

// ==========================================
// API Methods (接口函数)
// ==========================================

/**
 * 7.1 获取博客调用统计
 */
export function fetchAdminBlogStats() {
  return http.get<AdminBlogStats>('/admin/blog/stats')
}

/**
 * 7.2 获取用户列表
 */
export function fetchAdminUserList(params: UserQueryParams) {
  return http.get<AdminUserListResponse>('/admin/users', {
    params,
  })
}

/**
 * 7.3 获取单个用户详情（含 API Key）
 * @param id 用户ID
 */
export function fetchAdminUserDetail(id: number) {
  return http.get<AdminUserDetail>(`/admin/users/${id}`)
}

/**
 * 7.4 封禁用户
 * 注意：文档要求 userId 放在 query 参数中 (?userId={id})
 */
export function banUser(userId: number) {
  // POST 请求，body 为 null，参数放 params
  return http.post('/admin/user/ban', null, {
    params: { userId },
  })
}

/**
 * 7.4 解封用户
 */
export function unbanUser(userId: number) {
  return http.post('/admin/user/unban', null, {
    params: { userId },
  })
}

/**
 * 7.4 删除用户
 * DELETE /admin/user/{userId}
 */
export function deleteUser(userId: number) {
  return http.delete<string>(`/admin/user/${userId}`)
}

/**
 * 7.5 获取黑名单 IP 列表
 */
export function fetchIpBlacklist() {
  return http.get<BlacklistIpItem[]>('/admin/blacklist/ip')
}

/**
 * 7.5 添加 IP 到黑名单
 */
export function addIpBlacklist(ip: string, reason: string) {
  return http.post('/admin/blacklist/ip/add', {
    ip,
    reason,
  })
}

/**
 * 7.5 移除黑名单 IP
 */
export function removeIpBlacklist(ip: string) {
  return http.post('/admin/blacklist/ip/remove', {
    ip,
  })
}

// ==========================================
// 7.6 临时封禁 IP 管理
// ==========================================

// 临时封禁项结构
export interface TempBlockItem {
  ip: string
  blockedAt?: string
  expiresAt?: string
  reason?: string
}

/**
 * 7.6 获取所有临时封禁的IP
 */
export function fetchTempBlockList() {
  return http.get<TempBlockItem[]>('/admin/tempblock/list')
}

/**
 * 7.6 清除所有临时封禁
 */
export function clearAllTempBlocks() {
  return http.post('/admin/tempblock/clear-all')
}

/**
 * 7.6 清除特定IP的临时封禁
 */
export function clearTempBlock(ip: string) {
  return http.post('/admin/tempblock/clear', { ip })
}

// ==========================================
// 7.7 图片管理
// ==========================================

/** 图片详情 */
export interface AdminImageDetail {
  pid: number
  p: number
  uid: number
  title: string
  author: string
  r18: number
  width: number
  height: number
  ext: string
  aiType: number
  uploadDate: number
  urlOriginal?: string
  tags: string[]
}

/**
 * 7.7 查看图片详情
 */
export function fetchAdminImageInfo(pid: number, p: number = 0) {
  return http.get<AdminImageDetail>('/admin/image/info', {
    params: { pid, p },
  })
}

// ==========================================
// 7.8 图片审核
// ==========================================

export interface ImageAuditListDTO {
  id: number // 图片ID（用于提交审核）
  pid: number
  p: number
  uid: number
  title: string
  author: string
  r18: number // 0=非R18 1=R18
  width: number
  height: number
  ext: string // jpg/png
  aiType: number // 0=未知 1=不是AI 2=是AI
  uploadDate: number // 毫秒时间戳
  urlOriginal: string // 原图URL

  // 最近一次审核信息（可能为 null）
  lastAuditStatus: number | null // 1=正常 2=有问题
  lastAuditRemark: string | null // 上次备注
  lastAuditTime: string | null // 上次审核时间
  lastAuditAdminEmail: string | null // 上次审核管理员
}

export interface PageResult<T> {
  total: number
  page: number
  pageSize: number
  list: T[]
}

export interface ImageAuditSubmitDTO {
  imageId: number // 图片ID
  status: number // 1=正常 2=有问题
  remark?: string // 问题描述（status=2 时必填）
}

/**
 * 7.8 获取待审核列表
 */
export function fetchImageAuditList(page: number = 1, pageSize: number = 20) {
  return http.get<PageResult<ImageAuditListDTO>>('/admin/image-audit/list', {
    params: { page, pageSize },
  })
}

/**
 * 7.8 提交审核结果
 */
export function submitImageAuditResult(data: ImageAuditSubmitDTO) {
  return http.post<string>('/admin/image-audit/submit', data)
}
