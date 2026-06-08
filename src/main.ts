import { createUnhead } from '@unhead/vue'
import { createPinia } from 'pinia'
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css' // 导入全局样式
import './styles/liquid-glass.css' // 🧊 Liquid Glass 设计系统

const app = createApp(App)
const head = createUnhead()

// ✅ 全局错误处理：捕获 Vue 组件中未处理的异常，避免白屏
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', info, err)

  // 尝试通过 Naive UI message 提示用户（如果 provider 已挂载）
  if (instance?.$el) {
    const event = new CustomEvent('global-app-error', {
      detail: { message: `页面出现异常，请刷新重试 (${info})` }
    })
    window.dispatchEvent(event)
  }
}

// 捕获非 Vue 上下文的未处理 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
})

app.use(createPinia())
app.use(router)
app.use(head)

app.mount('#app')
