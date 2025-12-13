<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import { Message } from '@/Message'
import AuthLayout from '@/components/AuthLayout.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const message = useMessage()

const form = ref({
  email: '',
  password: ''
})
const loading = ref(false)

const handleSubmit = async () => {
  if (!form.value.email || !form.value.password) {
    message.warning('请填写邮箱和密码')
    return
  }
  loading.value = true
  try {
    // 1. 调用登录接口
    await auth.login(form.value.email, form.value.password)
    message.success('登录成功')

    // 2. 处理跳转逻辑 (修改了这里)
    const redirectParam = route.query.redirect as string

    if (redirectParam) {
      // A. 如果 URL 里有 redirect 参数 (比如从 /admin 被踢出来的)，直接跳回去
      router.push(redirectParam)
    } else {
      // B. 如果是直接登录，根据角色分流
      // auth.user 在登录成功后应该已经被 Pinia 更新了
      if (auth.user?.role === 1) {
        router.push('/admin/overview') // 管理员 -> 后台概览
      } else {
        router.push('/dashboard')      // 普通用户 -> 仪表盘
      }
    }

  } catch (e: any) {
    console.error(e)
    message.error(e?.response?.data?.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}

// 处理过期提示逻辑 (保持不变)
onMounted(() => {
  if (route.query.expired === '1') {
    Message.warning('登录身份已过期，请重新登录');
    const newQuery = { ...route.query };
    delete newQuery.expired;
    router.replace({ query: newQuery });
  }

  if (route.query.email) {
    form.value.email = route.query.email as string
  }
});
</script>

<template>
  <AuthLayout
    title="Setu API 控制台"
    subtitle="管理你的 API Key 与账户"
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
          placeholder="••••••••"
        />
      </div>

      <button class="auth-btn" type="submit" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </form>

    <template #footer>
      <span class="auth-link" @click="router.push('/register')">注册新账号</span>
      <span class="auth-link" @click="router.push('/forgot-password')">忘记密码？</span>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* 样式已全部移交 AuthLayout，此处留空即可 */
</style>