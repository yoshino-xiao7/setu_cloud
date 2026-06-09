<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { CAPTCHA_SDK_SRC, CAPTCHA_PREFIX, CAPTCHA_SCENE_ID } from '@/api/env'

const props = defineProps<{
  sceneId?: string
  buttonId: string  // 触发验证的按钮ID（如登录按钮）
  elementId?: string // 验证码容器元素ID
}>()

const emit = defineEmits<{
  (e: 'success', captchaVerifyParam: string): void
  (e: 'fail', result: unknown): void
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
}>()

// 验证码实例
interface AliyunCaptchaInstance {
  reset?: () => void
  destroy?: () => void
}
let captchaInstance: AliyunCaptchaInstance | null = null
const isReady = ref(false)

// ✅ 跟踪定时器，组件销毁时清理
let sdkCheckInterval: ReturnType<typeof setInterval> | null = null
let sdkTimeoutId: ReturnType<typeof setTimeout> | null = null

const loadAliyunCaptchaSdk = () => {
  if (typeof window.initAliyunCaptcha === 'function') {
    return Promise.resolve()
  }

  window.AliyunCaptchaConfig = {
    region: 'cn',
    prefix: CAPTCHA_PREFIX
  }

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${CAPTCHA_SDK_SRC}"]`)
  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('AliyunCaptcha SDK 加载失败')), { once: true })
    })
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CAPTCHA_SDK_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('AliyunCaptcha SDK 加载失败'))
    document.head.appendChild(script)
  })
}

// 初始化验证码
const initCaptcha = async () => {
  if (captchaInstance || isReady.value) return

  if (typeof window.initAliyunCaptcha !== 'function') {
    return
  }

  // 等待DOM更新
  await nextTick()

  // 检查元素是否存在
  const buttonEl = document.querySelector(props.buttonId)
  if (!buttonEl) {
    return
  }

  try {
    window.initAliyunCaptcha({
      SceneId: props.sceneId || CAPTCHA_SCENE_ID,
      mode: 'popup',
      element: props.elementId || '#esa-captcha-element',
      button: props.buttonId,
      // 验证码验证通过回调函数
      success: function (captchaVerifyParam: string) {
        emit('success', captchaVerifyParam)
      },
      // 验证码验证不通过回调函数
      fail: function (result: unknown) {
        emit('fail', result)
      },
      // 绑定验证码实例回调函数
      getInstance: function (instance: AliyunCaptchaInstance) {
        captchaInstance = instance
        isReady.value = true
        emit('ready')
      },
      // 指定ESA的服务域名
      server: ['captcha-esa-open.aliyuncs.com', 'captcha-esa-open-b.aliyuncs.com'],
      // 滑块验证样式
      slideStyle: {
        width: 360,
        height: 40,
      },
      language: 'cn',
    })
  } catch {}
}

// 重置验证码
const reset = () => {
  if (captchaInstance?.reset) {
    captchaInstance.reset()
  }
}

// 暴露给父组件的方法
defineExpose({
  reset,
  isReady,
  getInstance: () => captchaInstance
})

onMounted(() => {
  emit('loading', true)

  // 等待SDK加载完成后初始化
  const tryInit = () => {
    if (typeof window.initAliyunCaptcha === 'function') {
      initCaptcha()
      return true
    }
    return false
  }

  loadAliyunCaptchaSdk()
    .then(() => {
      if (tryInit()) emit('loading', false)
    })
    .catch(() => {
      emit('loading', false)
    })

  if (typeof window.initAliyunCaptcha !== 'function') {
    // 等待SDK加载
    sdkCheckInterval = setInterval(() => {
      if (tryInit()) {
        emit('loading', false)
        if (sdkCheckInterval) clearInterval(sdkCheckInterval)
        sdkCheckInterval = null
      }
    }, 100)
    
    // 5秒后超时
    sdkTimeoutId = setTimeout(() => {
      if (sdkCheckInterval) clearInterval(sdkCheckInterval)
      sdkCheckInterval = null
      sdkTimeoutId = null
      if (!isReady.value) {
        emit('loading', false)
      }
    }, 5000)
  }
})

onUnmounted(() => {
  // ✅ 清理 SDK 加载定时器
  if (sdkCheckInterval) { clearInterval(sdkCheckInterval); sdkCheckInterval = null }
  if (sdkTimeoutId) { clearTimeout(sdkTimeoutId); sdkTimeoutId = null }

  if (captchaInstance?.destroy) {
    try {
      captchaInstance.destroy()
    } catch {}
  }
})
</script>

<template>
  <!-- 无痕验证模式下，只需要一个隐藏的容器元素 -->
  <div :id="(props.elementId || 'esa-captcha-element').replace('#', '')" class="esa-captcha-container"></div>
</template>

<style scoped>
.esa-captcha-container {
  /* 容器本身不显示，验证码会以弹窗形式出现 */
  display: block;
}
</style>
