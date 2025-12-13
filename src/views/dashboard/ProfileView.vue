<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useMessage,
  NButton,
  NModal,
  NInput,
  NTag,
  NIcon,
  NUpload,
  type UploadCustomRequestOptions
} from 'naive-ui'
import {
  CloudUploadOutline,
  ShieldCheckmarkOutline,
  MailOutline,
  PersonOutline,
  LaptopOutline,
  KeyOutline,
  CreateOutline
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { uploadAvatarFile, changePassword } from '@/api/user'
import { getOrCreateAvatar } from '@/utils/avatar'

const auth = useAuthStore()
const message = useMessage()

// ===== 基本信息 =====
const email = computed(() => auth.user?.email || '')
const userId = computed(() => auth.user?.id ?? null)
const loginIp = computed(() => auth.user?.lastLoginIp || '')

// 头像预览
const previewUrl = ref<string | null>(null)
const avatarUrl = computed(() => {
  if (previewUrl.value) return previewUrl.value
  if (auth.avatarUrl) return auth.avatarUrl
  if (auth.user?.email) {
    return getOrCreateAvatar(auth.user.email)
  }
  return ''
})

const emailFirstLetter = computed(() => {
  const val = auth.user?.email || ''
  return val ? val.trim().charAt(0).toUpperCase() : '?'
})

// 角色
const isAdmin = computed(() => auth.user?.role === 1)

// ===== 头像上传 (Naive UI Upload) =====
const customRequest = async ({ file }: UploadCustomRequestOptions) => {
  const rawFile = file.file
  if (!rawFile) return

  // 校验类型
  if (!rawFile.type.startsWith('image/')) {
    message.error('请上传图片文件')
    return
  }
  // 校验大小 (2MB)
  if (rawFile.size > 2 * 1024 * 1024) {
    message.error('图片大小不能超过 2MB')
    return
  }

  // 本地预览
  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(rawFile)

  try {
    const resp = await uploadAvatarFile(rawFile)
    auth.updateAvatar(resp.avatarUrl)
    previewUrl.value = resp.avatarUrl // 确认最终 URL
    message.success('头像已更新')
  } catch (e) {
    console.error(e)
    message.error('上传失败，请稍后重试')
    // 失败回滚
    previewUrl.value = auth.avatarUrl
  }
}

// ===== 修改密码 =====
const showChangePwd = ref(false)
const pwdForm = ref({ old: '', new: '', confirm: '' })
const changingPwd = ref(false)

const openChangePwd = () => {
  pwdForm.value = { old: '', new: '', confirm: '' }
  showChangePwd.value = true
}

const handleChangePassword = async () => {
  const { old, new: newPwd, confirm } = pwdForm.value
  if (!old || !newPwd || !confirm) {
    message.warning('请填写完整信息')
    return
  }
  if (newPwd.length < 6) {
    message.warning('新密码至少 6 位')
    return
  }
  if (newPwd !== confirm) {
    message.error('两次输入的新密码不一致')
    return
  }

  try {
    changingPwd.value = true
    await changePassword(old, newPwd)
    message.success('密码已修改')
    showChangePwd.value = false
  } catch (e: any) {
    const msg = e?.response?.data?.message || '修改失败'
    message.error(msg)
  } finally {
    changingPwd.value = false
  }
}
</script>

<template>
  <div class="profile-page">

    <div class="page-header">
      <h2 class="page-title">个人中心</h2>
      <p class="page-subtitle">管理您的账户信息与安全设置</p>
    </div>

    <div class="profile-grid">

      <div class="left-col">
        <div class="glass-card user-card">
          <div class="avatar-box">
            <div class="avatar-border">
              <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
              <div v-else class="avatar-text">{{ emailFirstLetter }}</div>
            </div>
            <n-upload
              :show-file-list="false"
              :custom-request="customRequest"
              accept="image/*"
            >
              <n-button size="tiny" round class="upload-btn">
                <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
                更换头像
              </n-button>
            </n-upload>
            <span class="upload-tip">支持 JPG/PNG, Max 2MB</span>
          </div>

          <div class="user-meta">
            <div class="meta-name">{{ email || '未登录用户' }}</div>
            <n-tag
              :type="isAdmin ? 'error' : 'info'"
              size="small"
              round
              class="role-tag"
              :bordered="false"
            >
              {{ isAdmin ? '管理员 (Admin)' : '普通用户 (User)' }}
            </n-tag>
          </div>
        </div>

        <div class="glass-card security-card">
          <div class="card-title">
            <n-icon color="#10b981"><ShieldCheckmarkOutline /></n-icon>
            安全提示
          </div>
          <ul class="security-list">
            <li>请勿泄露 API Key 给他人。</li>
            <li>建议定期更换高强度密码。</li>
            <li>发现异常 IP 登录请立即改密。</li>
          </ul>
        </div>
      </div>

      <div class="right-col">
        <div class="glass-card info-card">
          <div class="card-header">
            <span class="title">账户资料</span>
            <n-button size="small" secondary type="primary" @click="openChangePwd">
              <template #icon><n-icon><KeyOutline /></n-icon></template>
              修改密码
            </n-button>
          </div>

          <div class="info-list">
            <div class="info-item">
              <div class="label">
                <n-icon><MailOutline /></n-icon> 注册邮箱
              </div>
              <div class="value-box">{{ email }}</div>
            </div>

            <div class="info-item">
              <div class="label">
                <n-icon><PersonOutline /></n-icon> 用户 ID (UID)
              </div>
              <div class="value-box monospace">{{ userId }}</div>
            </div>

            <div class="info-item">
              <div class="label">
                <n-icon><LaptopOutline /></n-icon> 上次登录 IP
              </div>
              <div class="value-box ip-box">
                {{ loginIp || '暂无记录' }}
                <n-tag v-if="loginIp" size="tiny" type="success" :bordered="false" round>本机</n-tag>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <n-modal
      v-model:show="showChangePwd"
      preset="card"
      title="修改密码"
      class="glass-modal"
      :style="{ width: '400px' }"
    >
      <div class="pwd-form">
        <div class="form-item">
          <label>当前密码</label>
          <n-input
            v-model:value="pwdForm.old"
            type="password"
            placeholder="验证原密码"
            show-password-on="click"
          />
        </div>
        <div class="form-item">
          <label>新密码</label>
          <n-input
            v-model:value="pwdForm.new"
            type="password"
            placeholder="至少 6 位字符"
            show-password-on="click"
          />
        </div>
        <div class="form-item">
          <label>确认新密码</label>
          <n-input
            v-model:value="pwdForm.confirm"
            type="password"
            placeholder="再次输入以确认"
            show-password-on="click"
          />
        </div>
      </div>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="showChangePwd = false" quaternary>取消</n-button>
          <n-button
            type="primary"
            color="#8b5cf6"
            :loading="changingPwd"
            @click="handleChangePassword"
          >
            <template #icon><n-icon><CreateOutline /></n-icon></template>
            确认修改
          </n-button>
        </div>
      </template>
    </n-modal>

  </div>
</template>

<style scoped>
/* 页面容器 */
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  padding: 0 4px;
}
.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}
.page-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #6b7280;
}

