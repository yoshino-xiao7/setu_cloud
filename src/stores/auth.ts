// src/stores/auth.ts
import { defineStore } from 'pinia';
import http from '@/api/http';

interface UserInfo {
  id: number;
  email: string;
  role: number;
  lastLoginIp?: string;
  nickname?: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  avatarUrl: string | null;
  expireAt: number | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user') as string)
      : null,
    avatarUrl: localStorage.getItem('avatarUrl')
      ? (localStorage.getItem('avatarUrl') as string)
      : null,
    expireAt: localStorage.getItem('expireAt') ? Number(localStorage.getItem('expireAt')) : null,
  }),
  actions: {
    // 登录逻辑
    async login(email: string, password: string, captchaCode: string, captchaUuid: string) {
      // 🔥 关键修复1：登录前先清空旧数据，避免旧 token 干扰
      this.logout();

      // 发送请求
      const res = await http.post('/auth/login', {
        email,
        password,
        captchaCode,
        captchaUuid
      });

      // 兼容处理：http.ts 可能返回 res.data 也可能直接返回 res
      const data = (res.data || res) as {
        token: string;
        userId: number;
        role: number;
        expireAt: number;
        avatarUrl?: string | null;
        lastLoginIp?: string | null;
      };

      // 🔥🔥 核心修复2：时间戳单位转换 🔥🔥
      // 后端通常返回 10 位时间戳 (秒)，JS 需要 13 位 (毫秒)
      let exp = data.expireAt;
      if (String(exp).length === 10) {
        exp = exp * 1000;
      }

      // 🔥 关键修复3：按严格顺序同步写入，确保原子性
      // 先写 localStorage，再更新 Pinia state
      localStorage.setItem('token', data.token);
      localStorage.setItem('expireAt', String(exp));
      localStorage.setItem('user', JSON.stringify({
        id: data.userId,
        email,
        role: data.role,
        lastLoginIp: data.lastLoginIp || undefined,
      }));

      // 头像处理
      if (data.avatarUrl) {
        localStorage.setItem('avatarUrl', data.avatarUrl);
      } else {
        localStorage.removeItem('avatarUrl');
      }

      // 🔥 最后才更新 Pinia state (确保 localStorage 已写入完成)
      this.token = data.token;
      this.expireAt = exp;
      this.user = {
        id: data.userId,
        email,
        role: data.role,
        lastLoginIp: data.lastLoginIp || undefined,
      };
      this.avatarUrl = data.avatarUrl || null;
    },

    logout() {
      this.token = null;
      this.user = null;
      this.avatarUrl = null;
      this.expireAt = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('avatarUrl');
      localStorage.removeItem('expireAt');
    },

    updateAvatar(url: string) {
      this.avatarUrl = url;
      localStorage.setItem('avatarUrl', url);
    },

    // 检查 token 是否过期
    isTokenExpired() {
      // 🔥 修复：双重检查，优先从 localStorage 读取最新值
      const expireAtFromStorage = localStorage.getItem('expireAt');
      const expireAt = expireAtFromStorage ? Number(expireAtFromStorage) : this.expireAt;
      
      if (!expireAt) {
        return false; // 没有过期时间，认为未过期
      }

      // 检查是否过期（已经是毫秒了）
      if (expireAt < Date.now()) {
        this.logout();
        return true;
      }
      return false;
    },
  },
});