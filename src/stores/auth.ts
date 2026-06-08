// src/stores/auth.ts
import { defineStore } from 'pinia'
import http from '@/api/http'
import { unwrapApiData } from '@/api/response'
import { readLocalStorageJson } from '@/composables/useLocalStorageJson'

const SIGN_SECRET_KEY = 'signSecret'
const AUTH_EXPIRE_AT_KEY = 'authExpireAt'

function normalizeExpireAt(value?: number | null) {
  if (!value)
    return null
  return value < 1_000_000_000_000 ? value * 1000 : value
}

/** 用户角色 */
export const UserRole = {
  User: 0,
  Admin: 1,
} as const

export type UserRole = number

interface UserInfo {
  id: number
  email: string
  role: UserRole
  lastLoginIp?: string
  nickname?: string
}

interface AuthState {
  user: UserInfo | null
  avatarUrl: string | null
  expireAt: number | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: readLocalStorageJson<UserInfo | null>('user', null),
    avatarUrl: localStorage.getItem('avatarUrl')
      ? (localStorage.getItem('avatarUrl') as string)
      : null,
    expireAt: normalizeExpireAt(Number(localStorage.getItem(AUTH_EXPIRE_AT_KEY)) || null),
  }),
  actions: {
    // 登录逻辑
    async login(email: string, password: string, captchaCode: string, captchaUuid: string) {
      // 🔥 登录前先清空旧数据
      this.clearLocalState()

      // 发送请求
      const res = await http.post('/auth/login', {
        email,
        password,
        captchaCode,
        captchaUuid
      })

      // 兼容处理：http.ts 可能返回 res.data 也可能直接返回 res
      const data = unwrapApiData<{
        token: string
        userId: number
        role: UserRole
        expireAt?: number
        avatarUrl?: string | null
        lastLoginIp?: string | null
        signSecret: string // ✅ 新增：请求签名密钥
      }>(res)

      if (!data.signSecret) {
        throw new Error('登录响应缺少请求签名密钥')
      }

      // ✅ 保存签名密钥到 sessionStorage（标签页关闭后自动清除，比 localStorage 更安全）
      sessionStorage.setItem(SIGN_SECRET_KEY, data.signSecret)

      const expireAt = normalizeExpireAt(data.expireAt)
      if (expireAt) {
        localStorage.setItem(AUTH_EXPIRE_AT_KEY, String(expireAt))
      }
      else {
        localStorage.removeItem(AUTH_EXPIRE_AT_KEY)
      }

      // ✅ Token 已自动存入 HttpOnly Cookie，无需手动存储
      // 只保存用于 UI 显示的用户信息
      const userInfo: UserInfo = {
        id: data.userId,
        email,
        role: data.role,
        lastLoginIp: data.lastLoginIp || undefined,
      }

      localStorage.setItem('user', JSON.stringify(userInfo))

      // 头像处理
      if (data.avatarUrl) {
        localStorage.setItem('avatarUrl', data.avatarUrl)
      }
      else {
        localStorage.removeItem('avatarUrl')
      }

      // 更新 Pinia state
      this.user = userInfo
      this.avatarUrl = data.avatarUrl || null
      this.expireAt = expireAt
    },

    // ✅ 退出登录 - 调用后端接口清除 Cookie
    async logout() {
      try {
        await http.post('/auth/logout')
      }
      catch {}
      this.clearLocalState()
    },

    // ✅ 仅清除本地状态（用于 401 响应时，避免循环调用 API）
    clearLocalState() {
      this.user = null
      this.avatarUrl = null
      this.expireAt = null
      localStorage.removeItem('user')
      localStorage.removeItem('avatarUrl')
      localStorage.removeItem(AUTH_EXPIRE_AT_KEY)
      sessionStorage.removeItem(SIGN_SECRET_KEY) // ✅ 清除签名密钥（sessionStorage）
    },

    hasSessionSignature() {
      return !!sessionStorage.getItem(SIGN_SECRET_KEY)
    },

    isLocalSessionExpired() {
      return !!this.expireAt && Date.now() >= this.expireAt
    },

    canRefreshLocalSession() {
      return !!this.user && !this.isLocalSessionExpired()
    },

    hasValidLocalSession() {
      return !!this.user && this.hasSessionSignature() && !this.isLocalSessionExpired()
    },

    async refreshSignature(): Promise<boolean> {
      if (!this.canRefreshLocalSession()) {
        this.clearLocalState()
        return false
      }

      try {
        const res = await http.post('/auth/refresh-signature')
        const data = unwrapApiData<{ signSecret?: string, expireAt?: number } | null>(res, null)

        if (!data?.signSecret) {
          throw new Error('刷新签名响应缺少 signSecret')
        }

        sessionStorage.setItem(SIGN_SECRET_KEY, data.signSecret)

        const expireAt = normalizeExpireAt(data.expireAt)
        if (expireAt) {
          this.expireAt = expireAt
          localStorage.setItem(AUTH_EXPIRE_AT_KEY, String(expireAt))
        }

        return true
      }
      catch {
        this.clearLocalState()
        return false
      }
    },

    updateAvatar(url: string) {
      this.avatarUrl = url
      localStorage.setItem('avatarUrl', url)
    },
  },
})
