// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 1. 引入 404 组件
import NotFound from '@/misc/NotFound.vue'
// ✅ 2. 引入布局组件 (一定要确保文件存在于 src/layouts/ 下)
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { public: true }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { public: true }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { public: true }
  },

  // ✅ 登录后的用户端布局
  {
    path: '/dashboard',
    // ⚠️ 确保 UserLayout.vue 文件存在
    component: () => import('@/layouts/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'user-dashboard',
        component: () => import('@/views/dashboard/UserDashboard.vue')
      },
      {
        path: 'api-keys',
        name: 'user-api-keys',
        component: () => import('@/views/dashboard/ApiKeyList.vue')
      },
      {
        path: 'profile',
        name: 'user-profile',
        component: () => import('@/views/dashboard/ProfileView.vue')
      },
      {
        path: 'about',
        name: 'user-about',
        component: () => import('@/views/dashboard/About.vue')
      },
       {
        path: 'docs',
        name: 'UsageGuide',
        component: () => import('@/views/dashboard/UsageGuide.vue'),
        meta: { title: '使用指南' }
      },
      {
      path: '/user/favorites',
      name: 'Favorites',
      component: () => import('@/views/dashboard/Favorites.vue'),
      meta: { title: '我的收藏', requiresAuth: true }
    }
    ]
  },

  // ✅ 管理员后台路由 (新加的部分)
  {
    path: '/admin',
    component: AdminLayout, // 👈 确保顶部 import 了这个文件
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/overview'
      },
      {
        path: 'overview',
        name: 'admin-overview',
        component: () => import('@/admin/AdminOverview.vue')
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/admin/UserManagement.vue')
      },
      {
        path: 'blacklist',
        name: 'admin-blacklist',
        component: () => import('@/admin/AdminIpBlacklist.vue')
      }
    ]
  },

  // ✅ 404 路由 (放在最后)
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
    meta: {
      public: true,
      title: '404 - 迷路了'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isLoggedIn = !!auth.token

  if (to.meta.title) {
    document.title = `${to.meta.title} | Setu Cloud`
  }

  // 1. 公开页面放行
  if (to.meta.public) {
    return true
  }

  // 2. 需要登录但没登录 -> 去登录页
  if (to.meta.requiresAuth && !isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath }
    }
  }

  // 3. 需要管理员权限但角色不对 -> 踢回用户仪表盘 (防止白屏的关键)
  if (to.meta.requiresAdmin) {
    // 注意：后端通常返回 role: 1 代表管理员
    // 如果 auth.user 还没加载完，可能需要先判断一下
    if (auth.user?.role !== 1) {
      // ⚠️ 如果你现在的账号不是管理员，访问 /admin 就会被拦截到这里
      // 为了调试，你可以先注释掉下面这行 return，强制放行：
      return { path: '/dashboard' }
    }
  }

  return true
})

export default router