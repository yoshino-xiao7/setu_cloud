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
  BookOutline,
  GlobeOutline,
  LockClosedOutline,
  ChevronForwardOutline
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
import { listMyCollections, type CollectionInfoDTO } from '@/api/collections'
import { unwrapApiList } from '@/api/response'
import { getApiErrorMessage } from '@/composables/useApiError'
import { formatDateOnly, formatDate } from '@/utils/dateFormat'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

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
  if (!auth.user) return
  collectionStats.loading = true
  try {
    const res = await listMyCollections()
    const arr = unwrapApiList<CollectionInfoDTO>(res)
    collectionStats.total = arr.length
    collectionStats.items = arr.map((c: CollectionInfoDTO) => ({
      id: c.id,
      name: c.name,
      isDefault: !!c.isDefault,
      visibility: Number(c.visibility ?? 0)
    }))
  } catch {
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
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '修改失败'))
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
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '修改失败'))
  } finally {
    changingPwd.value = false
  }
}
</script>

<template>
  <div class="page-container ui-page">

    <div class="page-header ui-page-header ui-card">
      <div class="title-block">
        <h2 class="title ui-page-title">
          <n-icon class="title-icon"><PersonOutline /></n-icon>
          个人中心
        </h2>
        <p class="subtitle ui-page-subtitle">管理您的个人资料与安全设置</p>
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
        <div class="ui-card user-card">
          <div class="avatar-wrapper">
            <div class="avatar-ring">
              <img v-if="displayAvatar" :src="displayAvatar" class="avatar-img" alt="用户头像" />
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
              <span class="value">{{ formatDateOnly(profile.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="ui-card security-card">
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

        <div class="ui-card info-card">
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
                <span class="value">{{ formatDate(profile.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ui-card favorite-card">
          <div class="fav-header">
            <div class="fav-title-group">
              <div class="fav-icon-wrapper">
                <n-icon size="18"><HeartOutline /></n-icon>
              </div>
              <span class="card-title">我的收藏夹</span>
              <n-tag v-if="collectionStats.total > 0" type="error" size="small" round :bordered="false" class="count-badge">
                {{ collectionStats.total }} 个
              </n-tag>
            </div>
            <n-button size="small" type="primary" text @click="() => router.push('/dashboard/collections')">
              管理全部 →
            </n-button>
          </div>

          <!-- 加载状态 -->
          <div v-if="collectionStats.loading" class="fav-loading-grid">
            <div v-for="i in 4" :key="i" class="fav-skeleton-card">
              <n-skeleton height="100%" :sharp="false" />
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="collectionStats.total === 0" class="fav-empty-state">
            <div class="empty-icon-box">
              <n-icon size="48"><HeartOutline /></n-icon>
            </div>
            <p class="empty-title">还没有收藏夹</p>
            <p class="empty-desc">收藏喜欢的图片，随时查看</p>
            <n-button type="primary" color="#f586a9" size="small" round @click="() => router.push('/dashboard/collections')">
              开始收藏
            </n-button>
          </div>

          <!-- 收藏夹卡片网格 -->
          <div v-else class="fav-cards-grid">
            <div
              v-for="c in collectionStats.items.slice(0, 6)"
              :key="c.id"
              class="fav-card-item"
              :class="{ 'is-default': c.isDefault }"
              @click="() => router.push('/dashboard/collections')"
            >
              <div class="fav-card-icon" :class="c.isDefault ? 'default-icon' : (c.visibility === 1 ? 'public-icon' : 'private-icon')">
                <span v-if="c.isDefault">⭐</span>
                <n-icon v-else-if="c.visibility === 1" size="20"><GlobeOutline /></n-icon>
                <n-icon v-else size="20"><LockClosedOutline /></n-icon>
              </div>
              <div class="fav-card-info">
                <span class="fav-card-name">{{ c.name }}</span>
                <span class="fav-card-status">{{ c.visibility === 1 ? '公开' : '私有' }}</span>
              </div>
              <div class="fav-card-arrow">
                <n-icon size="14"><ChevronForwardOutline /></n-icon>
              </div>
            </div>

            <!-- 更多收藏夹 -->
            <div
              v-if="collectionStats.items.length > 6"
              class="fav-card-item more-card"
              @click="() => router.push('/dashboard/collections')"
            >
              <div class="more-count">+{{ collectionStats.items.length - 6 }}</div>
              <span class="more-text">查看更多</span>
            </div>
          </div>
        </div>

<!-- ✅ 新增：快捷操作卡片 -->
<div class="ui-card quick-actions-card">
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
  padding: 24px; 
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}
.title { 
  margin: 0; 
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon {
  font-size: 28px;
  color: #f586a9;
}
.subtitle { 
  margin: 4px 0 0 0; 
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
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.stat-label {
  font-size: 11px;
  color: #6b7280;
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
.edit-name-btn { color: #6b7280; }
.edit-name-btn:hover { color: #f586a9; }

.role-badge { padding: 0 12px; font-weight: 600; }

.mini-stats {
  display: flex; align-items: center; justify-content: center; gap: 20px;
  margin-top: 24px; padding-top: 24px; width: 100%;
  border-top: 1px solid rgba(0,0,0,0.05);
}
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-item .value { font-size: 14px; font-weight: 700; color: #4b5563; }
.v-line { width: 1px; height: 24px; background: rgba(0,0,0,0.1); }

/* 左侧：安全 */
.security-card { 
  padding: 20px; 
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
  background: #fff; border-radius: 12px;
  border: 1px solid var(--ui-border); position: relative;
  transition: transform 0.2s;
}
.info-item:hover { background: #fff7fa; transform: translateY(-2px); }

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
.item-content .label { font-size: 12px; color: #6b7280; }
.item-content .value { font-size: 15px; font-weight: 600; color: #1f2937; word-break: break-all; }
.mono { font-family: monospace; }
.mini-edit { position: absolute; right: 8px; top: 8px; font-size: 12px; color: #f586a9; }

/* ✅ 收藏夹卡片样式 - 全新设计 */
.favorite-card {
  padding: 28px 32px;
  margin-top: 24px;
  background: linear-gradient(135deg, #fff 0%, #fff7fa 100%);
}

.fav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.fav-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fav-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f586a9, #ff7eb3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(245, 134, 169, 0.3);
}

.count-badge {
  margin-left: 4px;
  font-weight: 600;
}

/* 空状态 */
.fav-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
}

.empty-icon-box {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(245,134,169,0.1) 0%, rgba(255,200,220,0.2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f586a9;
  margin-bottom: 8px;
}

.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #4b5563;
}

.empty-desc {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

/* 加载状态 */
.fav-loading-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.fav-skeleton-card {
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
}

/* 收藏夹卡片网格 */
.fav-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.fav-card-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.7);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.25s ease;
}

.fav-card-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(245,134,169,0.15);
  border-color: rgba(245,134,169,0.3);
}

.fav-card-item.is-default {
  background: linear-gradient(135deg, rgba(255,250,240,0.9) 0%, rgba(255,245,230,0.8) 100%);
  border-color: rgba(251,191,36,0.3);
}

.fav-card-item.is-default:hover {
  box-shadow: 0 8px 24px rgba(251,191,36,0.2);
}

.fav-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.fav-card-icon.default-icon {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  box-shadow: 0 4px 12px rgba(251,191,36,0.3);
}

.fav-card-icon.public-icon {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16,185,129,0.3);
}

.fav-card-icon.private-icon {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 4px 12px rgba(99,102,241,0.3);
}

.fav-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fav-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-card-status {
  font-size: 12px;
  color: #6b7280;
}

.fav-card-arrow {
  color: #d1d5db;
  transition: transform 0.2s, color 0.2s;
}

.fav-card-item:hover .fav-card-arrow {
  color: #f586a9;
  transform: translateX(3px);
}

/* 更多卡片 */
.fav-card-item.more-card {
  background: linear-gradient(135deg, rgba(245,134,169,0.08) 0%, rgba(255,200,220,0.12) 100%);
  border: 1px dashed rgba(245,134,169,0.4);
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.fav-card-item.more-card:hover {
  border-style: solid;
  background: linear-gradient(135deg, rgba(245,134,169,0.15) 0%, rgba(255,200,220,0.2) 100%);
}

.more-count {
  font-size: 24px;
  font-weight: 700;
  color: #f586a9;
}

.more-text {
  font-size: 12px;
  color: #f586a9;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .info-grid { grid-template-columns: 1fr; }
  .fav-cards-grid { grid-template-columns: 1fr; }
  .fav-loading-grid { grid-template-columns: 1fr; }
  .favorite-card { padding: 20px; }
}

/* 弹窗通用 */
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-group label { font-size: 13px; color: #6b7280; font-weight: 500; }
.hint { font-size: 12px; color: #6b7280; margin: 4px 0 0 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
.pwd-form-layout { display: flex; flex-direction: column; gap: 16px; padding: 10px 0; }

:global(.glass-modal.n-modal) {
  background: #fff !important;
  border: 1px solid var(--ui-border) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15) !important;
}
:global(.glass-modal .n-card-header__main) { color: #1f2937 !important; }

.value-row { display: flex; align-items: center; gap: 8px; }
.ml-2 { margin-left: 8px; }

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
  color: #6b7280;
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
