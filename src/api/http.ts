// src/api/http.ts
import axios, { type AxiosError, type AxiosResponse } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import { API_BASE_URL, USE_API_MOCKS } from '@/api/env';

const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // ✅ 增加到 30 秒，适应网易云API代理
  withCredentials: true, // ✅ 关键配置：携带 HttpOnly Cookie
  adapter: defaultAdapter,
  validateStatus: (status) => {
    return (status >= 200 && status < 300) || status === 304;
  },
});

// 开发环境 mock 适配器：动态 import 避免打入生产包
if (USE_API_MOCKS) {
  import('@/api/mock').then(({ createMockAdapter }) => {
    http.defaults.adapter = createMockAdapter(defaultAdapter);
  });
}

// ================================================================
// ✅ GET 请求内存缓存：减少不必要的网络往返
// ================================================================
const DEFAULT_CACHE_TTL = 60_000; // 60 秒
const getCache = new Map<string, { data: AxiosResponse; expiry: number }>();

// 这些路径前缀永远不走缓存（实时性要求高）
const CACHE_SKIP_PREFIXES = ['/auth/captcha', '/auth/refresh'];

const shouldCacheRequest = (method: string, url?: string, baseURL?: string) => {
  if (method !== 'get') return false;
  const path = getRequestPath(url, baseURL);
  return !CACHE_SKIP_PREFIXES.some(p => path.startsWith(p));
};

const getCacheKey = (config: InternalAxiosRequestConfig) => {
  try {
    const url = new URL(config.url || '', config.baseURL || window.location.origin);
    return url.pathname + url.search;
  } catch {
    return `${config.url}`;
  }
};

/** ✅ 清除全部 GET 缓存（登出、会话过期时调用） */
export const clearHttpCache = () => getCache.clear();

// ================================================================
// ✅ AbortController：取消过期 / 重复请求
// ================================================================
const pendingRequests = new Map<string, AbortController>();
let getReqCounter = 0;

/** ✅ 取消所有进行中的请求（路由切换时调用） */
export const abortPendingRequests = () => {
  pendingRequests.forEach(ctrl => ctrl.abort());
  pendingRequests.clear();
};

// ✅ 路由切换时自动取消上一页面遗留的请求
router.beforeEach(() => { abortPendingRequests(); });

// 4. 防抖锁：防止多个请求同时 401 导致弹出多个提示窗口
let isRelogin = false;

const SIGNATURE_OPTIONAL_PATH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/captcha',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh-signature'
];

type SignatureRetryConfig = InternalAxiosRequestConfig & {
  _signatureRetry?: boolean;
  _pendingKey?: string;
};

let refreshSignaturePromise: Promise<boolean> | null = null;

const getRequestPath = (url?: string, baseURL?: string) => {
  try {
    return new URL(url || '', baseURL || window.location.origin).pathname;
  } catch {
    return url || '';
  }
};

const isSignatureOptionalRequest = (url?: string, baseURL?: string) => {
  const path = getRequestPath(url, baseURL);
  return SIGNATURE_OPTIONAL_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
};

const getErrorMessage = (error: unknown) => {
  const axiosErr = error as AxiosError<{ message?: string; msg?: string }>;
  const data = axiosErr.response?.data;
  if (typeof data === 'string') return data;
  return data?.message || data?.msg || axiosErr.message || '';
};

const isSignatureError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('签名') ||
    message.includes('signature') ||
    message.includes('x-signature') ||
    message.includes('timestamp') ||
    message.includes('nonce');
};

const refreshSignatureOnce = () => {
  const authStore = useAuthStore();
  if (!refreshSignaturePromise) {
    refreshSignaturePromise = authStore.refreshSignature()
      .finally(() => {
        refreshSignaturePromise = null;
      });
  }
  return refreshSignaturePromise;
};

