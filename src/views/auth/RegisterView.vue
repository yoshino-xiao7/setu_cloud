<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import { register } from '@/api/auth'
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
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
  captchaCode: '',
  captchaUuid: ''
})

const loading = ref(false)
const captchaRef = ref()
const aliyunCaptchaRef = ref()

const showPwd = ref(false)
const showConfirmPwd = ref(false)

// ✅ 表单校验
const validateForm = () => {
  if (!form.value.email.trim()) {
    message.warning('请填写邮箱')
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
const handleEsaSuccess = async (captchaVerifyParam: string) => {
  await doRegister(captchaVerifyParam)
}

// ✅ ESA验证失败回调
const handleEsaFail = (result: any) => {
  console.error('ESA验证失败', result)
  message.error('安全验证失败，请重试')
}

// ✅ 实际注册逻辑
const doRegister = async (_esaToken: string) => {
  if (!validateForm()) return

  loading.value = true
  try {
    await register({
      email: form.value.email.trim(),
      password: form.value.password,
      captchaCode: form.value.captchaCode,
      captchaUuid: form.value.captchaUuid
    })

    message.success('注册成功，请前往邮箱验证')

    router.push({
      path: '/login',
      query: { email: form.value.email.trim() }
    })

  } catch (e: any) {
    console.error('注册失败: ', e)
    const msg = e?.response?.data?.message || e?.message || '注册失败，请稍后再试'
    message.error(msg)

    captchaRef.value?.refresh()
    form.value.captchaCode = ''
    aliyunCaptchaRef.value?.reset()
  } finally {
    loading.value = false
  }
}

// ✅ 表单提交（ESA会拦截按钮点击）
const handleSubmit = () => {
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
          <n-icon size="18" class="input-icon"><MailOutline /></n-icon>
          <input
            v-model="form.email"
            type="email"
            class="auth-input with-icon"
            placeholder="name@example.com"
            autocomplete="email"
          />
        </div>
      </div>

      <div class="auth-input-group">
        <label class="auth-label">密码</label>
        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><LockClosedOutline /></n-icon>
          <input
            v-model="form.password"
            :type="showPwd ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="至少 6 位"
            autocomplete="new-password"
          />
          <div class="eye-btn" @click="showPwd = !showPwd">
            <n-icon size="20" v-if="showPwd"><EyeOffOutline /></n-icon>
            <n-icon size="20" v-else><EyeOutline /></n-icon>
          </div>
        </div>
      </div>

      <div class="auth-input-group">
        <label class="auth-label">确认密码</label>
        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><LockClosedOutline /></n-icon>
          <input
            v-model="form.confirmPassword"
            :type="showConfirmPwd ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="再次输入密码"
            autocomplete="new-password"
          />
          <div class="eye-btn" @click="showConfirmPwd = !showConfirmPwd">
            <n-icon size="20" v-if="showConfirmPwd"><EyeOffOutline /></n-icon>
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
        button-id="#register-btn"
        element-id="#esa-captcha-element"
        @success="handleEsaSuccess"
        @fail="handleEsaFail"
      />

      <button
        id="register-btn"
        class="auth-btn"
        type="button"
        :disabled="loading"
        :class="{ 'is-loading': loading }"
      >
        <span v-if="!loading">立即注册</span>
        <span v-else class="loading-dots">提交中<span>.</span><span>.</span><span>.</span></span>
      </button>

    </form>

    <template #footer>
      <div class="footer-content">
        已有账号？
        <span class="auth-link" @click="router.push('/login')">直接登录</span>
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
}
.eye-btn:hover { color: #64748b; }

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