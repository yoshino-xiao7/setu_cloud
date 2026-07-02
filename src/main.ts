import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'
// src/main.ts
import { createApp } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { safeReplace } from '@/utils/navigation'
import App from './App.vue'
import router from './router'
import './style.css' // 导入全局样式
import './styles/liquid-glass.css' // 🧊 Liquid Glass 设计系统

const app = createApp(App)
const head = createHead()

// ✅ 全局错误处理：捕获 Vue 组件中未处理的异常，避免白屏
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', info, err)

  // 尝试通过 Naive UI message 提示用户（如果 provider 已挂载）
  if (instance?.$el) {
    const event = new CustomEvent('global-app-error', {
      detail: { message: `页面出现异常，请刷新重试 (${info})` },
    })
    window.dispatchEvent(event)
  }
}

// 捕获非 Vue 上下文的未处理 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
})

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(head)

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

app.mount('#app')
