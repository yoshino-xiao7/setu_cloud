<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage, NIcon } from 'naive-ui'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'

import {
  MailOutline,
  LockClosedOutline,
  EyeOutline,
  EyeOffOutline,
  QrCodeOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: '',
  captchaCode: '',
  captchaUuid: ''
})

const loading = ref(false)
const esaLoading = ref(false)
const showPassword = ref(false)
const captchaRef = ref()
const aliyunCaptchaRef = ref()

// ✅ ESA验证成功回调 - 验证通过后执行实际登录
const handleEsaSuccess = async (captchaVerifyParam: string) => {
  await doLogin(captchaVerifyParam)
}

// ✅ ESA验证失败回调
const handleEsaFail = (result: any) => {
  console.error('ESA验证失败', result)
  message.error('安全验证失败，请重试')
}

// ✅ 表单校验（点击按钮前的前置校验）
const validateForm = () => {
  if (!form.value.email || !form.value.password) {
    message.warning('请输入邮箱和密码')
    return false
  }
  if (!form.value.captchaCode) {
    message.warning('请输入验证码')
    return false
  }
  return true
}

// ✅ 实际登录逻辑
const doLogin = async (_esaToken: string) => {
  // 再次校验（防止ESA回调时表单已被清空）
  if (!validateForm()) return

  loading.value = true
  try {
    await auth.login(
      form.value.email,
      form.value.password,
      form.value.captchaCode,
      form.value.captchaUuid
    )

    message.success('登录成功，欢迎回来')

    await new Promise(resolve => setTimeout(resolve, 100))

    const redirectParam = route.query.redirect as string
    if (redirectParam) {
      await router.replace(redirectParam)
    } else {
      if (auth.user?.role === 1) {
        await router.replace('/admin/overview')
      } else {
        await router.replace('/dashboard')
      }
    }
  } catch (e: any) {
    console.error(e)
    message.error(e?.response?.data?.message || '登录失败，请检查账号密码或验证码')

    // 失败处理：刷新验证码
    captchaRef.value?.refresh()
    form.value.captchaCode = ''
    aliyunCaptchaRef.value?.reset()
  } finally {
    loading.value = false
  }
}

// ✅ 表单提交 - 在ESA无痕模式下，这个函数由ESA SDK接管
// 但我们需要在点击前做表单校验
const handleSubmit = () => {
  // 只做表单校验,不直接登录
  // ESA验证码会拦截按钮点击，验证成功后触发 handleEsaSuccess
  if (!validateForm()) {
    // 阻止ESA触发
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
</script>

<template>
  <AuthLayout
    title="雪涼云 API 控制台"
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

      <!-- ✅ ESA验证码容器（隐藏） -->
      <AliyunCaptcha
        ref="aliyunCaptchaRef"
        button-id="#login-btn"
        element-id="#esa-captcha-element"
        @success="handleEsaSuccess"
        @fail="handleEsaFail"
        @loading="(value) => esaLoading = value"
      />

      <button
        id="login-btn"
        class="auth-btn"
        type="button"
        :disabled="loading || esaLoading"
        :class="{ 'is-loading': loading }"
      >
        <span v-if="esaLoading">安全验证加载中</span>
        <span v-else-if="!loading">立即登录</span>
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
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
  z-index: 2;
  transition: color 0.3s;
  pointer-events: none;
}

.auth-input.with-icon {
  padding-left: 40px !important;
}

.auth-input.with-eye {
  padding-right: 40px !important;
}

.input-wrapper:focus-within .input-icon {
  color: #f586a9;
}

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

.auth-btn.is-loading {
  opacity: 0.8;
  cursor: wait;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-wrapper.flex-1 {
  flex: 1;
}
</style>