const applySignatureHeaders = async (config: InternalAxiosRequestConfig, signSecret: string) => {
  const HmacSHA256 = (await import('crypto-js/hmac-sha256')).default;

  const timestamp = Date.now().toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const method = (config.method || 'GET').toUpperCase();
  const uri = new URL(config.url || '', config.baseURL).pathname;
  const message = `${timestamp}:${nonce}:${method}:${uri}`;
  const signature = HmacSHA256(message, signSecret).toString();

  config.headers['X-Timestamp'] = timestamp;
  config.headers['X-Nonce'] = nonce;
  config.headers['X-Signature'] = signature;
};

// 统一的处理函数
const handleSessionExpired = () => {
  if (isRelogin) return;
  isRelogin = true;

  const authStore = useAuthStore();
  authStore.clearLocalState(); // ✅ 只清除本地状态，不调用 API
  clearHttpCache(); // ✅ 会话失效时一并清除缓存

  // 🔥 关键修复：防止 redirect 参数无限叠加
  const currentRoute = router.currentRoute.value;

  // 1. 如果当前已经在登录页，不再跳转（避免死循环）
  if (currentRoute.path === '/login') {
    isRelogin = false;
    return;
  }

  // 2. 只保留有效的原始路径（去除已有的 redirect 和 expired 参数）
  let redirectPath = currentRoute.path;

  // 如果当前路径有有效的 query 参数（排除 redirect 和 expired），保留它们
  const validQuery = Object.fromEntries(
    Object.entries(currentRoute.query || {}).filter(
      ([key]) => key !== 'redirect' && key !== 'expired'
    )
  );

  // 拼接 query string（如果有的话）
  if (Object.keys(validQuery).length > 0) {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(validQuery).map(([k, v]) => [k, String(v ?? '')])
      )
    ).toString();
    redirectPath = `${redirectPath}?${queryString}`;
  }

  console.warn('🚨 [Session Expired] 跳转登录页，原路径:', redirectPath);

  // 3. 使用 nextTick 延迟跳转，避免与正在进行的路由导航/transition 冲突
  // ✅ 同时标记 pending 跳转，防止重复触发
  const pendingRedirect = { path: '/login', query: { redirect: redirectPath, expired: '1' } };
  setTimeout(() => {
    // 再次检查是否已经在登录页（可能在 nextTick 期间其他逻辑已经跳转了）
    if (router.currentRoute.value.path !== '/login') {
      router.replace(pendingRedirect);
    }
    isRelogin = false;
  }, 0);
};

// --- 请求拦截器 ---
http.interceptors.request.use(
  async (config) => {
    // ✅ Cookie 自动携带，无需手动设置 Authorization

    // ✅ 请求签名逻辑（仅在登录后生效，动态导入 crypto-js 避免未登录用户加载）
    let signSecret = sessionStorage.getItem('signSecret');
    if (signSecret) {
      await applySignatureHeaders(config, signSecret);
    } else if (!isSignatureOptionalRequest(config.url, config.baseURL)) {
      const authStore = useAuthStore();
      if (authStore.user) {
        const refreshed = authStore.canRefreshLocalSession() && await refreshSignatureOnce();
        signSecret = sessionStorage.getItem('signSecret');

        if (refreshed && signSecret) {
          await applySignatureHeaders(config, signSecret);
        } else {
          handleSessionExpired();
          return Promise.reject(new axios.CanceledError('Session signature missing'));
        }
      }
    }

    // ================================================================
    // ✅ GET 缓存：命中时直接返回，跳过网络请求
    // ================================================================
    const method = (config.method || 'get').toLowerCase();
    if (shouldCacheRequest(method, config.url, config.baseURL)) {
      const cacheKey = getCacheKey(config);
      const cached = getCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        // 通过一个空 adapter 直接返回缓存，跳过真实网络请求
        const cachedReq = cached.data.request;
        config.adapter = () => Promise.resolve({
          ...cached.data,
          data: { ...cached.data.data }, // ✅ 浅拷贝防止共享可变引用
          config,
          request: cachedReq ?? { fromCache: true },
        });
        return config;
      }
      // 缓存过期，清理
      if (cached) getCache.delete(cacheKey);
    }

    // ================================================================
    // ✅ AbortController：为非 GET 请求去重，为所有请求注册可取消信号
    // ================================================================
    const controller = new AbortController();
    let pendingKey: string;

    if (method === 'get') {
      // GET 请求用自增 key，允许并发；路由切换时统一取消
      pendingKey = `get:${getReqCounter++}`;
    } else {
      // 非 GET 请求按 method+path 去重，自动取消上一次同类请求
      const path = getRequestPath(config.url, config.baseURL);
      pendingKey = `${method}:${path}`;
      pendingRequests.get(pendingKey)?.abort();

      // ✅ 写操作：按路径段精确清理相关 GET 缓存（避免 /user 误清 /user-profile）
      const basePath = path.replace(/\/\d+$/, '');
      for (const [key] of getCache) {
        if (key === basePath || key.startsWith(basePath + '/') || key.startsWith(basePath + '?')) {
          getCache.delete(key);
        }
      }
    }

    config.signal = controller.signal;
    pendingRequests.set(pendingKey, controller);
    (config as SignatureRetryConfig)._pendingKey = pendingKey;

    return config;
  },
  (error) => Promise.reject(error)
);

