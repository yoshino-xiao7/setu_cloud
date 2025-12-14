<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  LaptopOutline, // ✅ 保留：用于显示登录 IP 图标
  KeyOutline,
  CalendarOutline,
  FingerPrintOutline,
  Pencil
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import {
  uploadAvatarFile,
  changePassword,
  getUserInfo,
  updateNickname,
  type UserProfile
} from '@/api/user'

const auth = useAuthStore()
const message = useMessage()

const profile = ref<UserProfile>({
  id: 0,
  email: '',
  nickname: '',
  avatarUrl: '',
  role: 0,
  createdAt: '',
  lastLoginIp: ''
})

// 初始化加载
const initData = async () => {
  try {
    const res = await getUserInfo()
    profile.value = res

    // 同步更新 Pinia 中的头像
    if (res.avatarUrl) {
      auth.updateAvatar(res.avatarUrl)
    }
  } catch (e) {
    message.error('获取用户信息失败')
  }
}

onMounted(() => {
  initData()
})

// 计算属性
const displayAvatar = computed(() => profile.value.avatarUrl || auth.avatarUrl)
const displayName = computed(() => profile.value.nickname || profile.value.email?.split('@')[0] || 'User')
const isAdmin = computed(() => profile.value.role === 1)
const emailFirstLetter = computed(() => profile.value.email?.charAt(0).toUpperCase() || 'U')

// ===== 2. 修改昵称逻辑 =====
const showEditName = ref(false)
const nameForm = ref('')
const savingName = ref(false)

const openEditName = () => {
  nameForm.value = profile.value.nickname || ''
  showEditName.value = true
}

const handleSaveNickname = async () => {
  if (!nameForm.value.trim()) return message.warning('昵称不能为空')

  savingName.value = true
  try {
    await updateNickname(nameForm.value.trim())
    message.success('昵称修改成功')
    showEditName.value = false
    await initData()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '修改失败')
  } finally {
    savingName.value = false
  }
}

// ===== 3. 上传头像逻辑 =====
const customRequest = async ({ file }: UploadCustomRequestOptions) => {
  const rawFile = file.file
  if (!rawFile) return

  if (!rawFile.type.startsWith('image/')) return message.error('请上传图片')
  if (rawFile.size > 2 * 1024 * 1024) return message.error('图片不能超过 2MB')

  try {
    const resp = await uploadAvatarFile(rawFile)
    profile.value.avatarUrl = resp.avatarUrl
    auth.updateAvatar(resp.avatarUrl)
    message.success('头像更新成功')
  } catch (e) {
    message.error('上传失败，请重试')
  }
}

// ===== 4. 修改密码逻辑 =====
const showChangePwd = ref(false)
const pwdForm = ref({ old: '', new: '', confirm: '' })
const changingPwd = ref(false)

const openChangePwd = () => {
  pwdForm.value = { old: '', new: '', confirm: '' }
  showChangePwd.value = true
}

const handleChangePassword = async () => {
  const { old, new: newPwd, confirm } = pwdForm.value
  if (!old || !newPwd || !confirm) return message.warning('请填写完整')
  if (newPwd.length < 6) return message.warning('新密码至少6位')
  if (newPwd !== confirm) return message.error('两次密码不一致')

  try {
    changingPwd.value = true
    await changePassword(old, newPwd)
    message.success('密码修改成功')
    showChangePwd.value = false
  } catch (e: any) {
    message.error(e?.response?.data?.message || '修改失败')
  } finally {
    changingPwd.value = false
  }
}
</script>

