// src/api/http.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';


const http = axios.create({
  // ✅ 优化1：自动判断环境。开发用 localhost，上线用域名
  baseURL: import.meta.env.DEV ? 'http://localhost:9898' : 'https://api.yukiryou.icu',
  timeout: 10000,
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

  // 跳转登录页，带上 redirect 参数以便登录后跳回当前页面
  router.push({
    path: '/login',
    query: { redirect: router.currentRoute.value.fullPath,
    expired: '1' // <--- 加上这个参数，告诉登录页是因为过期来的
    }
  }).then(() => {
    // 跳转完成后重置锁 (根据业务需求，有时也可以不重置，直到页面刷新)
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
    
    console.log('🌐 [HTTP拦截器] 请求:', config.url);
    console.log('  - tokenInStorage:', tokenInStorage ? tokenInStorage.substring(0, 20) + '...' : 'null');
    console.log('  - expireAtInStorage:', expireAtInStorage);
    
    // 前端主动检查 Token 是否过期(使用 localStorage 中的值)
    if (expireAtInStorage) {
      const expireAt = Number(expireAtInStorage);
      const now = Date.now();
      console.log('  - 当前时间:', now, '过期时间:', expireAt);
      if (expireAt < now) {
        console.warn('❌ [HTTP拦截器] Token已过期,中断请求');
        handleSessionExpired();
        return Promise.reject(new Error('Token expired (Local check)'));
      }
    }

    // 优先使用 localStorage 的 token
    const token = tokenInStorage || auth.token;
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
      console.log('✅ [HTTP拦截器] 已添加 Authorization 头');
    } else {
      console.log('⚠️ [HTTP拦截器] 无 token,跳过添加 Authorization');
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