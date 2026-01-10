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
  user: UserInfo | null;
  avatarUrl: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user') as string)
      : null,
    avatarUrl: localStorage.getItem('avatarUrl')
      ? (localStorage.getItem('avatarUrl') as string)
      : null,
  }),
  actions: {
    // 登录逻辑
    async login(email: string, password: string, captchaCode: string, captchaUuid: string) {
      // 🔥 登录前先清空旧数据
      this.clearLocalState();

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
        signSecret: string; // ✅ 新增：请求签名密钥
      };

      // ✅ 保存签名密钥用于请求签名
      if (data.signSecret) {
        localStorage.setItem('signSecret', data.signSecret);
      }

      // ✅ Token 已自动存入 HttpOnly Cookie，无需手动存储
      // 只保存用于 UI 显示的用户信息
      const userInfo: UserInfo = {
        id: data.userId,
        email,
        role: data.role,
        lastLoginIp: data.lastLoginIp || undefined,
      };

      localStorage.setItem('user', JSON.stringify(userInfo));

      // 头像处理
      if (data.avatarUrl) {
        localStorage.setItem('avatarUrl', data.avatarUrl);
      } else {
        localStorage.removeItem('avatarUrl');
      }

      // 更新 Pinia state
      this.user = userInfo;
      this.avatarUrl = data.avatarUrl || null;
    },

    // ✅ 退出登录 - 调用后端接口清除 Cookie
    async logout() {
      try {
        await http.post('/auth/logout');
      } catch (e) {
        console.warn('Logout API call failed', e);
      }
      this.clearLocalState();
    },

    // ✅ 仅清除本地状态（用于 401 响应时，避免循环调用 API）
    clearLocalState() {
      this.user = null;
      this.avatarUrl = null;
      localStorage.removeItem('user');
      localStorage.removeItem('avatarUrl');
      localStorage.removeItem('signSecret'); // ✅ 清除签名密钥
    },

    updateAvatar(url: string) {
      this.avatarUrl = url;
      localStorage.setItem('avatarUrl', url);
    },

    // ✅ 通过 API 验证登录状态
    async checkAuth(): Promise<boolean> {
      try {
        const res = await http.get('/user/info');
        if (res.data) {
          this.user = res.data;
          localStorage.setItem('user', JSON.stringify(res.data));
          if (res.data.avatarUrl) {
            this.avatarUrl = res.data.avatarUrl;
            localStorage.setItem('avatarUrl', res.data.avatarUrl);
          }
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },
  },
});
