<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { forgotPassword } from '@/api/auth'
// 1. 引入统一布局
import AuthLayout from '@/components/AuthLayout.vue'

const router = useRouter()
const message = useMessage()

const email = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  if (!email.value.trim()) {
    message.warning('请填写注册邮箱')
    return
  }

  loading.value = true
  try {
    await forgotPassword({ email: email.value.trim() })
    message.success('如果该邮箱已注册，我们已发送重置密码邮件，请查收')

    // 成功后延迟跳转回登录页
    setTimeout(() => {
      router.push({ name: 'login' })
    }, 1500)
  } catch (e: any) {
    console.error('请求重置密码失败：', e)
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

    message.error(msg || '请求失败，请稍后再试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    title="找回密码"
    subtitle="输入注册时使用的邮箱，我们将发送重置链接"
  >

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="auth-input-group">
        <label class="auth-label">邮箱</label>
        <input
          v-model="email"
          type="email"
          class="auth-input"
          placeholder="name@example.com"
        />
      </div>

      <button class="auth-btn" type="submit" :disabled="loading">
        {{ loading ? '发送中...' : '发送重置邮件' }}
      </button>
    </form>

    <template #footer>
      <span></span>
      <div style="font-size: 13px;">
        想起来密码了？
        <span class="auth-link" @click="router.push('/login')">返回登录</span>
      </div>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* 样式已由 AuthLayout 全局接管，此处留空即可 */
</style>