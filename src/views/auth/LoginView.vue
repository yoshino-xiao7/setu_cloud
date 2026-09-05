<script setup lang="ts">
import {
  EyeOffOutline,
  EyeOutline,
  FingerPrintOutline,
  LockClosedOutline,
  MailOutline,
  QrCodeOutline,
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'
import { useLoginView } from '@/composables/useLoginView'

const {
  aliyunCaptchaRef,
  captchaRef,
  esaLoading,
  form,
  handleEsaFail,
  handleEsaSuccess,
  handlePasskeyLogin,
  handleSubmit,
  isPasskeySupported,
  loading,
  loginMode,
  passkeyLoading,
  showPassword,
} = useLoginView()
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
        data-testid="login-password-tab"
        :class="{ active: loginMode === 'password' }"
        @click="loginMode = 'password'"
      >
        账号密码
      </button>
      <button
        type="button"
        class="auth-mode-btn"
        data-testid="login-passkey-tab"
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
            data-testid="login-email"
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
            data-testid="login-password"
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
              data-testid="login-captcha"
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
        data-testid="login-submit"
        type="button"
        :disabled="loading || esaLoading"
        :class="{ 'is-loading': loading }"
        @click="handleSubmit"
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
  color: var(--ui-primary-hover);
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
  color: var(--ui-primary-hover);
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
  color: var(--ui-primary-hover);
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
  color: var(--ui-primary);
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
  outline: 2px solid var(--ui-primary);
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