// --- 响应拦截器 ---
http.interceptors.response.use(
  (response) => {
    // ✅ 清理 pending 标记
    const pendingKey = (response.config as SignatureRetryConfig)?._pendingKey;
    if (pendingKey) pendingRequests.delete(pendingKey);

    // ✅ 缓存 GET 响应
    const method = (response.config.method || 'get').toLowerCase();
    if (method === 'get' && shouldCacheRequest(method, response.config.url, response.config.baseURL)) {
      const cacheKey = getCacheKey(response.config);
      getCache.set(cacheKey, {
        data: response,
        expiry: Date.now() + DEFAULT_CACHE_TTL,
      });
    }

    return response;
  },
  async (error) => {
    // ✅ 清理 pending 标记（被主动 abort 的请求静默丢弃）
    const pendingKey = (error.config as SignatureRetryConfig)?._pendingKey;
    if (pendingKey) pendingRequests.delete(pendingKey);

    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (error.response) {
      const status = error.response.status;
      const originalConfig = error.config as SignatureRetryConfig | undefined;

      if ((status === 400 || status === 401 || status === 403) && isSignatureError(error)) {
        if (
          originalConfig &&
          !originalConfig._signatureRetry &&
          !isSignatureOptionalRequest(originalConfig.url, originalConfig.baseURL)
        ) {
          const authStore = useAuthStore();
          originalConfig._signatureRetry = true;

          if (authStore.canRefreshLocalSession() && await refreshSignatureOnce()) {
            return http(originalConfig);
          }
        }

        handleSessionExpired();
        return Promise.reject(error);
      }

      switch (status) {
        case 401:
          handleSessionExpired();
          break;
        case 403:
          console.warn(`[HTTP 403] 无权限访问: ${error.config?.url}`);
          break;
        case 429:
          console.warn(`[HTTP 429] 请求过于频繁: ${error.config?.url}`);
          break;
        default:
          if (status >= 500) {
            console.error(`[HTTP ${status}] 服务端错误: ${error.config?.url}`);
            // 通过自定义事件通知全局错误处理器
            window.dispatchEvent(new CustomEvent('global-app-error', {
              detail: { message: '服务暂时不可用，请稍后重试' }
            }));
          }
          break;
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[HTTP Timeout] 请求超时: ${error.config?.url}`);
      window.dispatchEvent(new CustomEvent('global-app-error', {
        detail: { message: '请求超时，请检查网络后重试' }
      }));
    } else if (!error.response) {
      console.error(`[HTTP Network] 网络错误: ${error.config?.url}`);
      window.dispatchEvent(new CustomEvent('global-app-error', {
        detail: { message: '网络连接失败，请检查网络设置' }
      }));
    }

    return Promise.reject(error);
  }
);

export default http;
