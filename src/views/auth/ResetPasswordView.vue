<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import { resetPassword } from '@/api/auth'
import { getApiErrorMessage } from '@/composables/useApiError'
import AuthLayout from '@/components/AuthLayout.vue'

// 图标引入
import {
  LockClosedOutline,
  KeyOutline, // 确认密码可以用个不一样的图标，或者都用锁
  EyeOutline,
  EyeOffOutline,
  AlertCircleOutline
} from '@vicons/ionicons5'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const token = ref<string | null>(null)
const form = ref({
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)
// 显隐控制
const showPwd = ref(false)
const showConfirmPwd = ref(false)

onMounted(() => {
  const t = route.query.token
  token.value = typeof t === 'string' ? t : null

  if (!token.value) {
    // 这里只做控制台记录，界面上会通过 v-if 显示错误 UI
    console.warn('Reset token missing')
  }
})

const handleSubmit = async () => {
  if (!token.value) {
    message.error('重置链接无效，请重新操作')
    return
  }
  if (!form.value.newPassword) return message.warning('请填写新密码')
  if (form.value.newPassword.length < 6) return message.warning('密码长度至少 6 位')
  if (form.value.newPassword !== form.value.confirmPassword) return message.warning('两次密码输入不一致')

  loading.value = true
  try {
    await resetPassword({
      token: token.value,
      newPassword: form.value.newPassword
    })
    message.success('密码已重置，正在跳转登录...')

    // 体验优化：稍微停顿一下让用户看到成功提示
    setTimeout(() => {
      router.push({ name: 'login' })
    }, 1500)

  } catch (e: unknown) {
    console.error('重置密码失败：', e)
    const msg = getApiErrorMessage(e, '重置失败，请链接可能已过期')
    message.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    title="重置密码"
    subtitle="为了账户安全，请设置一个新的强密码"
  >

    <div v-if="!token" class="error-state">
      <n-icon size="48" color="#ef4444"><AlertCircleOutline /></n-icon>
      <h3>链接无效或已过期</h3>
      <p>检测到重置链接参数缺失，请检查链接是否完整，或重新发送邮件。</p>
      <button class="auth-btn ghost" @click="router.push('/forgot-password')">
        重新找回密码
      </button>
    </div>

    <form v-else class="auth-form" @submit.prevent="handleSubmit">

      <div class="auth-input-group">
        <label class="auth-label">新密码</label>
        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><LockClosedOutline /></n-icon>
          <input
            v-model="form.newPassword"
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
        <label class="auth-label">确认新密码</label>
        <div class="input-wrapper">
          <n-icon size="18" class="input-icon"><KeyOutline /></n-icon>
          <input
            v-model="form.confirmPassword"
            :type="showConfirmPwd ? 'text' : 'password'"
            class="auth-input with-icon with-eye"
            placeholder="再次输入以确认"
            autocomplete="new-password"
          />
          <div class="eye-btn" @click="showConfirmPwd = !showConfirmPwd">
            <n-icon size="20" v-if="showConfirmPwd"><EyeOffOutline /></n-icon>
            <n-icon size="20" v-else><EyeOutline /></n-icon>
          </div>
        </div>
      </div>

      <button
        class="auth-btn"
        type="submit"
        :disabled="loading"
        :class="{ 'is-loading': loading }"
      >
        <span v-if="!loading">确认修改</span>
        <span v-else class="loading-dots">提交中<span>.</span><span>.</span><span>.</span></span>
      </button>

    </form>

    <template #footer>
      <div class="footer-center">
        想起密码了？
        <span class="auth-link" @click="router.push('/login')">直接登录</span>
      </div>
    </template>

  </AuthLayout>
</template>

<style scoped>
/* === 复用样式开始 (保持一致性) === */
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 12px; color: #64748b; z-index: 2; pointer-events: none; transition: color 0.3s; }
.auth-input.with-icon { padding-left: 40px !important; }
.auth-input.with-eye { padding-right: 40px !important; }
.input-wrapper:focus-within .input-icon { color: #f586a9; }
.eye-btn { position: absolute; right: 12px; display: flex; align-items: center; color: #94a3b8; cursor: pointer; z-index: 3; }
.eye-btn:hover { color: #64748b; }
.loading-dots span { animation: blink 1.4s infinite both; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
.auth-btn.is-loading { opacity: 0.8; cursor: wait; }
/* === 复用样式结束 === */

.footer-center { width: 100%; text-align: center; color: #64748b; }

/* === 错误状态样式 === */
.error-state {
  text-align: center;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.error-state h3 { margin: 0; color: #ef4444; font-size: 18px; }
.error-state p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.6; }

/* 幽灵按钮 (透明背景) */
.auth-btn.ghost {
  background: transparent;
  color: #64748b;
  border: 1px solid rgba(100, 116, 139, 0.3);
  box-shadow: none;
  margin-top: 20px;
}
.auth-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.5);
  color: #1e293b;
  border-color: #64748b;
}
</style>