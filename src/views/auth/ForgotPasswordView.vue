<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import { forgotPassword } from '@/api/auth'
import AuthLayout from '@/components/AuthLayout.vue'
import SecureCaptcha from '@/components/SecureCaptcha.vue' // ✅ 引入验证码组件

// 图标引入
import { MailOutline, QrCodeOutline } from '@vicons/ionicons5' // ✅ 引入验证码图标

const router = useRouter()
const message = useMessage()

const email = ref('')
const captchaCode = ref('') // ✅ 用户输入的验证码
const captchaUuid = ref('') // ✅ 组件传回来的 UUID
const loading = ref(false)
const captchaRef = ref()    // ✅ 用于手动刷新验证码

const handleSubmit = async () => {
  if (!email.value.trim()) {
    message.warning('请填写注册邮箱')
    return
  }
  // ✅ 1. 验证码非空校验
  if (!captchaCode.value) {
    message.warning('请输入验证码')
    return
  }

  loading.value = true
  try {
    // 2. 调用找回密码接口 (传入验证码参数)
    await forgotPassword({
      email: email.value.trim(),
      captchaCode: captchaCode.value,
      captchaUuid: captchaUuid.value
    })

    // 提示文案
    message.success('邮件已发送！请查收您的收件箱（包括垃圾邮件）')

    // 留出时间让用户看清提示，再跳转
    setTimeout(() => {
      router.push({ name: 'login' })
    }, 2000)
  } catch (e: any) {
    console.error('请求重置密码失败：', e)
    const msg = e?.response?.data?.message || e?.message || '请求失败，请稍后再试'
    message.error(msg)

    // ❌ 3. 失败处理：刷新验证码 (防止重放攻击)，并清空输入框
    captchaRef.value?.refresh()
    captchaCode.value = ''
  } finally {
    loading.value = false
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
              maxlength="4"
              autocomplete="off"
            />
          </div>
          <SecureCaptcha
            ref="captchaRef"
            @update:uuid="(uuid) => captchaUuid = uuid"
          />
        </div>
      </div>

      <button
        class="auth-btn"
        type="submit"
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
        <span class="auth-link" @click="router.push('/login')">返回登录</span>
      </div>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* === 样式复用 (保持与 Login/Register 像素级一致) === */

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
  z-index: 2;
  transition: color 0.3s;
  pointer-events: none;
}

/* 输入框 Padding 预留 */
.auth-input.with-icon {
  padding-left: 40px !important;
}

/* 聚焦变色 */
.input-wrapper:focus-within .input-icon {
  color: #f586a9;
}

/* Loading 动画 */
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

/* 按钮禁用态 */
.auth-btn.is-loading {
  opacity: 0.8;
  cursor: wait;
}

/* 底部文字居中 */
.footer-center {
  width: 100%;
  text-align: center;
  color: #64748b;
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