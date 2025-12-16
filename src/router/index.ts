import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 1. 引入 404 组件
import NotFound from '@/misc/NotFound.vue'

// 2. 引入布局组件
// ⚠️ 请确认你的文件夹是 'layouts' 还是 'layout'，根据实际情况修改路径
import AdminLayout from '@/layouts/AdminLayout.vue'
// 如果 UserLayout 也是在这个文件夹，请保持一致
// import UserLayout from '@/layouts/UserLayout.vue'

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

  // ==========================================
  // ✅ 登录后的用户端布局
  // ==========================================
  {
    path: '/dashboard',
    // ⚠️ 确保路径正确，可能是 @/layout/UserLayout.vue
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
        // 使用绝对路径，URL 为 /user/favorites，但依然渲染在 Dashboard 布局内
        path: '/user/favorites',
        name: 'Favorites',
        component: () => import('@/views/dashboard/Favorites.vue'),
        meta: { title: '我的收藏' }
      },
      {
        // ✅ 用户端系统状态
        // URL: /status
        // 使用绝对路径 /status，让它看起来是根路径，但依然包裹在 UserLayout 里
        path: '/status',
        name: 'UserStatus', // 🛑 必须唯一，不能叫 'Status'
        component: () => import('@/views/status/SystemStatus.vue'),
        meta: { title: '系统状态' }
      }
    ]
  },

  // ==========================================
  // ✅ 管理员后台路由
  // ==========================================
  {
    path: '/admin',
    component: AdminLayout,
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
      },
      {
        // ✅ 管理端系统状态
        // URL: /admin/status
        path: 'status', // 相对路径，自动拼接父级 => /admin/status
        name: 'AdminStatus', // 🛑 必须唯一，和上面的 UserStatus 区分开
        component: () => import('@/views/status/SystemStatus.vue'), // 复用同一个组件
        meta: { title: '系统监控' }
      }
    ]
  },

  // ✅ 404 路由
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

// ==========================================
// 路由守卫
// ==========================================
router.beforeEach((to) => {
  const auth = useAuthStore()
  const isLoggedIn = !!auth.token

  // 设置标题
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

  // 3. 需要管理员权限但角色不对 -> 踢回用户仪表盘
  if (to.meta.requiresAdmin) {
    // 假设 role 1 是管理员
    if (auth.user?.role !== 1) {
      // 如果不是管理员，强制跳转回用户首页，防止白屏
      return { path: '/dashboard' }
    }
  }

  return true
})

export default router