<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  useMessage,
  NButton,
  NModal,
  NInput,
  NTag,
  NIcon,
  NUpload,
  NSkeleton,
  type UploadCustomRequestOptions
} from 'naive-ui'
import {
  CloudUploadOutline,
  ShieldCheckmarkOutline,
  MailOutline,
  PersonOutline,
  LaptopOutline,
  KeyOutline,
  CalendarOutline,
  FingerPrintOutline,
  Pencil,
  HeartOutline,
  MusicalNotesOutline,
  StatsChartOutline,
  BookOutline
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import {
  uploadAvatarFile,
  changePassword,
  getUserInfo,
  updateNickname,
  type UserProfile
} from '@/api/user'

// ✅ 收藏夹 API
import { listMyCollections } from '@/api/collections'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

// =======================
// 工具：兼容 http.ts 是否解包
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

// =======================
// 1. 用户基础信息
// =======================
const profile = ref<UserProfile>({
  id: 0,
  email: '',
  nickname: '',
  avatarUrl: '',
  role: 0,
  createdAt: '',
  lastLoginIp: ''
})

// =======================
// 2. 收藏夹数据状态（新）
// =======================
const collectionStats = reactive({
  total: 0,
  items: [] as { id: number; name: string; isDefault: boolean; visibility: number }[],
  loading: false
})

const fetchCollectionStats = async () => {
  if (!auth.token) return
  collectionStats.loading = true
  try {
    const res: any = await listMyCollections()
    const list = unwrap(res) || []
    const arr = Array.isArray(list) ? list : []
    collectionStats.total = arr.length
    collectionStats.items = arr.map((c: any) => ({
      id: c.id,
      name: c.name,
      isDefault: !!c.isDefault,
      visibility: Number(c.visibility ?? 0)
    }))
  } catch (e) {
    console.warn('获取收藏夹概览失败', e)
  } finally {
    collectionStats.loading = false
  }
}

// 初始化加载
const initData = async () => {
  try {
    const res = await getUserInfo()
    profile.value = res

    // 同步更新 Pinia 中的头像
    if (res.avatarUrl) auth.updateAvatar(res.avatarUrl)

    // ✅ 获取收藏夹统计
    await fetchCollectionStats()
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

// =======================
// 3. 修改昵称逻辑
// =======================
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

// =======================
// 4. 上传头像逻辑
// =======================
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

// =======================
// 5. 修改密码逻辑
// =======================
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
        <h2 class="title">
          <span class="title-icon">👤</span>
          个人中心
        </h2>
        <p class="subtitle">管理您的个人资料与安全设置</p>
      </div>
      <div class="header-stats">
        <div class="stat-badge">
          <span class="stat-label">UID</span>
          <span class="stat-value">{{ profile.id || '-' }}</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">角色</span>
          <span class="stat-value">{{ isAdmin ? '管理员' : '用户' }}</span>
        </div>
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
              <n-button circle type="primary" color="#f586a9" class="edit-avatar-btn">
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
            <li>🔐 建议设置复杂的密码以保护账号。</li>
            <li>🔑 请勿将 API Key 泄露给他人。</li>
            <li>✅ 定期检查登录记录和安全设置。</li>
          </ul>
          <n-button 
            text 
            type="primary" 
            color="#f586a9" 
            size="small" 
            class="sec-action"
            @click="openChangePwd"
          >
            <template #icon><n-icon><KeyOutline /></n-icon></template>
            修改密码
          </n-button>
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

        <div class="glass-card favorite-card">
  <div class="fav-header">
    <div class="fav-title-group">
      <n-icon color="#ef4444" size="20"><HeartOutline /></n-icon>
      <span class="card-title">我的收藏夹</span>
      <n-tag v-if="collectionStats.total > 0" type="error" size="small" round :bordered="false" class="ml-2">
        {{ collectionStats.total }}
      </n-tag>
    </div>

    <n-button size="small" quaternary @click="() => router.push('/dashboard/collections')">
      查看全部
    </n-button>
  </div>

  <div v-if="collectionStats.loading" class="fav-loading-state">
    <n-skeleton v-for="i in 4" :key="i" class="fav-skeleton" />
  </div>

  <div v-else-if="collectionStats.total === 0" class="fav-empty-state">
    <n-icon size="36" color="#d1d5db"><HeartOutline /></n-icon>
    <p>您还没有创建收藏夹</p>
    <n-button text type="primary" color="#f586a9" size="tiny" @click="() => router.push('/dashboard/collections')">去探索</n-button>
  </div>

  <div v-else class="fav-tags-wrap">
    <n-tag
      v-for="c in collectionStats.items.slice(0, 8)"
      :key="c.id"
      size="small"
      round
      :bordered="false"
      class="col-tag"
      @click="() => router.push('/dashboard/collections')"
    >
      {{ c.isDefault ? '⭐ ' : '' }}{{ c.name }}
      <span style="opacity:.7; margin-left: 6px;">
        {{ c.visibility === 1 ? '公开' : '私有' }}
      </span>
    </n-tag>

    <n-tag
      v-if="collectionStats.items.length > 8"
      size="small"
      round
      :bordered="false"
      class="col-tag more-tag"
      @click="() => router.push('/dashboard/collections')"
    >
      +{{ collectionStats.items.length - 8 }}
    </n-tag>
  </div>
</div>

<!-- ✅ 新增：快捷操作卡片 -->
<div class="glass-card quick-actions-card">
  <div class="quick-header">
    <span class="card-title">快捷操作</span>
  </div>
  
  <div class="actions-grid">
    <div class="action-item" @click="() => router.push('/dashboard/api-keys')">
      <div class="action-icon" style="background: rgba(245, 134, 169, 0.1); color: #f586a9;">
        <n-icon size="24"><KeyOutline /></n-icon>
      </div>
      <div class="action-content">
        <span class="action-title">API Key</span>
        <span class="action-desc">管理您的密钥</span>
      </div>
    </div>

    <div class="action-item" @click="() => router.push('/dashboard/points')">
      <div class="action-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
        <n-icon size="24"><StatsChartOutline /></n-icon>
      </div>
      <div class="action-content">
        <span class="action-title">积分抽卡</span>
        <span class="action-desc">试试今天的运气</span>
      </div>
    </div>

    <div class="action-item" @click="() => router.push('/dashboard/music')">
      <div class="action-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
        <n-icon size="24"><MusicalNotesOutline /></n-icon>
      </div>
      <div class="action-content">
        <span class="action-title">音乐搜索</span>
        <span class="action-desc">探索好听的歌</span>
      </div>
    </div>

    <div class="action-item" @click="() => router.push('/dashboard/docs')">
      <div class="action-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
        <n-icon size="24"><BookOutline /></n-icon>
      </div>
      <div class="action-content">
        <span class="action-title">开发文档</span>
        <span class="action-desc">查看 API 文档</span>
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
          <n-button type="primary" color="#f586a9" :loading="savingName" @click="handleSaveNickname">
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
          <n-button type="primary" color="#f586a9" :loading="changingPwd" @click="handleChangePassword">
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
.page-header { 
  padding: 0 4px; 
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.title { 
  margin: 0; 
  font-size: 28px; 
  font-weight: 700; 
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon {
  font-size: 32px;
  animation: bounce 2s infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.subtitle { 
  margin: 4px 0 0 0; 
  font-size: 14px; 
  color: #6b7280; 
}
.header-stats {
  display: flex;
  gap: 12px;
}
.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.stat-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f586a9;
  margin-top: 2px;
}

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
  background: linear-gradient(135deg, #f586a9, #fca5c8);
  box-shadow: 0 8px 20px rgba(245, 134, 169, 0.25);
}
.avatar-img, .avatar-placeholder {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
  background: #fff; border: 4px solid rgba(255, 255, 255, 0.9);
}
.avatar-placeholder {
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; font-weight: 700; color: #f586a9; background: #f3f4f6;
}
.upload-trigger { position: absolute; bottom: 0; right: 0; }
.edit-avatar-btn { box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 2px solid #fff; }

/* 用户名行 */
.user-info { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.name-row { display: flex; align-items: center; gap: 8px; }
.username { margin: 0; font-size: 20px; color: #1f2937; }
.edit-name-btn { color: #9ca3af; }
.edit-name-btn:hover { color: #f586a9; }

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
.security-card { 
  padding: 20px; 
  background: rgba(255, 255, 255, 0.5) !important; 
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sec-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sec-title { font-weight: 600; color: #374151; }
.sec-tips { 
  margin: 0; 
  padding-left: 20px; 
  font-size: 12px; 
  color: #6b7280;
  flex: 1;
}
.sec-tips li { margin-bottom: 6px; }
.sec-action {
  align-self: flex-start;
  margin-top: 4px;
}

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
.pink { background: rgba(245, 134, 169, 0.1); color: #f586a9; }
.purple { background: rgba(245, 134, 169, 0.1); color: #f586a9; }
.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.item-content { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.item-content .label { font-size: 12px; color: #9ca3af; }
.item-content .value { font-size: 15px; font-weight: 600; color: #1f2937; word-break: break-all; }
.mono { font-family: monospace; }
.mini-edit { position: absolute; right: 8px; top: 8px; font-size: 12px; color: #f586a9; }

/* ✅ 新增：收藏卡片样式 */
.favorite-card {
  padding: 24px 32px;
  margin-top: 24px; /* 间距 */
}

.fav-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.fav-title-group { display: flex; align-items: center; gap: 8px; }

.fav-image-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fav-image-item {
  position: relative; width: 100%; padding-top: 100%; /* 1:1 */
  overflow: hidden; border-radius: 8px; background: #f3f4f6;
  border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  cursor: pointer;
}
.preview-img {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; transition: transform 0.3s ease;
}
.fav-image-item:hover .preview-img { transform: scale(1.05); }
.fav-image-item.placeholder { background: rgba(243, 244, 246, 0.5); border-style: dashed; cursor: default; }

.fav-empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 120px; color: #9ca3af; gap: 4px;
}
.fav-empty-state p { margin: 4px 0 0; font-size: 14px; }

.fav-loading-state { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; height: 120px; }
.fav-skeleton { width: 100%; height: 100px; border-radius: 8px; }

/* 响应式适配 */
@media (max-width: 600px) {
  .info-grid { grid-template-columns: 1fr; }
  .fav-image-grid { grid-template-columns: repeat(3, 1fr); }
  .fav-loading-state { grid-template-columns: repeat(3, 1fr); }
  .favorite-card { padding: 20px; }
}

/* 弹窗通用 */
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

.fav-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.col-tag {
  background: rgba(239, 68, 68, 0.08) !important;
  color: #ef4444 !important;
  cursor: pointer;
}

.more-tag {
  background: rgba(245, 134, 169, 0.08) !important;
  color: #f586a9 !important;
}

/* ✅ 快捷操作卡片 */
.quick-actions-card {
  padding: 24px 32px;
  margin-top: 24px;
}

.quick-header {
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-item:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.action-desc {
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 600px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-card {
    padding: 20px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-stats {
    width: 100%;
    justify-content: flex-start;
  }
  
  .title {
    font-size: 24px;
  }
  
  .title-icon {
    font-size: 28px;
  }
  
  .info-card {
    padding: 20px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .fav-image-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .fav-loading-state {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .favorite-card {
    padding: 20px;
  }
}

</style>