<script setup lang="ts">
import { get } from '@github/webauthn-json'
import {
  EyeOffOutline,
  EyeOutline,
  FingerPrintOutline,
  LockClosedOutline,
  MailOutline,
  QrCodeOutline,
} from '@vicons/ionicons5'
import { useHead } from '@vueuse/head'
import { NIcon, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  beginPasskeyAuthentication,
  isPasskeyCancelError,
  isPasskeySupported,
  normalizePasskeyRequestOptions,
} from '@/api/passkey'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

import { useAuthStore, UserRole } from '@/stores/auth'
import { safeReplace } from '@/utils/navigation'

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: '',
  captchaCode: '',
  captchaUuid: '',
})

const loading = ref(false)
const esaLoading = ref(false)
const passkeyLoading = ref(false)
const showPassword = ref(false)
const loginMode = ref<'password' | 'passkey'>('password')
const captchaRef = ref()
const aliyunCaptchaRef = ref()

// ✅ ESA验证成功回调 - 验证通过后执行实际登录
async function handleEsaSuccess(captchaVerifyParam: string) {
  await doLogin(captchaVerifyParam)
}

// ✅ ESA验证失败回调
function handleEsaFail(_result: { code?: string, message?: string }) {
  message.error('安全验证失败，请重试')
}

// ✅ 表单校验（点击按钮前的前置校验）
function validateForm() {
  if (!form.value.email || !form.value.password) {
    message.warning('请输入邮箱和密码')
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  if (!emailRegex.test(form.value.email)) {
    message.warning('请输入正确的邮箱格式')
    return false
  }
  if (!form.value.captchaCode) {
    message.warning('请输入验证码')
    return false
  }
  return true
}

// ✅ 实际登录逻辑
async function doLogin(_esaToken: string) {
  // 再次校验（防止ESA回调时表单已被清空）
  if (!validateForm())
    return

  loading.value = true
  try {
    await auth.login(
      form.value.email,
      form.value.password,
      form.value.captchaCode,
      form.value.captchaUuid,
    )

    message.success('登录成功，欢迎回来')

    await redirectAfterLogin()
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '登录失败，请检查账号密码或验证码')

    // 失败处理：刷新验证码
    captchaRef.value?.refresh()
    form.value.captchaCode = ''
    aliyunCaptchaRef.value?.reset()
  }
  finally {
    loading.value = false
  }
}

async function redirectAfterLogin() {
  await new Promise(resolve => setTimeout(resolve, 100))

  const redirectParam = route.query.redirect as string
  if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
    await safeReplace(router, redirectParam)
  }
  else {
    if (auth.user?.role === UserRole.Admin) {
      await safeReplace(router, '/admin/overview')
    }
    else {
      await safeReplace(router, '/dashboard')
    }
  }
}

function getPasskeyBusinessCode(error: unknown) {
  if (!error || typeof error !== 'object')
    return ''
  const anyError = error as { response?: { data?: { code?: string } } }
  return anyError.response?.data?.code || ''
}

function getPasskeyLoginError(error: unknown) {
  if (isPasskeyCancelError(error))
    return '已取消通行密钥验证'

  const code = getPasskeyBusinessCode(error)
  if (code === 'PASSKEY_EMAIL_NOT_VERIFIED')
    return '请先完成邮箱验证后再使用通行密钥'
  if (code === 'PASSKEY_ASSERTION_FAILED')
    return '通行密钥验证失败，请重试'
  if (code === 'PASSKEY_LOGIN_NOT_AVAILABLE')
    return '通行密钥登录不可用，请切回账号密码登录'
  if (code === 'PASSKEY_CHALLENGE_EXPIRED')
    return '验证已过期，请重新发起通行密钥登录'

  return getApiErrorMessage(error, '通行密钥登录失败')
}

