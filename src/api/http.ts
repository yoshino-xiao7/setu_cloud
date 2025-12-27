// src/api/http.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';


const http = axios.create({
  // ✅ 优化1：自动判断环境。开发用 localhost，上线用域名
  baseURL: import.meta.env.DEV ? 'http://localhost:9898' : 'https://api.yukiryou.icu',
  timeout: 30000, // ✅ 增加到 30 秒，适应网易云API代理
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
  authStore.logout();

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
  (config) => {
    const auth = useAuthStore();

    // 🔥 修复:优先从 localStorage 读取 token,避免 Pinia 状态延迟
    const tokenInStorage = localStorage.getItem('token');
    const expireAtInStorage = localStorage.getItem('expireAt');
    
    // 前端主动检查 Token 是否过期(使用 localStorage 中的值)
    if (expireAtInStorage) {
      const expireAt = Number(expireAtInStorage);
      if (expireAt < Date.now()) {
        handleSessionExpired();
        return Promise.reject(new Error('Token expired (Local check)'));
      }
    }

    // 优先使用 localStorage 的 token
    const token = tokenInStorage || auth.token;
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
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
    // 5. 处理后端返回的 401
    if (error.response && error.response.status === 401) {
      handleSessionExpired();
    }
    return Promise.reject(error);
  }
);

export default http;