// src/api/http.ts
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { API_BASE_URL, USE_API_MOCKS } from '@/api/env'
import { cloneCachedResponseData } from '@/api/httpCache'
import { registerRouteAbortHandler } from '@/api/requestLifecycle'
import { getRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { safeReplace } from '@/utils/navigation'

const defaultAdapter = axios.getAdapter(axios.defaults.adapter)

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // ✅ 增加到 30 秒，适应网易云API代理
  withCredentials: true, // ✅ 关键配置：携带 HttpOnly Cookie
  adapter: defaultAdapter,
  validateStatus: (status) => {
    return (status >= 200 && status < 300) || status === 304
  },
})

// 开发环境 mock 适配器：动态 import 避免打入生产包。
// 首个请求会等待这里完成，避免测试或本地操作过快时先打到 mock.local。
const mockAdapterReady: Promise<void> = USE_API_MOCKS
  ? import('../../mocks/api-mock').then(({ createMockAdapter }) => {
      http.defaults.adapter = createMockAdapter(defaultAdapter)
    })
  : Promise.resolve()

// ================================================================
// ✅ GET 请求内存缓存：仅缓存明确安全的公开读接口
// ================================================================
const PUBLIC_CACHE_TTL = 60_000
const getCache = new Map<string, { data: AxiosResponse, expiry: number }>()
let musicCacheGeneration = 0
const musicCacheRequests = new WeakMap<InternalAxiosRequestConfig, { key: string, generation: number, owner: string, hit?: boolean }>()
const musicReadPath = /^\/user\/music\/v2\/(?:home|rankings|search|library(?:\/(?:liked-tracks|favorite-playlists))?|playlists\/[^/]+(?:\/tracks)?|tracks\/[^/]+\/lyrics)$/
const musicOwner = () => String(useAuthStore().user?.id ?? 'anonymous')
const publicCollectionPathPattern = /^\/collections\/\d+(?:\/items)?$/

function getRequestPath(url?: string, baseURL?: string) {
  try {
    return new URL(url || '', baseURL || window.location.origin).pathname
  }
  catch {
    return url || ''
  }
}

function getCacheTtl(method: string, url?: string, baseURL?: string) {
  if (method !== 'get') {
    return 0
  }

  const path = getRequestPath(url, baseURL)
  if (musicReadPath.test(path)) return PUBLIC_CACHE_TTL
  if (publicCollectionPathPattern.test(path)) {
    return PUBLIC_CACHE_TTL
  }

  // 广场列表在登录态会包含 isLiked/isFavorited，只有未登录访问时缓存。
  if (path === '/square/collections' && !useAuthStore().user) {
    return PUBLIC_CACHE_TTL
  }

  return 0
}

function shouldCacheRequest(method: string, url?: string, baseURL?: string) {
  return getCacheTtl(method, url, baseURL) > 0
}

function getCacheKey(config: InternalAxiosRequestConfig) {
  try {
    const url = new URL(config.url || '', config.baseURL || window.location.origin)
    // ✅ 合并 config.params 到缓存 key，区分不同分页/筛选条件的请求
    if (config.params) {
      const params = config.params instanceof URLSearchParams
        ? config.params
        : new URLSearchParams(
            Object.entries(config.params as Record<string, unknown>)
              .filter(([, value]) => value != null)
              .map(([key, value]) => [key, String(value)]),
          )
      params.sort()
      const qs = params.toString()
      return url.pathname + (qs ? `?${qs}` : '')
    }
    return url.pathname + url.search
  }
  catch {
    return `${config.url}`
  }
}

/** ✅ 清除全部 GET 缓存（登出、会话过期、写请求后调用） */
export const clearHttpCache = () => { musicCacheGeneration++; getCache.clear() }

// ================================================================
// ✅ AbortController：取消过期 / 重复请求
// ================================================================
const pendingRequests = new Map<string, AbortController>()
let getReqCounter = 0

/** ✅ 取消所有进行中的请求（路由切换完成后调用） */
function abortPendingRequests() {
  pendingRequests.forEach((ctrl, key) => {
    // ✅ 跳过认证相关请求，避免误杀 refreshSignature 等关键请求
    if (key.startsWith('post:/auth/') || key.startsWith('get:/auth/')) {
      return
    }
    ctrl.abort()
    pendingRequests.delete(key)
  })
}

registerRouteAbortHandler(abortPendingRequests)

// 4. 防抖锁：防止多个请求同时 401 导致弹出多个提示窗口
let isRelogin = false