async function handlePasskeyLogin() {
  if (!isPasskeySupported()) {
    message.warning('当前浏览器或环境不支持通行密钥')
    return
  }

  passkeyLoading.value = true
  try {
    const options = await beginPasskeyAuthentication()
    const credential = await get(normalizePasskeyRequestOptions(options.publicKey))
    await auth.loginWithPasskey(options.challengeId, credential)
    message.success('登录成功，欢迎回来')
    await redirectAfterLogin()
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    const text = getPasskeyLoginError(e)
    if (isPasskeyCancelError(e))
      message.warning(text)
    else if (getPasskeyBusinessCode(e))
      message.error(text)
    else
      showApiError(message, e, '通行密钥登录失败')
  }
  finally {
    passkeyLoading.value = false
  }
}

// ✅ 表单提交 - 在ESA无痕模式下，这个函数由ESA SDK接管
// 但我们需要在点击前做表单校验
function handleSubmit() {
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
    <div class="auth-mode-tabs">
      <button
        type="button"
        class="auth-mode-btn"
        :class="{ active: loginMode === 'password' }"
        @click="loginMode = 'password'"
      >
        账号密码
      </button>
      <button
        type="button"
        class="auth-mode-btn"
        :class="{ active: loginMode === 'passkey' }"
        @click="loginMode = 'passkey'"
      >
        通行密钥
      </button>
    </div>

    <form v-if="loginMode === 'password'" class="auth-form" @submit.prevent="handleSubmit">
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
            autocomplete="username"
          >
        </div>
      </div>

      <div class="auth-input-group">
        <div class="label-row">
          <label class="auth-label">密码</label>
        </div>
        <div class="input-wrapper">
          <NIcon size="18" class="input-icon">
            <LockClosedOutline />
          </NIcon>
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="••••••••"
            autocomplete="current-password"
          >
          <button type="button" class="eye-btn" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
            <NIcon v-if="showPassword" size="20">
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

    <div v-else class="passkey-panel">
      <div class="passkey-mark">
        <NIcon size="30">
          <FingerPrintOutline />
        </NIcon>
      </div>
      <p v-if="!isPasskeySupported()" class="passkey-hint">
        当前浏览器或环境不支持通行密钥，请使用 HTTPS 或 localhost 访问。
      </p>
      <button
        type="button"
        class="auth-btn passkey-btn"
        :disabled="passkeyLoading || !isPasskeySupported()"
        :class="{ 'is-loading': passkeyLoading }"
        @click="handlePasskeyLogin"
      >
        <span v-if="!passkeyLoading">使用通行密钥登录</span>
        <span v-else class="loading-dots">验证中<span>.</span><span>.</span><span>.</span></span>
      </button>
      <button type="button" class="passkey-switch" @click="loginMode = 'password'">
        使用账号密码登录
      </button>
    </div>

    <template #footer>
      <router-link to="/register" class="auth-link">
        注册新账号
      </router-link>
      <router-link to="/forgot-password" class="auth-link">
        忘记密码？
      </router-link>
    </template>
  </AuthLayout>
</template>

<style scoped>
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 4px;
  margin-bottom: 18px;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.78);
  border: 1px solid rgba(226, 232, 240, 0.78);
}

.auth-mode-btn {
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  color: #64748b;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.auth-mode-btn.active {
  color: #f26d99;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.passkey-panel {
  display: grid;
  gap: 16px;
  justify-items: stretch;
}

.passkey-mark {
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  margin: 8px auto 0;
  border-radius: 999px;
  color: #f26d99;
  background: rgba(245, 134, 169, 0.12);
  border: 1px solid rgba(245, 134, 169, 0.22);
}

.passkey-btn {
  margin-top: 0;
}

.passkey-hint {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.passkey-switch {
  border: 0;
  color: #64748b;
  background: transparent;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.passkey-switch:hover {
  color: #f26d99;
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
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}
.eye-btn:hover {
  color: #64748b;
}
.eye-btn:focus-visible {
  outline: 2px solid #f586a9;
  outline-offset: 2px;
  border-radius: 4px;
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