<template>
  <div class="page-container">

    <div class="page-header">
      <div class="title-block">
        <h2 class="title">个人中心</h2>
        <p class="subtitle">管理您的个人资料与安全设置</p>
      </div>
    </div>

    <div class="profile-layout">

      <div class="left-column">
        <div class="glass-card user-card">
          <div class="avatar-wrapper">
            <div class="avatar-ring">
              <img v-if="displayAvatar" :src="displayAvatar" class="avatar-img" />
              <div v-else class="avatar-placeholder">{{ emailFirstLetter }}</div>
            </div>
            <n-upload
              :show-file-list="false"
              :custom-request="customRequest"
              accept="image/*"
              class="upload-trigger"
            >
              <n-button circle type="primary" color="#8b5cf6" class="edit-avatar-btn">
                <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
              </n-button>
            </n-upload>
          </div>

          <div class="user-info">
            <div class="name-row">
              <h3 class="username">{{ displayName }}</h3>
              <n-button text size="tiny" class="edit-name-btn" @click="openEditName">
                <n-icon><Pencil /></n-icon>
              </n-button>
            </div>

            <n-tag
              :type="isAdmin ? 'error' : 'info'"
              round size="small" :bordered="false" class="role-badge"
            >
              {{ isAdmin ? '管理员' : '普通用户' }}
            </n-tag>
          </div>

          <div class="mini-stats">
            <div class="stat-item">
              <span class="label">UID</span>
              <span class="value">{{ profile.id }}</span>
            </div>
            <div class="v-line"></div>
            <div class="stat-item">
              <span class="label">加入时间</span>
              <span class="value">{{ profile.createdAt?.split(' ')[0] || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="glass-card security-card">
          <div class="sec-header">
            <n-icon color="#10b981" size="20"><ShieldCheckmarkOutline /></n-icon>
            <span class="sec-title">安全状态：良好</span>
          </div>
          <ul class="sec-tips">
            <li>建议设置复杂的密码以保护账号。</li>
            <li>请勿将 API Key 泄露给他人。</li>
          </ul>
        </div>
      </div>

      <div class="right-column">
        <div class="glass-card info-card">
          <div class="info-header">
            <span class="card-title">账户资料</span>
            <n-button size="small" secondary type="warning" @click="openChangePwd">
              <template #icon><n-icon><KeyOutline /></n-icon></template>
              修改密码
            </n-button>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="item-icon pink"><n-icon><PersonOutline /></n-icon></div>
              <div class="item-content">
                <span class="label">昵称</span>
                <span class="value">{{ profile.nickname || '未设置' }}</span>
              </div>
              <n-button text class="mini-edit" @click="openEditName">修改</n-button>
            </div>

            <div class="info-item">
              <div class="item-icon blue"><n-icon><MailOutline /></n-icon></div>
              <div class="item-content">
                <span class="label">注册邮箱</span>
                <span class="value">{{ profile.email }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="item-icon purple"><n-icon><FingerPrintOutline /></n-icon></div>
              <div class="item-content">
                <span class="label">用户 ID (UID)</span>
                <span class="value mono">{{ profile.id }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="item-icon green"><n-icon><LaptopOutline /></n-icon></div>
              <div class="item-content">
                <span class="label">上次登录 IP</span>

                <div class="value-row">
                  <span class="value mono">{{ profile.lastLoginIp || '未知' }}</span>

                  <n-tag v-if="profile.lastLoginIp" type="success" size="tiny" round :bordered="false" class="ml-2">
                    本机
                  </n-tag>
                </div>

              </div>
            </div>

            <div class="info-item">
              <div class="item-icon orange"><n-icon><CalendarOutline /></n-icon></div>
              <div class="item-content">
                <span class="label">注册日期</span>
                <span class="value">{{ profile.createdAt }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <n-modal
      v-model:show="showEditName"
      preset="card"
      title="修改昵称"
      class="glass-modal"
      :style="{ width: '400px' }"
    >
      <div class="form-group">
        <label>新昵称</label>
        <n-input
          v-model:value="nameForm"
          placeholder="请输入新的昵称"
          @keydown.enter="handleSaveNickname"
          autofocus
        />
        <p class="hint">建议使用中文或英文，最多 64 个字符。</p>
      </div>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showEditName = false" quaternary>取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="savingName" @click="handleSaveNickname">
            保存
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showChangePwd"
      preset="card"
      title="修改密码"
      class="glass-modal"
      :style="{ width: '400px' }"
    >
      <div class="pwd-form-layout">
        <div class="form-group">
          <label>当前密码</label>
          <n-input v-model:value="pwdForm.old" type="password" show-password-on="click" />
        </div>
        <div class="form-group">
          <label>新密码</label>
          <n-input v-model:value="pwdForm.new" type="password" show-password-on="click" />
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <n-input v-model:value="pwdForm.confirm" type="password" show-password-on="click" />
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showChangePwd = false" quaternary>取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="changingPwd" @click="handleChangePassword">
            确认修改
          </n-button>
        </div>
      </template>
    </n-modal>

  </div>
</template>

<style scoped>
/* 全局布局 */
.page-container {
  display: flex; flex-direction: column; gap: 24px; padding-bottom: 60px;
}
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0 0; font-size: 14px; color: #6b7280; }

/* Grid 布局 */
.profile-layout {
  display: grid; grid-template-columns: 320px 1fr; gap: 24px; align-items: start;
}
@media (max-width: 850px) {
  .profile-layout { grid-template-columns: 1fr; }
}

/* 玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}

/* 左侧：用户卡片 */
.user-card {
  padding: 32px 20px; display: flex; flex-direction: column; align-items: center; text-align: center;
  position: relative; overflow: hidden;
}

.avatar-wrapper { position: relative; margin-bottom: 16px; }
.avatar-ring {
  width: 108px; height: 108px; border-radius: 50%; padding: 4px;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.25);
}
.avatar-img, .avatar-placeholder {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
  background: #fff; border: 4px solid rgba(255, 255, 255, 0.9);
}
.avatar-placeholder {
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; font-weight: 700; color: #8b5cf6; background: #f3f4f6;
}
.upload-trigger { position: absolute; bottom: 0; right: 0; }
.edit-avatar-btn { box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 2px solid #fff; }

/* 用户名行 */
.user-info { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.name-row { display: flex; align-items: center; gap: 8px; }
.username { margin: 0; font-size: 20px; color: #1f2937; }
.edit-name-btn { color: #9ca3af; }
.edit-name-btn:hover { color: #8b5cf6; }

.role-badge { padding: 0 12px; font-weight: 600; }

.mini-stats {
  display: flex; align-items: center; justify-content: center; gap: 20px;
  margin-top: 24px; padding-top: 24px; width: 100%;
  border-top: 1px solid rgba(0,0,0,0.05);
}
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-item .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-item .value { font-size: 14px; font-weight: 700; color: #4b5563; }
.v-line { width: 1px; height: 24px; background: rgba(0,0,0,0.1); }

/* 左侧：安全 */
.security-card { padding: 20px; background: rgba(255, 255, 255, 0.5) !important; }
.sec-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sec-title { font-weight: 600; color: #374151; }
.sec-tips { margin: 0; padding-left: 20px; font-size: 12px; color: #6b7280; }
.sec-tips li { margin-bottom: 4px; }

/* 右侧：信息 */
.info-card { padding: 32px; min-height: 400px; }
.info-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.card-title { font-size: 18px; font-weight: 700; color: #1f2937; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }

.info-item {
  display: flex; align-items: flex-start; gap: 16px; padding: 16px;
  background: rgba(255,255,255,0.4); border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.5); position: relative;
  transition: transform 0.2s;
}
.info-item:hover { background: rgba(255,255,255,0.7); transform: translateY(-2px); }

.item-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.pink { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }

.item-content { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.item-content .label { font-size: 12px; color: #9ca3af; }
.item-content .value { font-size: 15px; font-weight: 600; color: #1f2937; word-break: break-all; }
.mono { font-family: monospace; }
.mini-edit { position: absolute; right: 8px; top: 8px; font-size: 12px; color: #8b5cf6; }

/* 弹窗 */
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-group label { font-size: 13px; color: #6b7280; font-weight: 500; }
.hint { font-size: 12px; color: #9ca3af; margin: 4px 0 0 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
.pwd-form-layout { display: flex; flex-direction: column; gap: 16px; padding: 10px 0; }

:global(.glass-modal.n-modal) {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.7) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15) !important;
}
:global(.glass-modal .n-card-header__main) { color: #1f2937 !important; }

.value-row { display: flex; align-items: center; gap: 8px; }
.ml-2 { margin-left: 8px; }
</style>