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
  avatarUrl: string | null; // 只存后端给的正式头像 URL
  expireAt: number | null;  // 存储 token 的过期时间
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
    // ✅ 修改：增加 captchaCode 和 captchaUuid 参数
      async login(email: string, password: string, captchaCode: string, captchaUuid: string) {
        // ✅ 修改：把这两个参数放进请求体
        const res = await http.post('/auth/login', {
          email,
          password,
          captchaCode,
          captchaUuid
        });
      const data = res.data as {
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
      this.expireAt = data.expireAt;

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

    // 上传头像成功后调用，用来更新正式头像
    updateAvatar(url: string) {
      this.avatarUrl = url;
      localStorage.setItem('avatarUrl', url);
    },

    // 检查 token 是否过期
    isTokenExpired() {
      if (this.expireAt && this.expireAt < Date.now()) {
        this.logout();
        return true;
      }
      return false;
    },
  },
});
