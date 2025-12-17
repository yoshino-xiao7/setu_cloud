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

  // ✅ 公开收藏夹分享页（不登录也能看）
  // 访问形如：/c/11
  {
    path: '/c/:id(\\d+)',
    name: 'PublicCollection',
    component: () => import('@/views/public/PublicCollectionView.vue'),
    meta: { public: true, title: '公开收藏夹' }
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
  alias: '/status', // ✅ 关键：保持旧路径 /status 仍然可用且能高亮
  name: 'UserStatus',
  component: () => import('@/views/status/SystemStatus.vue'),
  meta: { title: '系统状态' }
},

      // ✅ 收藏夹管理页：统一用 /dashboard/collections
      {
        path: 'collections',
        name: 'UserCollections',
        component: () => import('@/views/dashboard/Favorites.vue'),
        meta: { title: '我的收藏夹' }
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
  const isLoggedIn = !!auth.token

  if (to.meta.title) document.title = `${to.meta.title} | Setu Cloud`

  // 1) 公开页放行
  if (to.meta.public) return true

  // 2) 需要登录但没登录
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 3) 管理员权限
  if (to.meta.requiresAdmin) {
    if (auth.user?.role !== 1) return { path: '/dashboard' }
  }

  return true
})

export default router
