import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { CAPTCHA_PREFIX, CAPTCHA_SCENE_ID, CAPTCHA_SDK_SRC, USE_API_MOCKS } from '@/api/env'

export interface AliyunCaptchaProps {
  sceneId?: string
  buttonId: string
  elementId?: string
}

interface AliyunCaptchaEmit {
  (e: 'success', captchaVerifyParam: string): void
  (e: 'fail', result: unknown): void
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
}

export function useAliyunCaptcha(props: Readonly<AliyunCaptchaProps>, emit: AliyunCaptchaEmit) {
  let captchaInstance: AliyunCaptchaInstance | null = null
  const isReady = ref(false)
  let mockButtonEl: Element | null = null
  let sdkCheckInterval: ReturnType<typeof setInterval> | null = null
  let sdkTimeoutId: ReturnType<typeof setTimeout> | null = null

  const captchaElementId = computed(() => (props.elementId || 'esa-captcha-element').replace('#', ''))

  function handleMockCaptchaClick() {
    emit('success', 'mock-aliyun-captcha')
  }

  function detachMockCaptchaButton() {
    if (mockButtonEl) {
      mockButtonEl.removeEventListener('click', handleMockCaptchaClick)
      mockButtonEl = null
    }
  }

  async function initMockCaptcha() {
    await nextTick()

    detachMockCaptchaButton()
    const buttonEl = document.querySelector(props.buttonId)
    if (buttonEl) {
      mockButtonEl = buttonEl
      mockButtonEl.addEventListener('click', handleMockCaptchaClick)
    }

    isReady.value = true
    emit('ready')
    emit('loading', false)
  }

  function loadAliyunCaptchaSdk() {
    if (typeof window.initAliyunCaptcha === 'function') {
      return Promise.resolve()
    }

    window.AliyunCaptchaConfig = {
      region: 'cn',
      prefix: CAPTCHA_PREFIX,
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

  async function initCaptcha() {
    if (captchaInstance || isReady.value)
      return

    if (typeof window.initAliyunCaptcha !== 'function')
      return

    await nextTick()

    const buttonEl = document.querySelector(props.buttonId)
    if (!buttonEl)
      return

    try {
      window.initAliyunCaptcha({
        SceneId: props.sceneId || CAPTCHA_SCENE_ID,
        mode: 'popup',
        element: props.elementId || '#esa-captcha-element',
        button: props.buttonId,
        success(captchaVerifyParam: string) {
          emit('success', captchaVerifyParam)
        },
        fail(result: unknown) {
          emit('fail', result)
        },
        getInstance(instance: AliyunCaptchaInstance) {
          captchaInstance = instance
          isReady.value = true
          emit('ready')
        },
        server: ['captcha-esa-open.aliyuncs.com', 'captcha-esa-open-b.aliyuncs.com'],
        slideStyle: {
          width: 360,
          height: 40,
        },
        language: 'cn',
      })
    }
    catch {}
  }

  function reset() {
    captchaInstance?.reset()
  }

  onMounted(() => {
    emit('loading', true)

    if (USE_API_MOCKS) {
      void initMockCaptcha()
      return
    }

    const tryInit = () => {
      if (typeof window.initAliyunCaptcha === 'function') {
        void initCaptcha()
        return true
      }
      return false
    }

    loadAliyunCaptchaSdk()
      .then(() => {
        if (tryInit())
          emit('loading', false)
      })
      .catch(() => {
        emit('loading', false)
      })

    if (typeof window.initAliyunCaptcha !== 'function') {
      sdkCheckInterval = setInterval(() => {
        if (tryInit()) {
          emit('loading', false)
          if (sdkCheckInterval)
            clearInterval(sdkCheckInterval)
          sdkCheckInterval = null
        }
      }, 100)

      sdkTimeoutId = setTimeout(() => {
        if (sdkCheckInterval)
          clearInterval(sdkCheckInterval)
        sdkCheckInterval = null
        sdkTimeoutId = null
        if (!isReady.value) {
          emit('loading', false)
        }
      }, 5000)
    }
  })

  onUnmounted(() => {
    detachMockCaptchaButton()

    if (sdkCheckInterval) {
      clearInterval(sdkCheckInterval)
      sdkCheckInterval = null
    }
    if (sdkTimeoutId) {
      clearTimeout(sdkTimeoutId)
      sdkTimeoutId = null
    }

    try {
      captchaInstance?.destroy()
    }
    catch {}
  })

  return {
    captchaElementId,
    isReady,
    reset,
    getInstance: () => captchaInstance,
  }
}
