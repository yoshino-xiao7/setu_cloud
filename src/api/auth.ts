// src/api/auth.ts
import http from './http'
import { unwrapApiData } from './response'

export interface CaptchaResponse {
  uuid: string
  img: string
}

export async function fetchCaptcha(): Promise<CaptchaResponse | null> {
  const res = await http.get('/auth/captcha')
  return unwrapApiData<CaptchaResponse | null>(res, null)
}

// ==========================================
// 1. 找回密码 (发送邮件)
// ==========================================
export interface ForgotPasswordRequest {
  email: string
  captchaCode: string
  captchaUuid: string
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  await http.post('/auth/forgot-password', payload)
}

// ==========================================
// 2. 重置密码 (提交新密码)
// ==========================================
export interface ResetPasswordRequest {
  token: string
  newPassword: string
  // 如果你在“重置密码页”也加了验证码，请把下面两行注释解开
  // captchaCode: string
  // captchaUuid: string
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  await http.post('/auth/reset-password', payload)
}

// ==========================================
// 3. 登录
// ==========================================
export interface LoginPayload {
  email: string
  password: string
  captchaCode: string
  captchaUuid: string
}

export interface LoginResponse {
  token: string
  role: number
  email?: string
  userId?: number
  avatarUrl?: string
  signSecret: string
  // 根据后端返回的 LoginResponse 补全类型
  expireAt?: number
  lastLoginIp?: string
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await http.post('/auth/login', payload)
  return unwrapApiData<LoginResponse>(res)
}

// ==========================================
// 4. 注册
// ==========================================
export interface RegisterPayload {
  email: string
  password: string
  captchaCode: string
  captchaUuid: string
}

export async function register(payload: RegisterPayload): Promise<void> {
  await http.post('/auth/register', payload)
}
