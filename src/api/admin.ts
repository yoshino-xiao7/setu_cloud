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
  status?: number   // 1=正常, 0=封禁
  role?: number     // 0=普通用户, 1=管理员
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
export const fetchAdminBlogStats = () => {
  return http.get<AdminBlogStats>('/admin/blog/stats')
}

/**
 * 7.2 获取用户列表
 */
export const fetchAdminUserList = (params: UserQueryParams) => {
  return http.get<AdminUserListResponse>('/admin/users', {
    params
  })
}

/**
 * 7.3 获取单个用户详情（含 API Key）
 * @param id 用户ID
 */
export const fetchAdminUserDetail = (id: number) => {
  return http.get<AdminUserDetail>(`/admin/users/${id}`)
}

/**
 * 7.4 封禁用户
 * 注意：文档要求 userId 放在 query 参数中 (?userId={id})
 */
export const banUser = (userId: number) => {
  // POST 请求，body 为 null，参数放 params
  return http.post('/admin/user/ban', null, {
    params: { userId }
  })
}

/**
 * 7.4 解封用户
 */
export const unbanUser = (userId: number) => {
  return http.post('/admin/user/unban', null, {
    params: { userId }
  })
}

/**
 * 7.5 获取黑名单 IP 列表
 */
export const fetchIpBlacklist = () => {
  return http.get<BlacklistIpItem[]>('/admin/blacklist/ip')
}

/**
 * 7.5 添加 IP 到黑名单
 */
export const addIpBlacklist = (ip: string, reason: string) => {
  return http.post('/admin/blacklist/ip/add', {
    ip,
    reason
  })
}

/**
 * 7.5 移除黑名单 IP
 */
export const removeIpBlacklist = (ip: string) => {
  return http.post('/admin/blacklist/ip/remove', {
    ip
  })
}