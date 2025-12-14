<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage, NIcon } from 'naive-ui'
import { Message } from '@/Message' // 假设你有一个封装的 Message
import AuthLayout from '@/components/AuthLayout.vue'

// 图标引入
import {
  MailOutline,
  LockClosedOutline,
  EyeOutline,
  EyeOffOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false) // 控制密码显示/隐藏

// 提交逻辑
const handleSubmit = async () => {
  if (!form.value.email || !form.value.password) {
    message.warning('请输入邮箱和密码')
    return
  }

  loading.value = true
  try {
    // 1. 调用登录
    await auth.login(form.value.email, form.value.password)
    message.success('登录成功，欢迎回来')

    // 2. 智能跳转逻辑
    const redirectParam = route.query.redirect as string

    if (redirectParam) {
      // 情况 A: 有重定向参数 (如从拦截器跳过来的)，原路返回
      router.push(redirectParam)
    } else {
      // 情况 B: 正常登录，根据角色分流
      if (auth.user?.role === 1) {
        router.push('/admin/overview') // 管理员
      } else {
        router.push('/dashboard')      // 普通用户
      }
    }
  } catch (e: any) {
    console.error(e)
    message.error(e?.response?.data?.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 处理过期参数
  if (route.query.expired === '1') {
    // 这里最好用 naive-ui 的 message，保持风格统一
    message.warning('登录身份已过期，请重新登录')
    // 清除 URL 里的 expired 参数，看着干净
    router.replace({ query: { ...route.query, expired: undefined } })
  }

  // 预填邮箱 (如注册成功后跳转过来)
  if (route.query.email) {
    form.value.email = route.query.email as string
  }
})
</script>

<template>
  <AuthLayout
    title="Setu API 控制台"
    subtitle="请登录以管理您的 API Key"
  >
    <form class="auth-form" @submit.prevent="handleSubmit">

      <div class="auth-input-group">
        <label class="auth-label">邮箱</label>
        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><MailOutline /></n-icon>
          <input
            v-model="form.email"
            type="email"
            class="auth-input with-icon"
            placeholder="name@example.com"
            autocomplete="username"
          />
        </div>
      </div>

      <div class="auth-input-group">
        <div class="label-row">
          <label class="auth-label">密码</label>
          </div>

        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><LockClosedOutline /></n-icon>
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="••••••••"
            autocomplete="current-password"
          />
          <div class="eye-btn" @click="showPassword = !showPassword">
            <n-icon size="20" v-if="showPassword"><EyeOffOutline /></n-icon>
            <n-icon size="20" v-else><EyeOutline /></n-icon>
          </div>
        </div>
      </div>

      <button
        class="auth-btn"
        type="submit"
        :disabled="loading"
        :class="{ 'is-loading': loading }"
      >
        <span v-if="!loading">立即登录</span>
        <span v-else class="loading-dots">登录中<span>.</span><span>.</span><span>.</span></span>
      </button>

    </form>

    <template #footer>
      <span class="auth-link" @click="router.push('/register')">注册新账号</span>
      <span class="auth-link" @click="router.push('/forgot-password')">忘记密码？</span>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* 虽然 AuthLayout 提供了基础样式，
   但我们需要在这里定义【输入框内部图标】的布局
*/

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* 左侧图标 */
.input-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
  z-index: 2; /* 确保在输入框上面 */
  transition: color 0.3s;
  pointer-events: none; /* 让点击穿透到 input */
}

/* 针对带有图标的输入框，增加左内边距 */
.auth-input.with-icon {
  padding-left: 40px !important; /* 留出图标位置 */
}

/* 针对带有眼睛的输入框，增加右内边距 */
.auth-input.with-eye {
  padding-right: 40px !important;
}

/* 输入框聚焦时，让左侧图标也变色 */
.auth-input:focus + .input-icon, /* 这里 CSS 选不到前面的兄弟，所以通常用 focus-within 或 JS */
.input-wrapper:focus-within .input-icon {
  color: #8b5cf6;
}

/* 右侧小眼睛按钮 */
.eye-btn {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
  z-index: 3;
}
.eye-btn:hover {
  color: #64748b;
}

/* 简单的 loading 动画点 */
.loading-dots span {
  animation: blink 1.4s infinite both;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

/* 按钮 Loading 状态微调 */
.auth-btn.is-loading {
  opacity: 0.8;
  cursor: wait;
}
</style>