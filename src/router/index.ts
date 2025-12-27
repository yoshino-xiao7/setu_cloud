// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import NotFound from '@/misc/NotFound.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },

  // =========================
  // ✅ 公共页（不登录）
  // =========================
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { public: true, title: '注册' }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { public: true, title: '找回密码' }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { public: true, title: '重置密码' }
  },

  // ✅ 公开收藏夹分享页（未登录用户访问）
  {
    path: '/c/:id(\\d+)',
    name: 'PublicCollection',
    component: () => import('@/views/public/PublicCollectionView.vue'),
    meta: { public: true, title: '公开收藏夹' }
  },

  // ✅ 系统状态页（公开访问）
  {
    path: '/status',
    name: 'PublicStatus',
    component: () => import('@/views/status/SystemStatus.vue'),
    meta: { public: true, title: '系统状态' }
  },

  // =========================
  // ✅ 用户端（登录后）
  // =========================
  {
    path: '/dashboard',
    component: () => import('@/layouts/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'user-dashboard',
        component: () => import('@/views/dashboard/UserDashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'api-keys',
        name: 'user-api-keys',
        component: () => import('@/views/dashboard/ApiKeyList.vue'),
        meta: { title: 'API Keys' }
      },
      {
        path: 'profile',
        name: 'user-profile',
        component: () => import('@/views/dashboard/ProfileView.vue'),
        meta: { title: '个人中心' }
      },
      {
        path: 'about',
        name: 'user-about',
        component: () => import('@/views/dashboard/About.vue'),
        meta: { title: '关于' }
      },
      {
        path: 'docs',
        name: 'UsageGuide',
        component: () => import('@/views/dashboard/UsageGuide.vue'),
        meta: { title: '开发文档' }
      },
      {
        path: 'status',
        alias: '/status',
        name: 'UserStatus',
        component: () => import('@/views/status/SystemStatus.vue'),
        meta: { title: '系统状态' }
      },
      {
        path: 'points',
        name: 'UserPoints',
        component: () => import('@/views/dashboard/PointsCall.vue'),
        meta: { title: '积分调用' }
      },
      {
        path: 'points-logs',
        name: 'UserPointsLogs',
        component: () => import('@/views/dashboard/PointsLogsView.vue'),
        meta: { title: '积分流水' }
      },
      {
        path: 'collections',
        name: 'UserCollections',
        component: () => import('@/views/dashboard/Favorites.vue'),
        meta: { title: '我的收藏夹' }
      },
      {
        path: 'square',
        name: 'CollectionSquare',
        component: () => import('@/views/dashboard/CollectionSquare.vue'),
        meta: { title: '收藏夹广场' }
      },
      // ✅ 登录用户访问收藏夹分享页（保持在框架内）
      {
        path: 'collection/:id(\\d+)',
        name: 'UserCollectionView',
        component: () => import('@/views/public/PublicCollectionView.vue'),
        meta: { title: '收藏夹详情' }
      },
      // ✅ 新增：网易云音乐播放器
      {
        path: 'music',
        name: 'MusicPlayer',
        component: () => import('@/views/dashboard/MusicPlayer.vue'),
        meta: { title: '音乐播放器' }
      },
      // ✅ 新增：我的歌单
      {
        path: 'my-playlists',
        name: 'MyPlaylists',
        component: () => import('@/views/dashboard/MyPlaylists.vue'),
        meta: { title: '我的歌单' }
      },
      // ✅ 新增：歌单详情
      {
        path: 'playlist/:id(\\d+)',
        name: 'PlaylistDetail',
        component: () => import('@/views/dashboard/PlaylistDetail.vue'),
        meta: { title: '歌单详情' }
      },
      // ✅ 新增：播放历史
      {
        path: 'music-history',
        name: 'MusicHistory',
        component: () => import('@/views/dashboard/MusicHistory.vue'),
        meta: { title: '播放历史' }
      }
    ]
  },

  // =========================
  // ✅ 兼容旧地址（重定向）
  // =========================
  { path: '/user/collections', redirect: '/dashboard/collections' },
  { path: '/user/favorites', redirect: '/dashboard/collections' },

  // =========================
  // ✅ 管理端（登录后）
  // =========================
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/overview' },
      {
        path: 'overview',
        name: 'admin-overview',
        component: () => import('@/admin/AdminOverview.vue'),
        meta: { title: '后台概览' }
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/admin/UserManagement.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'blacklist',
        name: 'admin-blacklist',
        component: () => import('@/admin/AdminIpBlacklist.vue'),
        meta: { title: '黑名单' }
      },
      {
        path: 'status',
        name: 'AdminStatus',
        component: () => import('@/views/status/SystemStatus.vue'),
        meta: { title: '系统监控' }
      },
      // ✅ 新增：网易云音乐 Token 管理
      {
        path: 'music-tokens',
        name: 'admin-music-tokens',
        component: () => import('@/admin/MusicTokenManagement.vue'),
        meta: { title: '网易云Token管理' }
      }
    ]
  },

  // =========================
  // ✅ 404
  // =========================
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
    meta: { public: true, title: '404 - 迷路了' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // 🔥 关键修复：双重保险
  // 优先看 Pinia 状态，如果 Pinia 还没反应过来，直接查 LocalStorage
  const tokenInStorage = localStorage.getItem('token')
  const isLoggedIn = !!auth.token || !!tokenInStorage

  if (to.meta.title) document.title = `${to.meta.title} | Setu Cloud`

  // 1) 公开页放行
  if (to.meta.public) return true

  // 2) 需要登录但没登录
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 3) 管理员权限
  if (to.meta.requiresAdmin) {
    if (auth.user?.role !== 1) {
       return { path: '/dashboard' }
    }
  }

  return true
})

export default router