const SIGNATURE_OPTIONAL_PATH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/captcha',
  '/auth/forgot-password',
  '/auth/passkeys',
  '/auth/reset-password',
  '/auth/refresh-signature',
]

type SignatureRetryConfig = InternalAxiosRequestConfig & {
  _signatureRetry?: boolean
  _pendingKey?: string
}

interface TraceableBusinessError {
  traceId?: string
  traceID?: string
  trace_id?: string
  data?: unknown
}

type ResponseHeaders = AxiosResponse['headers'] & {
  get?: (key: string) => string | null | undefined
}

let refreshSignaturePromise: Promise<boolean> | null = null

function isSignatureOptionalRequest(url?: string, baseURL?: string) {
  const path = getRequestPath(url, baseURL)
  return SIGNATURE_OPTIONAL_PATH_PREFIXES.some(prefix => path.startsWith(prefix))
}

function getErrorMessage(error: unknown) {
  const axiosErr = error as AxiosError<{ message?: string, msg?: string }>
  const data = axiosErr.response?.data
  if (typeof data === 'string') {
    return data
  }
  return data?.message || data?.msg || axiosErr.message || ''
}

function createRequestId() {
  if (typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0F) | 0x40
  bytes[8] = (bytes[8] & 0x3F) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

function normalizeTraceId(value: unknown) {
  if (typeof value !== 'string')
    return undefined

  const trimmed = value.trim()
  return trimmed || undefined
}

function getHeaderValue(headers: ResponseHeaders | undefined, key: string) {
  if (!headers)
    return undefined

  const getterValue = typeof headers.get === 'function'
    ? headers.get(key)
    : undefined
  if (getterValue)
    return normalizeTraceId(getterValue)

  const matchedKey = Object.keys(headers).find(item => item.toLowerCase() === key.toLowerCase())
  const value = matchedKey ? headers[matchedKey] : undefined
  if (Array.isArray(value))
    return normalizeTraceId(value[0])
  return normalizeTraceId(value)
}

function getTraceIdFromHeaders(headers?: AxiosResponse['headers']) {
  return getHeaderValue(headers as ResponseHeaders | undefined, 'x-trace-id')
    || getHeaderValue(headers as ResponseHeaders | undefined, 'trace-id')
}

function getTraceIdFromData(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return undefined

  const businessData = data as TraceableBusinessError
  return normalizeTraceId(businessData.traceId)
    || normalizeTraceId(businessData.traceID)
    || normalizeTraceId(businessData.trace_id)
    || getTraceIdFromData(businessData.data)
}

function attachTraceId(data: unknown, traceId?: string) {
  const normalizedTraceId = normalizeTraceId(traceId) || getTraceIdFromData(data)
  if (!normalizedTraceId || !data || typeof data !== 'object' || Array.isArray(data))
    return

  const businessData = data as TraceableBusinessError
  if (!businessData.traceId)
    businessData.traceId = normalizedTraceId
}

function isSignatureError(error: unknown) {
  // 优先使用后端结构化错误码（error 字段，SIGNATURE_* 前缀），关键词匹配仅为旧版回退
  const payload = (error as { response?: { data?: { error?: string } } })?.response?.data
  if (payload?.error?.startsWith('SIGNATURE'))
    return true
  const message = getErrorMessage(error).toLowerCase()
  return message.includes('签名')
    || message.includes('signature')
    || message.includes('x-signature')
    || message.includes('timestamp')
    || message.includes('nonce')
}

function refreshSignatureOnce() {
  const authStore = useAuthStore()
  if (!refreshSignaturePromise) {
    refreshSignaturePromise = authStore.refreshSignature()
      .finally(() => {
        refreshSignaturePromise = null
      })
  }
  return refreshSignaturePromise
}

async function applySignatureHeaders(config: InternalAxiosRequestConfig, signSecret: string) {
  const HmacSHA256 = (await import('crypto-js/hmac-sha256')).default

  const timestamp = Date.now().toString()
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const method = (config.method || 'GET').toUpperCase()
  const uri = new URL(config.url || '', config.baseURL).pathname
  const message = `${timestamp}:${nonce}:${method}:${uri}`
  const signature = HmacSHA256(message, signSecret).toString()

  config.headers['X-Timestamp'] = timestamp
  config.headers['X-Nonce'] = nonce
  config.headers['X-Signature'] = signature
}

// ✅ 安全读取签名密钥：SSG 构建（Node 环境）下 sessionStorage 不存在，降级为 null
function readSignSecret(): string | null {
  try {
    return sessionStorage.getItem('signSecret')
  }
  catch {
    return null
  }
}

// ✅ 通知全局错误处理器：SSG 构建（Node 环境）下无 window，静默跳过
function dispatchGlobalAppError(message: string) {
  if (typeof window === 'undefined')
    return
  window.dispatchEvent(new CustomEvent('global-app-error', {
    detail: { message },
  }))
}

// 统一的处理函数
function handleSessionExpired() {
  if (isRelogin) {
    return
  }
  isRelogin = true

  const authStore = useAuthStore()
  authStore.clearLocalState() // ✅ 只清除本地状态，不调用 API
  clearHttpCache() // ✅ 会话失效时一并清除缓存

  // SSG 构建期间 router 尚未注册，无法执行跳转，直接结束
  let router: ReturnType<typeof getRouter>
  try {
    router = getRouter()
  }
  catch {
    isRelogin = false
    return
  }

  // 🔥 关键修复：防止 redirect 参数无限叠加
  const currentRoute = router.currentRoute.value

  // 1. 如果当前已经在登录页，不再跳转（避免死循环）
  if (currentRoute.path === '/login') {
    isRelogin = false
    return
  }

  // 2. 只保留有效的原始路径（去除已有的 redirect 和 expired 参数）
  let redirectPath = currentRoute.path

  // 如果当前路径有有效的 query 参数（排除 redirect 和 expired），保留它们
  const validQuery = Object.fromEntries(
    Object.entries(currentRoute.query || {}).filter(
      ([key]) => key !== 'redirect' && key !== 'expired',
    ),
  )

  // 拼接 query string（如果有的话）
  if (Object.keys(validQuery).length > 0) {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(validQuery).map(([key, value]) => [key, String(value ?? '')]),
      ),
    ).toString()
    redirectPath = `${redirectPath}?${queryString}`
  }

  console.warn('🚨 [Session Expired] 跳转登录页，原路径:', redirectPath)

  // 3. 使用 nextTick 延迟跳转，避免与正在进行的路由导航/transition 冲突
  // ✅ 同时标记 pending 跳转，防止重复触发
  const pendingRedirect = { path: '/login', query: { redirect: redirectPath, expired: '1' } }
  setTimeout(() => {
    // 再次检查是否已经在登录页（可能在 nextTick 期间其他逻辑已经跳转了）
    if (router.currentRoute.value.path !== '/login') {
      void safeReplace(router, pendingRedirect)
    }
    isRelogin = false
  }, 0)
}