/* 布局：左窄右宽 */
.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 850px) {
  .profile-grid { grid-template-columns: 1fr; }
}

/* 通用毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}

/* === 左侧：头像卡片 === */
.user-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  gap: 16px;
}

.avatar-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-border {
  width: 100px; height: 100px;
  border-radius: 50%;
  padding: 4px;
  /* 炫彩边框 */
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow: 0 10px 20px rgba(139, 92, 246, 0.2);
}

.avatar-img, .avatar-text {
  width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  border: 4px solid rgba(255,255,255,0.8);
}

.avatar-text {
  display: flex; align-items: center; justify-content: center;
  font-size: 36px; font-weight: 700; color: #8b5cf6;
  background: #f3f4f6;
}

.upload-btn {
  font-size: 12px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.8);
  color: #6b7280;
}
.upload-btn:hover { color: #8b5cf6; background: #fff; }

.upload-tip { font-size: 11px; color: #9ca3af; }

.user-meta { text-align: center; }
.meta-name { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 6px; }
.role-tag { font-weight: 600; padding: 0 10px; }


/* === 左侧：安全卡片 (双层玻璃) === */
.security-card {
  /* 更透一点，体现层次 */
  background: rgba(255, 255, 255, 0.5) !important;
  padding: 20px;
  border: 1px dashed rgba(139, 92, 246, 0.2);
}

.card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600; color: #374151;
  margin-bottom: 12px;
}

.security-list {
  padding-left: 20px; margin: 0;
  font-size: 13px; color: #6b7280; line-height: 1.6;
}
.security-list li { margin-bottom: 4px; }

/* === 右侧：信息卡片 === */
.info-card {
  padding: 24px 32px;
}

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  padding-bottom: 16px;
}
.card-header .title { font-size: 18px; font-weight: 700; color: #1f2937; }

.info-list {
  display: flex; flex-direction: column; gap: 20px;
}

.info-item {
  display: flex; flex-direction: column; gap: 8px;
}

.label {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #6b7280; font-weight: 500;
}

.value-box {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5); /* 浅色背景块 */
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  font-size: 15px; color: #111827;
  transition: all 0.2s;
}
.value-box:hover {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.monospace { font-family: 'SFMono-Regular', Consolas, monospace; }

.ip-box { display: flex; align-items: center; justify-content: space-between; }


/* === 弹窗样式 === */
.form-item {
  display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;
}
.form-item label { font-size: 13px; color: #6b7280; font-weight: 500; }

.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }

/* 全局弹窗样式覆盖 */
:global(.glass-modal.n-modal) {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.7) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15) !important;
}
:global(.glass-modal .n-card-header__main) {
  color: #1f2937 !important;
}
</style>