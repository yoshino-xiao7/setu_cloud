<script setup lang="ts">
import { MailOutline, QrCodeOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'
import { useForgotPasswordView } from '@/composables/useForgotPasswordView'

const {
  aliyunCaptchaRef,
  captchaCode,
  captchaRef,
  captchaUuid,
  email,
  handleEsaFail,
  handleEsaSuccess,
  handleSubmit,
  loading,
} = useForgotPasswordView()
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
          <NIcon size="18" class="input-icon">
            <MailOutline />
          </NIcon>
          <input
            v-model="email"
            type="email"
            class="auth-input with-icon"
            placeholder="name@example.com"
            autocomplete="email"
          >
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
              v-model="captchaCode"
              type="text"
              class="auth-input with-icon"
              placeholder="区分大小写"
              maxlength="5"
              autocomplete="off"
            >
          </div>
          <SecureCaptcha
            ref="captchaRef"
            @update:uuid="(uuid) => captchaUuid = uuid"
          />
        </div>
      </div>

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
        <router-link to="/login" class="auth-link">
          返回登录
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

.auth-input.with-icon {
  padding-left: 40px !important;
}

.input-wrapper:focus-within .input-icon {
  color: var(--ui-primary);
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
