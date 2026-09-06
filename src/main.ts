// src/main.ts
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import { useAuthStore } from '@/stores/auth'
import { reloadOnceForChunkLoadError } from '@/utils/appRecovery'
import { safeReplace } from '@/utils/navigation'
import App from './App.vue'
import { registerRouter, routes, setupRouterGuards } from './router'
import './style.css' // 导入全局样式
import './styles/liquid-glass.css' // 🧊 Liquid Glass 设计系统
import './styles/board.css' // 樱潮版式原语

export const createApp = ViteSSG(
  App,
  { routes },
  ({ app, router, initialState, onSSRAppRendered }) => {
    const pinia = createPinia()
    app.use(pinia)

    // ✅ pinia 状态在 SSG 与客户端之间传递：
    // 仅还原预取数据存根 publicShare（Phase B 动态页预渲染用）；
    // 不能整体替换 state——auth 等 store 的 state() 依赖 localStorage 初始化，
    // 整体覆盖会导致已登录用户在预渲染页上会话丢失
    if (!import.meta.env.SSR && initialState.pinia?.publicShare)
      pinia.state.value.publicShare = initialState.pinia.publicShare

    // SSG 渲染完成后把 pinia 状态序列化进 window.__INITIAL_STATE__
    if (import.meta.env.SSR) {
      onSSRAppRendered(() => {
        initialState.pinia = pinia.state.value
      })
    }

    // ✅ 全局错误处理：捕获 Vue 组件中未处理的异常，避免白屏
    app.config.errorHandler = (err, instance, info) => {
      console.error('[Vue Error]', info, err)

      if (reloadOnceForChunkLoadError(err))
        return

      // 尝试通过 Naive UI message 提示用户（如果 provider 已挂载）
      if (!import.meta.env.SSR && instance?.$el) {
        const event = new CustomEvent('global-app-error', {
          detail: { message: `页面出现异常，请刷新重试 (${info})` },
        })
        window.dispatchEvent(event)
      }
    }

    registerRouter(router)
    setupRouterGuards(router)

    // ✅ 以下为浏览器专属逻辑（会话恢复、全局事件监听），SSG 构建时跳过
    if (!import.meta.env.SSR) {
      // 捕获非 Vue 上下文的未处理 Promise rejection
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[Unhandled Rejection]', event.reason)
        if (reloadOnceForChunkLoadError(event.reason))
          event.preventDefault()
      })

      const SESSION_RECOVERY_TIMEOUT_MS = 4000
      let sessionRecoveryPromise: Promise<void> | null = null

      function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
        return Promise.race([
          promise,
          new Promise<T>(resolve => setTimeout(resolve, ms, fallback)),
        ])
      }

      async function runSessionRecovery() {
        const auth = useAuthStore(pinia)
        if (!auth.user || auth.hasValidLocalSession())
          return

        const refreshed = auth.canRefreshLocalSession()
          ? await withTimeout(auth.refreshSignature(), SESSION_RECOVERY_TIMEOUT_MS, false)
          : false

        if (refreshed)
          return

        auth.clearLocalState()

        const currentRoute = router.currentRoute.value
        if (currentRoute.path === '/login')
          return

        await safeReplace(router, {
          name: 'login',
          query: {
            redirect: currentRoute.fullPath,
            expired: '1',
          },
        })
      }

      function recoverSessionOnVisible() {
        if (sessionRecoveryPromise)
          return sessionRecoveryPromise

        sessionRecoveryPromise = runSessionRecovery()
          .finally(() => {
            sessionRecoveryPromise = null
          })

        return sessionRecoveryPromise
      }

      function scheduleSessionRecovery() {
        if (document.visibilityState === 'visible')
          void recoverSessionOnVisible()
      }

      // ✅ 后台切回/网络恢复时主动刷新签名，刷新失败则明确进入登录恢复流程
      document.addEventListener('visibilitychange', scheduleSessionRecovery)
      window.addEventListener('focus', scheduleSessionRecovery)
      window.addEventListener('online', scheduleSessionRecovery)
    }
  },
)