// --- 请求拦截器 ---
http.interceptors.request.use(
  async (config) => {
    if (USE_API_MOCKS)
      await mockAdapterReady

    // ✅ Cookie 自动携带，无需手动设置 Authorization
    if (!config.headers['X-Request-Id'])
      config.headers['X-Request-Id'] = createRequestId()

    // ✅ 请求签名逻辑（仅在登录后生效，动态导入 crypto-js 避免未登录用户加载）
    const signatureOptional = isSignatureOptionalRequest(config.url, config.baseURL)
    let signSecret = readSignSecret()
    if (!signatureOptional && signSecret) {
      await applySignatureHeaders(config, signSecret)
    }
    else if (!signatureOptional) {
      const authStore = useAuthStore()
      if (authStore.user) {
        const refreshed = authStore.canRefreshLocalSession() && await refreshSignatureOnce()
        signSecret = readSignSecret()

        if (refreshed && signSecret) {
          await applySignatureHeaders(config, signSecret)
        }
        else {
          handleSessionExpired()
          return Promise.reject(new axios.CanceledError('Session signature missing'))
        }
      }
    }

    // ================================================================
    // ✅ GET 缓存：命中时直接返回，跳过网络请求
    // ================================================================
    const method = (config.method || 'get').toLowerCase()
    if (shouldCacheRequest(method, config.url, config.baseURL)) {
      const isMusic = musicReadPath.test(getRequestPath(config.url, config.baseURL))
      const cacheKey = (isMusic ? `music:${musicOwner()}:` : '') + getCacheKey(config)
      if (isMusic) musicCacheRequests.set(config, { key: cacheKey, generation: musicCacheGeneration, owner: musicOwner() })
      const cached = getCache.get(cacheKey)
      if (cached && cached.expiry > Date.now()) {
        const musicSnapshot = musicCacheRequests.get(config)
        if (musicSnapshot) musicSnapshot.hit = true
        const cachedReq = cached.data.request
        config.adapter = () => Promise.resolve({
          ...cached.data,
          data: cloneCachedResponseData(cached.data.data),
          config,
          request: cachedReq ?? { fromCache: true },
        })
        return config
      }
      if (cached) {
        getCache.delete(cacheKey)
      }
    }

    // ================================================================
    // ✅ AbortController：为非 GET 请求去重，为所有请求注册可取消信号
    // ================================================================
    const controller = new AbortController()
    let pendingKey: string

    if (method === 'get') {
      // GET 请求用自增 key，允许并发；路由切换时统一取消
      pendingKey = `get:${getReqCounter++}`
    }
    else {
      // 非 GET 请求按 method+path 去重，自动取消上一次同类请求
      const path = getRequestPath(config.url, config.baseURL)
      pendingKey = `${method}:${path}`
      pendingRequests.get(pendingKey)?.abort()

      // 写请求后清空公开读缓存，避免点赞/编辑后短暂读到旧数据
      clearHttpCache()
    }

    config.signal = controller.signal
    pendingRequests.set(pendingKey, controller)
    ;(config as SignatureRetryConfig)._pendingKey = pendingKey

    return config
  },
  error => Promise.reject(error),
)

