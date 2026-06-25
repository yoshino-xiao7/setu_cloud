import type { RouteRecordRaw } from 'vue-router'
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { abortRouteRequests } from '@/api/requestLifecycle'
import { useAuthStore, UserRole } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  // ✅ 公开首页（SEO Landing Page）
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/public/LandingPage.vue'),
    meta: {
      public: true,
      title: '雪涼云 - 图片与音乐 API 服务',
      description: '雪涼云（雪凉云 / Xueliang Cloud）提供图片 API、音乐 API、公开收藏夹、积分调用和开发文档，是面向开发者与 bot 项目的轻量云服务控制台。',
    },
  },

  // =========================
  // ✅ 公共页（不登录）
  // =========================
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { public: true, title: '注册' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { public: true, title: '找回密码' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { public: true, title: '重置密码' },
  },

  // ✅ 公开收藏夹分享页（未登录用户访问）
  {
    path: '/c/:id(\\d+)',
    name: 'PublicCollection',
    component: () => import('@/views/public/PublicCollectionView.vue'),
    meta: {
      public: true,
      title: '公开收藏夹',
      description: '浏览雪涼云用户分享的公开收藏夹，发现精选图片内容。',
    },
  },

  // ✅ 新增：用户主页
  {
    path: '/user/:userId(\\d+)',
    name: 'UserProfile',
    component: () => import('@/views/public/UserProfileView.vue'),
    meta: {
      public: true,
      title: '用户主页',
      description: '查看雪涼云用户的个人主页和公开收藏夹。',
    },
  },

  // ✅ 系统状态页（公开访问 - 独立页面）
  {
    path: '/status',
    name: 'PublicStatus',
    component: () => import('@/views/status/SystemStatus.vue'),
    meta: {
      public: true,
      title: '系统状态',
      standalone: true,
      description: '查看雪涼云API服务的实时运行状态和性能指标。',
    },
  },
  {
    path: '/docs',
    name: 'PublicDocs',
    component: () => import('@/views/dashboard/UsageGuide.vue'),
    meta: {
      public: true,
      title: '开发文档',
      standalone: true,
      description: '查看雪涼云图片 API 与音乐 API 的请求参数、代码示例、认证方式和响应结构。',
    },
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
        meta: { title: '仪表盘' },
      },
      {
        path: 'api-keys',
        name: 'user-api-keys',
        component: () => import('@/views/dashboard/ApiKeyList.vue'),
        meta: { title: 'API Keys' },
      },
      {
        path: 'profile',
        name: 'user-profile',
        component: () => import('@/views/dashboard/ProfileView.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'about',
        name: 'user-about',
        component: () => import('@/views/dashboard/About.vue'),
        meta: { title: '关于' },
      },
      {
        path: 'docs',
        name: 'UsageGuide',
        component: () => import('@/views/dashboard/UsageGuide.vue'),
        meta: { title: '开发文档' },
      },
      // ✅ 系统状态（用户内嵌 - 保留框架）
      {
        path: 'status',
        name: 'UserStatus',
        component: () => import('@/views/status/SystemStatus.vue'),
        meta: { title: '系统状态' },
      },
      {
        path: 'points',
        name: 'UserPoints',
        component: () => import('@/views/dashboard/PointsCall.vue'),
        meta: { title: '积分调用' },
      },
      {
        path: 'points-logs',
        name: 'UserPointsLogs',
        component: () => import('@/views/dashboard/PointsLogsView.vue'),
        meta: { title: '积分流水' },
      },
      {
        path: 'collections',
        name: 'UserCollections',
        component: () => import('@/views/dashboard/Favorites.vue'),
        meta: { title: '我的收藏夹' },
      },
      {
        path: 'square',
        name: 'CollectionSquare',
        component: () => import('@/views/dashboard/CollectionSquare.vue'),
        meta: { title: '收藏夹广场' },
      },
      {
        path: 'gallery-upload',
        name: 'GalleryUpload',
        component: () => import('@/views/dashboard/GalleryUpload.vue'),
        meta: { title: '图库投稿' },
      },
      // ✅ 登录用户访问收藏夹分享页（保持在框架内）
      {
        path: 'collection/:id(\\d+)',
        name: 'UserCollectionView',
        component: () => import('@/views/public/PublicCollectionView.vue'),
        meta: { title: '收藏夹详情' },
      },
      // ✅ 新增：网易云音乐播放器
      {
        path: 'music',
        name: 'MusicPlayer',
        component: () => import('@/views/dashboard/MusicPlayer.vue'),
        meta: { title: '音乐播放器' },
      },
      // ✅ 新增：我的歌单
      {
        path: 'my-playlists',
        name: 'MyPlaylists',
        component: () => import('@/views/dashboard/MyPlaylists.vue'),
        meta: { title: '我的歌单' },
      },
      // ✅ 新增：歌单详情
      {
        path: 'playlist/:id(\\d+)',
        name: 'PlaylistDetail',
        component: () => import('@/views/dashboard/PlaylistDetail.vue'),
        meta: { title: '歌单详情' },
      },
      // ✅ 新增：播放历史
      {
        path: 'music-history',
        name: 'MusicHistory',
        component: () => import('@/views/dashboard/MusicHistory.vue'),
        meta: { title: '播放历史' },
      },
      // ✅ 新增：隐私政策
      {
        path: 'privacy',
        name: 'PrivacyPolicy',
        component: () => import('@/views/dashboard/PrivacyPolicy.vue'),
        meta: { title: '隐私政策' },
      },
      // ✅ 新增：我的删除申请
      {
        path: 'my-delete-requests',
        name: 'MyDeleteRequests',
        component: () => import('@/views/dashboard/MyDeleteRequests.vue'),
        meta: { title: '我的删除申请' },
      },
      {
        path: 'notifications',
        name: 'UserNotifications',
        component: () => import('@/views/dashboard/NotificationsView.vue'),
        meta: { title: '通知中心' },
      },
    ],
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
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/overview' },
      {
        path: 'overview',
        name: 'admin-overview',
        component: () => import('@/admin/AdminOverview.vue'),
        meta: { title: '后台概览' },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/admin/UserManagement.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'blacklist',
        name: 'admin-blacklist',
        component: () => import('@/admin/AdminIpBlacklist.vue'),
        meta: { title: '黑名单' },
      },
      {
        path: 'status',
        name: 'AdminStatus',
        component: () => import('@/views/status/SystemStatus.vue'),
        meta: { title: '系统监控' },
      },
      // ✅ 新增：网易云音乐 Token 管理
      {
        path: 'music-tokens',
        name: 'admin-music-tokens',
        component: () => import('@/admin/MusicTokenManagement.vue'),
        meta: { title: '网易云Token管理' },
      },
      // ✅ 新增：图片删除申请管理
      {
        path: 'image-delete-requests',
        name: 'admin-image-delete-requests',
        component: () => import('@/admin/AdminImageDeleteRequests.vue'),
        meta: { title: '图片删除申请' },
      },
      // ✅ 新增：Pixiv 爬虫管理
      {
        path: 'pixiv-crawl',
        name: 'admin-pixiv-crawl',
        component: () => import('@/admin/AdminPixivCrawl.vue'),
        meta: { title: '新增图片' },
      },
      // ✅ 图片库管理 (原图片审核+图片管理整合)
      {
        path: 'image-audit',
        name: 'admin-image-audit',
        component: () => import('@/admin/ImageAudit.vue'),
        meta: { title: '图片库管理' },
      },
      {
        path: 'gallery-submissions',
        name: 'admin-gallery-submissions',
        component: () => import('@/admin/GallerySubmissionReview.vue'),
        meta: { title: '投稿审核' },
      },
      {
        path: 'operation-logs',
        name: 'admin-operation-logs',
        component: () => import('@/admin/AdminOperationLogs.vue'),
        meta: { title: '操作日志' },
      },
    ],
  },

  // =========================
  // ✅ 404
  // =========================
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/misc/NotFound.vue'),
    meta: { public: true, title: '404 - 迷路了' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ✅ 超时工具函数：防止异步操作阻塞导航
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(resolve, ms, fallback)),
  ])
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // ✅ 仅依赖 Pinia store 判断登录状态，不再直接读取 localStorage
  // Pinia state 在应用初始化时由 readLocalStorageJson 水合，
  // 真实身份由 HttpOnly Cookie 中的 Token 决定，此处仅为前端路由守卫
  let hasStaleLocalSession = !!auth.user && !auth.hasValidLocalSession()
  const shouldRecoverSession = hasStaleLocalSession
    && auth.canRefreshLocalSession()
    && (to.meta.requiresAuth || to.name === 'landing')

  // ✅ 超时兜底：最多等 8 秒，防止后台切回时网络不通导致导航永久阻塞
  if (shouldRecoverSession && await withTimeout(auth.refreshSignature(), 8000, false)) {
    hasStaleLocalSession = false
  }

  if (hasStaleLocalSession) {
    auth.clearLocalState()
  }

  const isLoggedIn = auth.hasValidLocalSession()

  // title 由 @vueuse/head 统一管理，不再直接赋值 document.title

  // 0) 已登录用户访问首页时，直接跳转到 Dashboard
  if (to.name === 'landing' && isLoggedIn) {
    return { path: '/dashboard' }
  }

  // 1) ✅ 会话过期：无论目标是公开页还是私有页，统一跳转登录
  //    直接返回重定向对象，避免在 guard 内调 router.replace 导致导航冲突
  if (hasStaleLocalSession && to.name !== 'login') {
    return { name: 'login', query: { redirect: to.fullPath, expired: '1' } }
  }

  // 2) 公开页放行
  if (to.meta.public)
    return true

  // 3) 需要登录但没登录
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 4) 管理员权限
  if (to.meta.requiresAdmin) {
    if (auth.user?.role !== UserRole.Admin) {
      return { path: '/dashboard' }
    }
  }

  return true
})

// ✅ 路由切换后焦点管理 + 取消上一页面遗留的请求
router.afterEach(() => {
  // 取消上一页面的遗留请求
  abortRouteRequests()

  const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body
  if (main && typeof main.setAttribute === 'function') {
    if (!main.getAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1')
    }
    main.focus({ preventScroll: true })
  }
  window.scrollTo(0, 0)
})

export default router
