<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
// 确保你的 api 路径是正确的
import { register } from '@/api/auth'
// 1. 引入统一布局组件
import AuthLayout from '@/components/AuthLayout.vue'

const router = useRouter()
const message = useMessage()

const form = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)

const handleSubmit = async () => {
  if (!form.value.email.trim()) {
    message.warning('请填写邮箱')
    return
  }
  if (!form.value.password) {
    message.warning('请填写密码')
    return
  }
  if (form.value.password.length < 6) {
    message.warning('密码长度不能少于 6 位')
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await register({
      email: form.value.email.trim(),
      password: form.value.password
    })

    message.success('注册成功，请前往邮箱点击验证链接后再登录')
    // 注册完成后跳到登录页
    router.push({ name: 'login', query: { email: form.value.email.trim() } })
  } catch (e: any) {
    console.error('注册失败: ', e)
    const data = e?.response?.data
    let msg: string | undefined

    // 保持你原有的错误解析逻辑不变
    if (data) {
      if (typeof data === 'string') {
        msg = data
      } else if (typeof data.message === 'string') {
        msg = data.message
      } else if (typeof data.msg === 'string') {
        msg = data.msg
      } else if (typeof data.error === 'string') {
        msg = data.error
      } else if (typeof data.detail === 'string') {
        msg = data.detail
      }
    }

    if (!msg && typeof e?.message === 'string') {
      msg = e.message
    }

    message.error(msg || '注册失败，请稍后再试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    title="注册新账号"
    subtitle="邮箱注册，完成后需前往邮箱验证后才能登录"
  >

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="auth-input-group">
        <label class="auth-label">邮箱</label>
        <input
          v-model="form.email"
          type="email"
          class="auth-input"
          placeholder="name@example.com"
        />
      </div>

      <div class="auth-input-group">
        <label class="auth-label">密码</label>
        <input
          v-model="form.password"
          type="password"
          class="auth-input"
          placeholder="至少 6 位"
        />
      </div>

      <div class="auth-input-group">
        <label class="auth-label">确认密码</label>
        <input
          v-model="form.confirmPassword"
          type="password"
          class="auth-input"
          placeholder="再次输入密码"
        />
      </div>

      <button class="auth-btn" type="submit" :disabled="loading">
        {{ loading ? '注册中...' : '立即注册' }}
      </button>
    </form>

    <template #footer>
      <span></span>
      <div style="font-size: 13px;">
        已有账号？
        <span class="auth-link" @click="router.push('/login')">去登录</span>
      </div>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* 这里不需要写任何 CSS 了！
  所有的样式（毛玻璃、输入框、按钮、响应式适配）
  都已经在 AuthLayout.vue 里统一管理了。
*/
</style>