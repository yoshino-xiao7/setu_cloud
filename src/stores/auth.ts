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
      // 发送请求
      const res = await http.post('/auth/login', {
        email,
        password,
        captchaCode,
        captchaUuid
      });

      // 兼容处理：http.ts 可能返回 res.data 也可能直接返回 res
      // 这里强制断言类型
      const data = (res.data || res) as {
        token: string;
        userId: number;
        role: number;
        expireAt: number;
        avatarUrl?: string | null;
        lastLoginIp?: string | null;
      };

      this.token = data.token;
      this.user = {
        id: data.userId,
        email,
        role: data.role,
        lastLoginIp: data.lastLoginIp || undefined,
      };

      // 🔥🔥 核心修复：时间戳单位转换 🔥🔥
      // 后端通常返回 10 位时间戳 (秒)，JS 需要 13 位 (毫秒)
      // 如果不转，前端会认为 token 在 1970 年就过期了，导致登录后立刻跳回
      let exp = data.expireAt;
      if (String(exp).length === 10) {
        exp = exp * 1000;
      }
      this.expireAt = exp;

      // 存入 LocalStorage
      localStorage.setItem('token', this.token!);
      localStorage.setItem('user', JSON.stringify(this.user));
      localStorage.setItem('expireAt', String(this.expireAt));

      // 头像处理
      if (data.avatarUrl) {
        this.avatarUrl = data.avatarUrl;
        localStorage.setItem('avatarUrl', data.avatarUrl);
      } else {
        this.avatarUrl = null;
        localStorage.removeItem('avatarUrl');
      }
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
      // 这里的 expireAt 已经是毫秒了 (在 login 里转过了)
      if (this.expireAt && this.expireAt < Date.now()) {
        this.logout();
        return true;
      }
      return false;
    },
  },
});