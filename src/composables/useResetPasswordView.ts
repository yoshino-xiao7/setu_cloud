import { useHead } from '@vueuse/head'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '@/api/auth'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

export function useResetPasswordView() {
  useHead({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  })

  const route = useRoute()
  const router = useRouter()
  const message = useMessage()
  const auth = useAuthStore()
  const token = ref<string | null>(null)
  const form = ref({
    newPassword: '',
    confirmPassword: '',
  })
  const loading = ref(false)
  const showPwd = ref(false)
  const showConfirmPwd = ref(false)

  onMounted(() => {
    const tokenQuery = route.query.token
    token.value = typeof tokenQuery === 'string' ? tokenQuery : null
  })

  async function handleSubmit() {
    if (!token.value) {
      message.error('重置链接无效，请重新操作')
      return
    }
    if (!form.value.newPassword)
      return message.warning('请填写新密码')
    if (form.value.newPassword.length < 6)
      return message.warning('密码长度至少 6 位')
    if (form.value.newPassword !== form.value.confirmPassword)
      return message.warning('两次密码输入不一致')

    loading.value = true
    try {
      await resetPassword({
        token: token.value,
        newPassword: form.value.newPassword,
      })
      auth.clearLocalState()
      message.success('密码已重置，请重新登录')
      await safePush(router, { name: 'login' })
    }
    catch (error) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(message, error, '重置失败，请链接可能已过期')
    }
    finally {
      loading.value = false
    }
  }

  function goForgotPassword() {
    void safePush(router, '/forgot-password')
  }

  function goLogin() {
    void safePush(router, '/login')
  }

  return {
    form,
    goForgotPassword,
    goLogin,
    handleSubmit,
    loading,
    showConfirmPwd,
    showPwd,
    token,
  }
}
