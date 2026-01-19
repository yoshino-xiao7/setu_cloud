<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import { register } from '@/api/auth'
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
const message = useMessage()

// 表单数据
const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
  captchaCode: '', // ✅ 用户输入的验证码
  captchaUuid: ''  // ✅ 组件传回来的 UUID
})

const loading = ref(false)
const captchaRef = ref() // ✅ 用于手动刷新验证码

// 控制两个密码框的显隐状态
const showPwd = ref(false)
const showConfirmPwd = ref(false)

const handleSubmit = async () => {
  // 1. 基础校验
  if (!form.value.email.trim()) return message.warning('请填写邮箱')
  if (!form.value.password) return message.warning('请填写密码')
  if (form.value.password.length < 6) return message.warning('密码长度不能少于 6 位')
  if (form.value.password !== form.value.confirmPassword) return message.warning('两次输入的密码不一致')

  // ✅ 2. 验证码非空校验
  if (!form.value.captchaCode) return message.warning('请输入验证码')

  loading.value = true
  try {
    // 3. 调用注册接口 (传入验证码参数)
    await register({
      email: form.value.email.trim(),
      password: form.value.password,
      captchaCode: form.value.captchaCode,
      captchaUuid: form.value.captchaUuid
    })

    message.success('注册成功，请前往邮箱验证')

    // 4. 跳转登录页，并预填邮箱
    router.push({
      path: '/login',
      query: { email: form.value.email.trim() }
    })

  } catch (e: any) {
    console.error('注册失败: ', e)
    const msg = e?.response?.data?.message || e?.message || '注册失败，请稍后再试'
    message.error(msg)

    // ❌ 5. 失败处理：刷新验证码 (防止重放攻击)，并清空输入框
    captchaRef.value?.refresh()
    form.value.captchaCode = ''
  } finally {
    loading.value = false
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

      <button
        class="auth-btn"
        type="submit"
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
/* === 复用 Login.vue 的样式 === */

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

/* Padding 预留 */
.auth-input.with-icon { padding-left: 40px !important; }
.auth-input.with-eye { padding-right: 40px !important; }

/* 聚焦变色 */
.input-wrapper:focus-within .input-icon {
  color: #f586a9;
}

/* 右侧小眼睛 */
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

/* Loading 动画 */
.loading-dots span { animation: blink 1.4s infinite both; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}
.auth-btn.is-loading { opacity: 0.8; cursor: wait; }

/* 底部文字居中优化 */
.footer-content {
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