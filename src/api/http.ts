// src/api/http.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';


const http = axios.create({
  // baseURL: 'https://api.yukiryou.icu',
  baseURL: 'http://localhost:9898',
  timeout: 10000,
  // 3. 修复：允许 304 状态码，防止被当做错误拦截
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

    // 前端主动检查 Token 是否过期
    if (auth.isTokenExpired()) {
      handleSessionExpired();
      // 返回一个这就 rejected 的 Promise，中断请求
      return Promise.reject(new Error('Token expired (Local check)'));
    }

    const token = auth.token || localStorage.getItem('token');
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