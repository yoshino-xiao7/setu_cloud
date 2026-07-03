import { get } from '@github/webauthn-json'
import { useHead } from '@vueuse/head'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { USE_API_MOCKS } from '@/api/env'
import {
  beginPasskeyAuthentication,
  isPasskeyCancelError,
  isPasskeySupported,
  normalizePasskeyRequestOptions,
} from '@/api/passkey'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAuthStore, UserRole } from '@/stores/auth'
import { safeReplace } from '@/utils/navigation'

interface CaptchaExpose {
  refresh: () => void
}

interface AliyunCaptchaExpose {
  reset: () => void
}

type LoginMode = 'password' | 'passkey'

export function useLoginView() {
  useHead({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  })

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()
  const message = useMessage()

  const form = ref({
    email: '',
    password: '',
    captchaCode: '',
    captchaUuid: '',
  })

  const loading = ref(false)
  const esaLoading = ref(false)
  const passkeyLoading = ref(false)
  const showPassword = ref(false)
  const loginMode = ref<LoginMode>('password')
  const captchaRef = ref<CaptchaExpose>()
  const aliyunCaptchaRef = ref<AliyunCaptchaExpose>()

  function validateForm() {
    if (!form.value.email || !form.value.password) {
      message.warning('请输入邮箱和密码')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      message.warning('请输入正确的邮箱格式')
      return false
    }

    if (!form.value.captchaCode) {
      message.warning('请输入验证码')
      return false
    }

    return true
  }

  async function redirectAfterLogin() {
    await new Promise(resolve => setTimeout(resolve, 100))

    const redirectParam = route.query.redirect as string
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      await safeReplace(router, redirectParam)
    }
    else if (auth.user?.role === UserRole.Admin) {
      await safeReplace(router, '/admin/overview')
    }
    else {
      await safeReplace(router, '/dashboard')
    }
  }

  async function doLogin(_esaToken: string) {
    if (!validateForm())
      return

    loading.value = true
    try {
      await auth.login(
        form.value.email,
        form.value.password,
        form.value.captchaCode,
        form.value.captchaUuid,
      )

      message.success('登录成功，欢迎回来')
      await redirectAfterLogin()
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return

      showApiError(message, e, '登录失败，请检查账号密码或验证码')
      captchaRef.value?.refresh()
      form.value.captchaCode = ''
      aliyunCaptchaRef.value?.reset()
    }
    finally {
      loading.value = false
    }
  }

  async function handleEsaSuccess(captchaVerifyParam: string) {
    await doLogin(captchaVerifyParam)
  }

  function handleEsaFail(_result: { code?: string, message?: string }) {
    message.error('安全验证失败，请重试')
  }

  function getPasskeyBusinessCode(error: unknown) {
    if (!error || typeof error !== 'object')
      return ''

    const apiError = error as { response?: { data?: { code?: string } } }
    return apiError.response?.data?.code || ''
  }

  function getPasskeyLoginError(error: unknown) {
    if (isPasskeyCancelError(error))
      return '已取消通行密钥验证'

    const code = getPasskeyBusinessCode(error)
    if (code === 'PASSKEY_EMAIL_NOT_VERIFIED')
      return '请先完成邮箱验证后再使用通行密钥'
    if (code === 'PASSKEY_ASSERTION_FAILED')
      return '通行密钥验证失败，请重试'
    if (code === 'PASSKEY_LOGIN_NOT_AVAILABLE')
      return '通行密钥登录不可用，请切回账号密码登录'
    if (code === 'PASSKEY_CHALLENGE_EXPIRED')
      return '验证已过期，请重新发起通行密钥登录'

    return getApiErrorMessage(error, '通行密钥登录失败')
  }

  async function handlePasskeyLogin() {
    if (!isPasskeySupported()) {
      message.warning('当前浏览器或环境不支持通行密钥')
      return
    }

    passkeyLoading.value = true
    try {
      const options = await beginPasskeyAuthentication()
      const credential = await get(normalizePasskeyRequestOptions(options.publicKey))
      await auth.loginWithPasskey(options.challengeId, credential)
      message.success('登录成功，欢迎回来')
      await redirectAfterLogin()
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return

      const text = getPasskeyLoginError(e)
      if (isPasskeyCancelError(e))
        message.warning(text)
      else if (getPasskeyBusinessCode(e))
        message.error(text)
      else
        showApiError(message, e, '通行密钥登录失败')
    }
    finally {
      passkeyLoading.value = false
    }
  }

  function blockCaptchaEvent(event?: Event) {
    event?.preventDefault()
    event?.stopImmediatePropagation()
  }

  function handleSubmit(event?: Event) {
    if (!validateForm()) {
      blockCaptchaEvent(event)
      return false
    }

    if (USE_API_MOCKS) {
      blockCaptchaEvent(event)
      void doLogin('mock-aliyun-captcha')
      return false
    }
  }

  onMounted(() => {
    if (route.query.expired === '1') {
      message.warning('登录身份已过期，请重新登录')
      const url = new URL(window.location.href)
      url.searchParams.delete('expired')
      window.history.replaceState({}, '', url.toString())
    }

    if (route.query.email) {
      form.value.email = route.query.email as string
    }
  })

  return {
    aliyunCaptchaRef,
    captchaRef,
    esaLoading,
    form,
    handleEsaFail,
    handleEsaSuccess,
    handlePasskeyLogin,
    handleSubmit,
    isPasskeySupported,
    loading,
    loginMode,
    passkeyLoading,
    showPassword,
  }
}
