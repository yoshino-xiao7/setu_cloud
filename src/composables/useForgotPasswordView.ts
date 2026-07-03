import { useHead } from '@vueuse/head'
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { forgotPassword } from '@/api/auth'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { safePush } from '@/utils/navigation'

interface CaptchaExpose {
  refresh: () => void
}

interface AliyunCaptchaExpose {
  reset: () => void
}

export function useForgotPasswordView() {
  useHead({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  })

  const router = useRouter()
  const message = useMessage()
  const email = ref('')
  const captchaCode = ref('')
  const captchaUuid = ref('')
  const loading = ref(false)
  const captchaRef = ref<CaptchaExpose>()
  const aliyunCaptchaRef = ref<AliyunCaptchaExpose>()

  function validateForm() {
    if (!email.value.trim()) {
      message.warning('请填写注册邮箱')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (!emailRegex.test(email.value)) {
      message.warning('请输入正确的邮箱格式')
      return false
    }
    if (!captchaCode.value) {
      message.warning('请输入验证码')
      return false
    }
    return true
  }

  async function doForgotPassword(_esaToken: string) {
    if (!validateForm())
      return

    loading.value = true
    try {
      await forgotPassword({
        email: email.value.trim(),
        captchaCode: captchaCode.value,
        captchaUuid: captchaUuid.value,
      })

      message.success('邮件已发送！请查收您的收件箱（包括垃圾邮件）')
      setTimeout(() => {
        void safePush(router, { name: 'login' })
      }, 2000)
    }
    catch (error) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(message, error, '请求失败，请稍后再试')

      captchaRef.value?.refresh()
      captchaCode.value = ''
      aliyunCaptchaRef.value?.reset()
    }
    finally {
      loading.value = false
    }
  }

  async function handleEsaSuccess(captchaVerifyParam: string) {
    await doForgotPassword(captchaVerifyParam)
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
    captchaCode,
    captchaRef,
    captchaUuid,
    email,
    handleEsaFail,
    handleEsaSuccess,
    handleSubmit,
    loading,
  }
}
