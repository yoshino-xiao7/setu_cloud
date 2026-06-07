// src/api/http.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import { API_BASE_URL, USE_API_MOCKS } from '@/api/env';
import { createMockAdapter } from '@/api/mock';

const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // ✅ 增加到 30 秒，适应网易云API代理
  withCredentials: true, // ✅ 关键配置：携带 HttpOnly Cookie
  adapter: USE_API_MOCKS ? createMockAdapter(defaultAdapter) : defaultAdapter,
  validateStatus: (status) => {
    return (status >= 200 && status < 300) || status === 304;
  },
});

// 4. 防抖锁：防止多个请求同时 401 导致弹出多个提示窗口
let isRelogin = false;

// 统一的处理函数
const handleSessionExpired = () => {
  if (isRelogin) return;
  isRelogin = true;

  const authStore = useAuthStore();
  authStore.clearLocalState(); // ✅ 只清除本地状态，不调用 API

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
    const queryString = new URLSearchParams(validQuery as any).toString();
    redirectPath = `${redirectPath}?${queryString}`;
  }

  console.warn('🚨 [Session Expired] 跳转登录页，原路径:', redirectPath);

  // 3. 跳转登录页，只传递干净的 redirect 路径
  router.replace({
    path: '/login',
    query: {
      redirect: redirectPath,
      expired: '1'
    }
  }).then(() => {
    isRelogin = false;
  }).catch(() => {
    isRelogin = false;
  });
};

// --- 请求拦截器 ---
http.interceptors.request.use(
  async (config) => {
    // ✅ Cookie 自动携带，无需手动设置 Authorization

    // ✅ 请求签名逻辑（仅在登录后生效，动态导入 crypto-js 避免未登录用户加载）
    const signSecret = localStorage.getItem('signSecret');
    if (signSecret) {
      const { default: CryptoJS } = await import('crypto-js');

      // 生成时间戳
      const timestamp = Date.now().toString();

      // 生成随机 nonce（16位）
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 获取请求方法和路径
      const method = (config.method || 'GET').toUpperCase();
      const uri = new URL(config.url || '', config.baseURL).pathname;

      // 计算签名: message = timestamp:nonce:method:uri
      const message = `${timestamp}:${nonce}:${method}:${uri}`;
      const signature = CryptoJS.HmacSHA256(message, signSecret).toString();

      // 添加签名请求头
      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Nonce'] = nonce;
      config.headers['X-Signature'] = signature;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- 响应拦截器 ---
http.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

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
