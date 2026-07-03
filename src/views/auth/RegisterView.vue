<script setup lang="ts">
import {
  EyeOffOutline,
  EyeOutline,
  LockClosedOutline,
  MailOutline,
  QrCodeOutline,
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import AliyunCaptcha from '@/components/AliyunCaptcha.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue'
import { useRegisterView } from '@/composables/useRegisterView'

const {
  aliyunCaptchaRef,
  captchaRef,
  esaLoading,
  form,
  handleEsaFail,
  handleEsaSuccess,
  handleSubmit,
  loading,
  showConfirmPwd,
  showPwd,
} = useRegisterView()
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
