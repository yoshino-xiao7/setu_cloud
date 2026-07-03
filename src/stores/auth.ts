// src/stores/auth.ts
import type { PublicKeyCredentialWithAssertionJSON } from '@github/webauthn-json'
import { defineStore } from 'pinia'
import http from '@/api/http'
import { finishPasskeyAuthentication } from '@/api/passkey'
import { unwrapApiData } from '@/api/response'
import { readLocalStorageJson } from '@/composables/useLocalStorageJson'

const SIGN_SECRET_KEY = 'signSecret'
const AUTH_EXPIRE_AT_KEY = 'authExpireAt'
let refreshSignaturePromise: Promise<boolean> | null = null

function normalizeExpireAt(value?: number | null) {
  if (!value)
    return null
  return value < 1_000_000_000_000 ? value * 1000 : value
}

/** 用户角色 */
export enum UserRole {
  User = 0,
  Admin = 1,
}

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

// ✅ 安全读取 localStorage，防止隐私模式下 storage 不可用导致初始化崩溃
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  }
  catch {
    return null
  }
}

function safeRemoveLocalItem(key: string) {
  try {
    localStorage.removeItem(key)
  }
  catch {}
}

function safeRemoveSessionItem(key: string) {
  try {
    sessionStorage.removeItem(key)
  }
  catch {}
}

function safeHasSessionItem(key: string) {
  try {
    return !!sessionStorage.getItem(key)
  }
  catch {
    return false
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: readLocalStorageJson<UserInfo | null>('user', null),
    avatarUrl: safeGetItem('avatarUrl'),
    expireAt: normalizeExpireAt(Number(safeGetItem(AUTH_EXPIRE_AT_KEY)) || null),
  }),
  actions: {
    persistSessionSecret(data: { signSecret: string, expireAt?: number }) {
      if (!data.signSecret)
        throw new Error('登录响应缺少请求签名密钥')

      try {
        sessionStorage.setItem(SIGN_SECRET_KEY, data.signSecret)
      }
      catch {}

      const expireAt = normalizeExpireAt(data.expireAt)
      this.expireAt = expireAt
      try {
        if (expireAt) {
          localStorage.setItem(AUTH_EXPIRE_AT_KEY, String(expireAt))
        }
        else {
          localStorage.removeItem(AUTH_EXPIRE_AT_KEY)
        }
      }
      catch {}
    },

    persistUserState(userInfo: UserInfo, avatarUrl?: string | null) {
      try {
        localStorage.setItem('user', JSON.stringify(userInfo))
      }
      catch {}

      try {
        if (avatarUrl) {
          localStorage.setItem('avatarUrl', avatarUrl)
        }
        else {
          localStorage.removeItem('avatarUrl')
        }
      }
      catch {}

      this.user = userInfo
      this.avatarUrl = avatarUrl || null
    },

    // 登录逻辑
    async login(email: string, password: string, captchaCode: string, captchaUuid: string) {
      // 🔥 登录前先清空旧数据
      this.clearLocalState()

      // 发送请求
      const res = await http.post('/auth/login', {
        email,
        password,
        captchaCode,
        captchaUuid,
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

      this.persistSessionSecret(data)

      // ✅ Token 已自动存入 HttpOnly Cookie，无需手动存储
      // 只保存用于 UI 显示的用户信息
      const userInfo: UserInfo = {
        id: data.userId,
        email,
        role: data.role,
        lastLoginIp: data.lastLoginIp || undefined,
      }

      this.persistUserState(userInfo, data.avatarUrl || null)
    },

    async loginWithPasskey(challengeId: string, credential: PublicKeyCredentialWithAssertionJSON) {
      this.clearLocalState()

      try {
        const data = await finishPasskeyAuthentication({
          challengeId,
          credential,
        })
        this.persistSessionSecret(data)

        const profileRes = await http.get('/user/info')
        const profile = unwrapApiData<{
          id: number
          email: string
          role: UserRole
          avatarUrl?: string | null
          lastLoginIp?: string | null
          nickname?: string | null
        }>(profileRes)

        this.persistUserState({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          lastLoginIp: profile.lastLoginIp || data.lastLoginIp || undefined,
          nickname: profile.nickname || undefined,
        }, profile.avatarUrl || data.avatarUrl || null)
      }
      catch (error) {
        this.clearLocalState()
        throw error
      }
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
      safeRemoveLocalItem('user')
      safeRemoveLocalItem('avatarUrl')
      safeRemoveLocalItem(AUTH_EXPIRE_AT_KEY)
      safeRemoveSessionItem(SIGN_SECRET_KEY) // ✅ 清除签名密钥（sessionStorage）
    },

    hasSessionSignature() {
      return safeHasSessionItem(SIGN_SECRET_KEY)
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

    refreshSignature(): Promise<boolean> {
      if (refreshSignaturePromise)
        return refreshSignaturePromise

      refreshSignaturePromise = (async () => {
        if (!this.canRefreshLocalSession()) {
          this.clearLocalState()
          return false
        }

        const userId = this.user?.id

        try {
          const res = await http.post('/auth/refresh-signature')
          const data = unwrapApiData<{ signSecret?: string, expireAt?: number } | null>(res, null)

          if (!data?.signSecret) {
            throw new Error('刷新签名响应缺少 signSecret')
          }

          if (!this.user || this.user.id !== userId) {
            return false
          }

          // ✅ 单独 try-catch 防止 storage 异常误触发 clearLocalState
          try {
            sessionStorage.setItem(SIGN_SECRET_KEY, data.signSecret)
          }
          catch {}

          const expireAt = normalizeExpireAt(data.expireAt)
          if (expireAt) {
            this.expireAt = expireAt
            try {
              localStorage.setItem(AUTH_EXPIRE_AT_KEY, String(expireAt))
            }
            catch {}
          }

          return true
        }
        catch {
          this.clearLocalState()
          return false
        }
      })().finally(() => {
        refreshSignaturePromise = null
      })

      return refreshSignaturePromise
    },

    updateAvatar(url: string) {
      this.avatarUrl = url
      try {
        localStorage.setItem('avatarUrl', url)
      }
      catch {}
    },
  },
})
