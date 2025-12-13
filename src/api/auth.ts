// src/api/auth.ts
import http from './http'

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  await http.post('/auth/forgot-password', payload)
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  await http.post('/auth/reset-password', payload)
}
export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  role: number
  email?: string
  userId?: number
  avatarUrl?: string   // ✅ 新增
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await http.post('/auth/login', payload)
  return res.data
}

export interface RegisterPayload {
  email: string
  password: string
  // 如果后端还有 username / nickname 之类再加，这里先最简
}

export async function register(payload: RegisterPayload): Promise<void> {
  await http.post('/auth/register', payload)
  // 后端一般返回 "ok" / 200 即可，这里不需要解析 data
}

