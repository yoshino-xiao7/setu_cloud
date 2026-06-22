<script setup lang="ts">
import {
  EyeOffOutline,
  EyeOutline,
  LockClosedOutline,
  MailOutline,
  QrCodeOutline,
} from '@vicons/ionicons5'
import { useHead } from '@vueuse/head'
import { NIcon, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'

import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { safePush } from '@/utils/navigation'

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const router = useRouter()
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
  captchaCode: '',
  captchaUuid: '',
})

const loading = ref(false)
const esaLoading = ref(false)
const captchaRef = ref()
const aliyunCaptchaRef = ref()

const showPwd = ref(false)
const showConfirmPwd = ref(false)

// ✅ 表单校验
function validateForm() {
  if (!form.value.email.trim()) {
    message.warning('请填写邮箱')
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  if (!emailRegex.test(form.value.email)) {
    message.warning('请输入正确的邮箱格式')
    return false
  }
  if (!form.value.password) {
    message.warning('请填写密码')
    return false
  }
  if (form.value.password.length < 6) {
    message.warning('密码长度不能少于 6 位')
    return false
  }
  if (form.value.password !== form.value.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return false
  }
  if (!form.value.captchaCode) {
    message.warning('请输入验证码')
    return false
  }
  return true
}

// ✅ ESA验证成功回调 - 验证通过后执行实际注册
async function handleEsaSuccess(captchaVerifyParam: string) {
  await doRegister(captchaVerifyParam)
}

// ✅ ESA验证失败回调
function handleEsaFail(_result: { code?: string, message?: string }) {
  message.error('安全验证失败，请重试')
}

// ✅ 实际注册逻辑
async function doRegister(_esaToken: string) {
  if (!validateForm())
    return

  loading.value = true
  try {
    await register({
      email: form.value.email.trim(),
      password: form.value.password,
      captchaCode: form.value.captchaCode,
      captchaUuid: form.value.captchaUuid,
    })

    message.success('注册成功，请前往邮箱验证')

    void safePush(router, {
      path: '/login',
      query: { email: form.value.email.trim() },
    })
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '注册失败，请稍后再试')

    captchaRef.value?.refresh()
    form.value.captchaCode = ''
    aliyunCaptchaRef.value?.reset()
  }
  finally {
    loading.value = false
  }
}

// ✅ 表单提交（ESA会拦截按钮点击）
function handleSubmit() {
  if (!validateForm()) {
    return false
  }
}
</script>

<template>
  <AuthLayout
    title="注册新账号"
    subtitle="加入雪涼云，开始构建你的应用"
  >
    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="auth-input-group">
        <label class="auth-label">邮箱</label>
        <div class="input-wrapper">
          <NIcon size="18" class="input-icon">
            <MailOutline />
          </NIcon>
          <input
            v-model="form.email"
            type="email"
            class="auth-input with-icon"
            placeholder="name@example.com"
            autocomplete="email"
          >
        </div>
      </div>

      <div class="auth-input-group">
        <label class="auth-label">密码</label>
        <div class="input-wrapper">
          <NIcon size="18" class="input-icon">
            <LockClosedOutline />
          </NIcon>
          <input
            v-model="form.password"
            :type="showPwd ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="至少 6 位"
            autocomplete="new-password"
          >
          <button type="button" class="eye-btn" :aria-label="showPwd ? '隐藏密码' : '显示密码'" @click="showPwd = !showPwd">
            <NIcon v-if="showPwd" size="20">
              <EyeOffOutline />
            </NIcon>
            <NIcon v-else size="20">
              <EyeOutline />
            </NIcon>
          </button>
        </div>
      </div>

      <div class="auth-input-group">
        <label class="auth-label">确认密码</label>
        <div class="input-wrapper">
          <NIcon size="18" class="input-icon">
            <LockClosedOutline />
          </NIcon>
          <input
            v-model="form.confirmPassword"
            :type="showConfirmPwd ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="再次输入密码"
            autocomplete="new-password"
          >
          <button type="button" class="eye-btn" :aria-label="showConfirmPwd ? '隐藏确认密码' : '显示确认密码'" @click="showConfirmPwd = !showConfirmPwd">
            <NIcon v-if="showConfirmPwd" size="20">
              <EyeOffOutline />
            </NIcon>
            <NIcon v-else size="20">
              <EyeOutline />
            </NIcon>
          </button>
        </div>
      </div>

      <div class="auth-input-group">
        <label class="auth-label">验证码</label>
        <div class="captcha-row">
          <div class="input-wrapper flex-1">
            <NIcon size="18" class="input-icon">
              <QrCodeOutline />
            </NIcon>
            <input
              v-model="form.captchaCode"
              type="text"
              class="auth-input with-icon"
              placeholder="区分大小写"
              maxlength="5"
              autocomplete="off"
            >
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
        button-id="#register-btn"
        element-id="#esa-captcha-element"
        @success="handleEsaSuccess"
        @fail="handleEsaFail"
        @loading="(value) => esaLoading = value"
      />

      <button
        id="register-btn"
        class="auth-btn"
        type="button"
        :disabled="loading || esaLoading"
        :class="{ 'is-loading': loading }"
      >
        <span v-if="esaLoading">安全验证加载中</span>
        <span v-else-if="!loading">立即注册</span>
        <span v-else class="loading-dots">提交中<span>.</span><span>.</span><span>.</span></span>
      </button>
    </form>

    <template #footer>
      <div class="footer-content">
        已有账号？
        <router-link to="/login" class="auth-link">
          直接登录
        </router-link>
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

.auth-input.with-icon { padding-left: 40px !important; }
.auth-input.with-eye { padding-right: 40px !important; }

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
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}
.eye-btn:hover { color: #64748b; }
.eye-btn:focus-visible {
  outline: 2px solid #f586a9;
  outline-offset: 2px;
  border-radius: 4px;
}

.loading-dots span { animation: blink 1.4s infinite both; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}
.auth-btn.is-loading { opacity: 0.8; cursor: wait; }

.footer-content {
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