// --- 响应拦截器 ---
http.interceptors.response.use(
  (response) => {
    const traceId = getTraceIdFromData(response.data) || getTraceIdFromHeaders(response.headers)
    attachTraceId(response.data, traceId)

    // ✅ 清理 pending 标记
    const pendingKey = (response.config as SignatureRetryConfig)?._pendingKey
    if (pendingKey) {
      pendingRequests.delete(pendingKey)
    }

    // ✅ 缓存 GET 响应
    const method = (response.config.method || 'get').toLowerCase()
    const cacheTtl = getCacheTtl(method, response.config.url, response.config.baseURL)
    if (cacheTtl > 0) {
      const snapshot = musicCacheRequests.get(response.config)
      const isMusic = musicReadPath.test(getRequestPath(response.config.url, response.config.baseURL))
      if (isMusic && (!snapshot || snapshot.generation !== musicCacheGeneration || snapshot.owner !== musicOwner() || snapshot.hit)) return response
      const cacheKey = snapshot?.key ?? getCacheKey(response.config)
      getCache.set(cacheKey, {
        data: {
          ...response,
          data: cloneCachedResponseData(response.data),
        },
        expiry: Date.now() + cacheTtl,
      })
    }

    return response
  },
  async (error) => {
    // ✅ 清理 pending 标记（被主动 abort 的请求静默丢弃）
    const pendingKey = (error.config as SignatureRetryConfig)?._pendingKey
    if (pendingKey) {
      pendingRequests.delete(pendingKey)
    }

    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (error.response) {
      const traceId = getTraceIdFromData(error.response.data) || getTraceIdFromHeaders(error.response.headers)
      attachTraceId(error.response.data, traceId)
      if (traceId) {
        const traceableError = error as AxiosError & TraceableBusinessError
        traceableError.traceId = traceId
      }

      const status = error.response.status
      const originalConfig = error.config as SignatureRetryConfig | undefined

      if ((status === 400 || status === 401 || status === 403) && isSignatureError(error)) {
        if (
          originalConfig
          && !originalConfig._signatureRetry
          && !isSignatureOptionalRequest(originalConfig.url, originalConfig.baseURL)
        ) {
          const authStore = useAuthStore()
          originalConfig._signatureRetry = true

          if (authStore.canRefreshLocalSession() && await refreshSignatureOnce()) {
            return http(originalConfig)
          }
        }

        handleSessionExpired()
        return Promise.reject(error)
      }

      switch (status) {
        case 401:
          handleSessionExpired()
          break
        case 403:
          console.warn(`[HTTP 403] 无权限访问: ${error.config?.url}`)
          break
        case 429:
          console.warn(`[HTTP 429] 请求过于频繁: ${error.config?.url}`)
          break
        default:
          if (status >= 500) {
            console.error(`[HTTP ${status}] 服务端错误: ${error.config?.url}`)
            // 通过自定义事件通知全局错误处理器
            dispatchGlobalAppError('服务暂时不可用，请稍后重试')
          }
          break
      }
    }
    else if (error.code === 'ECONNABORTED') {
      console.error(`[HTTP Timeout] 请求超时: ${error.config?.url}`)
      dispatchGlobalAppError('请求超时，请检查网络后重试')
    }
    else if (!error.response) {
      console.error(`[HTTP Network] 网络错误: ${error.config?.url}`)
      dispatchGlobalAppError('网络连接失败，请检查网络设置')
    }

    return Promise.reject(error)
  },
)

export default http
