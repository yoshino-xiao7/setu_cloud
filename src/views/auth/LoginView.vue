<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage, NIcon } from 'naive-ui'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue' // ✅ 引入验证码组件

// 图标引入
import {
  MailOutline,
  LockClosedOutline,
  EyeOutline,
  EyeOffOutline,
  QrCodeOutline // ✅ 引入验证码图标
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: '',
  captchaCode: '', // ✅ 用户输入的验证码
  captchaUuid: ''  // ✅ 组件传回来的 UUID
})

const loading = ref(false)
const showPassword = ref(false) // 控制密码显示/隐藏
const captchaRef = ref() // ✅ 用于手动刷新验证码

// 提交逻辑
const handleSubmit = async () => {
  if (!form.value.email || !form.value.password) {
    message.warning('请输入邮箱和密码')
    return
  }
  // ✅ 1. 验证码非空检查
  if (!form.value.captchaCode) {
    message.warning('请输入验证码')
    return
  }

  loading.value = true
  try {
    // ✅ 2. 调用登录，传入 4 个参数 (需确保 auth.ts 的 action 已更新支持这些参数)
    await auth.login(
      form.value.email,
      form.value.password,
      form.value.captchaCode,
      form.value.captchaUuid
    )

    message.success('登录成功，欢迎回来')

    // 🔥 3. 关键修复：等待一个宏任务，确保 localStorage 完全写入
    await new Promise(resolve => setTimeout(resolve, 100))

    // 4. 智能跳转逻辑
    const redirectParam = route.query.redirect as string

    if (redirectParam) {
      await router.replace(redirectParam)  // 🔥 改为 replace 避免多一次历史记录
    } else {
      if (auth.user?.role === 1) {
        await router.replace('/admin/overview')  // 🔥 改为 replace
      } else {
        await router.replace('/dashboard')  // 🔥 改为 replace
      }
    }
  } catch (e: any) {
    console.error(e)
    message.error(e?.response?.data?.message || '登录失败，请检查账号密码或验证码')

    // ❌ 5. 失败处理：必须刷新验证码 (防止重放攻击)，并清空输入框
    captchaRef.value?.refresh()
    form.value.captchaCode = ''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 🔥 关键修复：处理过期参数后，立即清除它，防止干扰登录后的跳转
  if (route.query.expired === '1') {
    message.warning('登录身份已过期，请重新登录')
    // 直接使用 window.history.replaceState 清除参数，不触发路由跳转
    const url = new URL(window.location.href)
    url.searchParams.delete('expired')
    window.history.replaceState({}, '', url.toString())
  }

  // 预填邮箱
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

      <div class="auth-input-group">
        <label class="auth-label">验证码</label>
        <div class="captcha-row">
          <div class="input-wrapper flex-1">
            <n-icon size="18" class="input-icon"><QrCodeOutline /></n-icon>
            <input
              v-model="form.captchaCode"
              type="text"
              class="auth-input with-icon"
              placeholder="区分大小写"
              maxlength="5"
              autocomplete="off"
            />
          </div>
          <SecureCaptcha
            ref="captchaRef"
            @update:uuid="(uuid) => form.captchaUuid = uuid"
          />
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
  color: #f586a9;
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

/* ✅ 新增布局样式：验证码行 */
.captcha-row {
  display: flex;
  align-items: center;
  gap: 12px; /* 输入框和图片之间的间距 */
}

/* ✅ 让输入框占满剩余空间 */
.input-wrapper.flex-1 {
  flex: 1;
}
</style>