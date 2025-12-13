<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
// 确保 API 路径正确
import { resetPassword } from '@/api/auth'
// 1. 引入统一布局组件
import AuthLayout from '@/components/AuthLayout.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const token = ref<string | null>(null)

const form = ref({
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)

onMounted(() => {
  // 从 URL 获取 token
  const t = route.query.token
  token.value = typeof t === 'string' ? t : null

  // 如果没有 token，提示错误
  if (!token.value) {
    message.error('链接无效：缺少重置令牌，请重新请求重置密码邮件')
  }
})

const handleSubmit = async () => {
  if (!token.value) {
    message.error('重置链接无效或已过期，请重新请求重置密码')
    return
  }

  if (!form.value.newPassword) {
    message.warning('请填写新密码')
    return
  }
  if (form.value.newPassword.length < 6) {
    message.warning('密码长度不能少于 6 位')
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await resetPassword({
      token: token.value,
      newPassword: form.value.newPassword
    })
    message.success('密码已重置，请使用新密码登录')

    // 成功后延迟跳转登录页
    setTimeout(() => {
      router.push({ name: 'login' })
    }, 1500)
  } catch (e: any) {
    console.error('重置密码失败：', e)
    const data = e?.response?.data
    let msg: string | undefined

    if (data) {
      if (typeof data === 'string') msg = data
      else if (typeof data.message === 'string') msg = data.message
      else if (typeof data.msg === 'string') msg = data.msg
      else if (typeof data.error === 'string') msg = data.error
    }

    if (!msg && typeof e?.message === 'string') {
      msg = e.message
    }

    message.error(msg || '重置失败，请重新请求重置密码邮件')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    title="设置新密码"
    subtitle="请为你的账号设置一个新的密码"
  >

    <div v-if="!token" class="token-error">
      链接无效或参数缺失，请重新请求重置密码邮件。
    </div>

    <form v-else class="auth-form" @submit.prevent="handleSubmit">
      <div class="auth-input-group">
        <label class="auth-label">新密码</label>
        <input
          v-model="form.newPassword"
          type="password"
          class="auth-input"
          placeholder="至少 6 位"
        />
      </div>

      <div class="auth-input-group">
        <label class="auth-label">确认新密码</label>
        <input
          v-model="form.confirmPassword"
          type="password"
          class="auth-input"
          placeholder="再次输入新密码"
        />
      </div>

      <button class="auth-btn" type="submit" :disabled="loading">
        {{ loading ? '提交中...' : '确认修改' }}
      </button>
    </form>

    <template #footer>
      <span></span>
      <div style="font-size: 13px;">
        已重置？
        <span class="auth-link" @click="router.push('/login')">去登录</span>
      </div>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* AuthLayout 已经处理了大部分样式。
  这里只需要给“无效链接”的错误提示加一点样式即可
*/
.token-error {
  padding: 16px;
  background: rgba(254, 226, 226, 0.6); /* 淡红色背景，带透明度 */
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #b91c1c;
  border-radius: 12px;
  font-size: 14px;
  text-align: center;
  backdrop-filter: blur(4px);
  margin-bottom: 10px;
}
</style>