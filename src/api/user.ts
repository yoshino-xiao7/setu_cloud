// src/api/user.ts
import http from '@/api/http'
import { unwrapApiData } from '@/api/response'

/**
 * 用户个人信息的数据结构
 * 对应后端 UserProfileDTO
 */
export interface UserProfile {
  id: number
  email: string
  nickname: string | null
  avatarUrl: string | null
  role: number
  createdAt: string
  lastLoginIp?: string
}

export interface UserQqBinding {
  qqNumber?: string | null
  enabled?: boolean
  updatedAt?: string | null
}

/**
 * 获取当前登录用户的完整信息 (包含昵称、注册时间等)
 * GET /user/info
 */
export async function getUserInfo(): Promise<UserProfile> {
  const res = await http.get('/user/info')
  return unwrapApiData<UserProfile>(res)
}

/**
 * 修改用户昵称
 * POST /user/profile/nickname
 */
export async function updateNickname(nickname: string) {
  return http.post('/user/profile/nickname', { nickname })
}

/**
 * 上传头像文件，后端返回形如：
 * { avatarUrl: "http://localhost:9898/avatars/xxx.jpg" }
 */
export async function uploadAvatarFile(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)

  // 注意：这里你的后端接口地址可能需要根据实际情况调整
  // 如果你的后端 UserController 里没写上传头像的方法，可能还是走原来的接口
  const res = await http.post('/user/profile/avatar-file', formData)
  return unwrapApiData<{ avatarUrl: string }>(res)
}

export function fetchQqBinding() {
  return http.get<UserQqBinding>('/user/qq-binding')
}

export function saveQqBinding(data: { qqNumber: string }) {
  return http.post<UserQqBinding>('/user/qq-binding', data)
}

export function disableQqBinding() {
  return http.delete<UserQqBinding>('/user/qq-binding')
}

/**
 * 修改密码
 */
export async function changePassword(oldPassword: string, newPassword: string) {
  await http.post('/auth/change-password', {
    oldPassword,
    newPassword,
  })
}
