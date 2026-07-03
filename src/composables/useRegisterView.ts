import { useHead } from '@vueuse/head'
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { safePush } from '@/utils/navigation'

interface CaptchaExpose {
  refresh: () => void
}

interface AliyunCaptchaExpose {
  reset: () => void
}

export function useRegisterView() {
  useHead({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  })

  const router = useRouter()
  const message = useMessage()
  const form = ref({
    email: '',
    password: '',
    confirmPassword: '',
    captchaCode: '',
    captchaUuid: '',
  })
  const loading = ref(false)
  const esaLoading = ref(false)
  const captchaRef = ref<CaptchaExpose>()
  const aliyunCaptchaRef = ref<AliyunCaptchaExpose>()
  const showPwd = ref(false)
  const showConfirmPwd = ref(false)

  function validateForm() {
    if (!form.value.email.trim()) {
      message.warning('请填写邮箱')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      message.warning('请输入正确的邮箱格式')
      return false
    }
    if (!form.value.password) {
      message.warning('请填写密码')
      return false
    }
    if (form.value.password.length < 6) {
      message.warning('密码长度不能少于 6 位')
      return false
    }
    if (form.value.password !== form.value.confirmPassword) {
      message.warning('两次输入的密码不一致')
      return false
    }
    if (!form.value.captchaCode) {
      message.warning('请输入验证码')
      return false
    }
    return true
  }

  async function doRegister(_esaToken: string) {
    if (!validateForm())
      return

    loading.value = true
    try {
      await register({
        email: form.value.email.trim(),
        password: form.value.password,
        captchaCode: form.value.captchaCode,
        captchaUuid: form.value.captchaUuid,
      })

      message.success('注册成功，请前往邮箱验证')
      void safePush(router, {
        path: '/login',
        query: { email: form.value.email.trim() },
      })
    }
    catch (error) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(message, error, '注册失败，请稍后再试')

      captchaRef.value?.refresh()
      form.value.captchaCode = ''
      aliyunCaptchaRef.value?.reset()
    }
    finally {
      loading.value = false
    }
  }

  async function handleEsaSuccess(captchaVerifyParam: string) {
    await doRegister(captchaVerifyParam)
  }

  function handleEsaFail(_result: { code?: string, message?: string }) {
    message.error('安全验证失败，请重试')
  }

  function handleSubmit() {
    if (!validateForm())
      return false
  }

  return {
    aliyunCaptchaRef,
    captchaRef,
    esaLoading,
    form,
    handleEsaFail,
    handleEsaSuccess,
    handleSubmit,
    loading,
    showConfirmPwd,
    showPwd,
  }
}
