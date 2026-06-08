<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { useMessage, NIcon } from 'naive-ui'
import { forgotPassword } from '@/api/auth'
import { getApiErrorMessage } from '@/composables/useApiError'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'

import { MailOutline, QrCodeOutline } from '@vicons/ionicons5'

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const router = useRouter()
const message = useMessage()

const email = ref('')
const captchaCode = ref('')
const captchaUuid = ref('')
const loading = ref(false)
const captchaRef = ref()
const aliyunCaptchaRef = ref()

// ✅ 表单校验
const validateForm = () => {
  if (!email.value.trim()) {
    message.warning('请填写注册邮箱')
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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

// ✅ ESA验证成功回调
const handleEsaSuccess = async (captchaVerifyParam: string) => {
  await doForgotPassword(captchaVerifyParam)
}

// ✅ ESA验证失败回调
const handleEsaFail = (_result: { code?: string; message?: string }) => {
  message.error('安全验证失败，请重试')
}

// ✅ 实际重置密码逻辑
const doForgotPassword = async (_esaToken: string) => {
  if (!validateForm()) return

  loading.value = true
  try {
    await forgotPassword({
      email: email.value.trim(),
      captchaCode: captchaCode.value,
      captchaUuid: captchaUuid.value
    })

    message.success('邮件已发送！请查收您的收件箱（包括垃圾邮件）')

    setTimeout(() => {
      router.push({ name: 'login' })
    }, 2000)
  } catch (e: unknown) {
    const msg = getApiErrorMessage(e, '请求失败，请稍后再试')
    message.error(msg)

    captchaRef.value?.refresh()
    captchaCode.value = ''
    aliyunCaptchaRef.value?.reset()
  } finally {
    loading.value = false
  }
}

// ✅ 表单提交
const handleSubmit = () => {
  if (!validateForm()) {
    return false
  }
}
</script>

<template>
  <AuthLayout
    title="找回密码"
    subtitle="输入您的注册邮箱，我们将向您发送重置链接"
  >

    <form class="auth-form" @submit.prevent="handleSubmit">

      <div class="auth-input-group">
        <label class="auth-label">邮箱</label>
        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><MailOutline /></n-icon>
          <input
            v-model="email"
            type="email"
            class="auth-input with-icon"
            placeholder="name@example.com"
            autocomplete="email"
          />
        </div>
      </div>

      <div class="auth-input-group">
        <label class="auth-label">验证码</label>
        <div class="captcha-row">
          <div class="input-wrapper flex-1">
            <n-icon size="18" class="input-icon"><QrCodeOutline /></n-icon>
            <input
              v-model="captchaCode"
              type="text"
              class="auth-input with-icon"
              placeholder="区分大小写"
              maxlength="5"
              autocomplete="off"
            />
          </div>
          <SecureCaptcha
            ref="captchaRef"
            @update:uuid="(uuid) => captchaUuid = uuid"
          />
        </div>
      </div>

      <!-- ✅ ESA验证码容器（隐藏） -->
      <AliyunCaptcha
        ref="aliyunCaptchaRef"
        button-id="#forgot-btn"
        element-id="#esa-captcha-element"
        @success="handleEsaSuccess"
        @fail="handleEsaFail"
      />

      <button
        id="forgot-btn"
        class="auth-btn"
        type="button"
        :disabled="loading"
        :class="{ 'is-loading': loading }"
      >
        <span v-if="!loading">发送重置邮件</span>
        <span v-else class="loading-dots">发送中<span>.</span><span>.</span><span>.</span></span>
      </button>

    </form>

    <template #footer>
      <div class="footer-center">
        想起来密码了？
        <router-link to="/login" class="auth-link">返回登录</router-link>
      </div>
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

.input-wrapper:focus-within .input-icon {
  color: #f586a9;
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

.footer-center {
  width: 100%;
  text-align: center;
  color: #64748b;
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