<script setup lang="ts">
import {
  BookOutline,
  CalendarOutline,
  ChevronForwardOutline,
  CloudUploadOutline,
  FingerPrintOutline,
  GlobeOutline,
  HeartOutline,
  KeyOutline,
  LaptopOutline,
  LockClosedOutline,
  MailOutline,
  MusicalNotesOutline,
  Pencil,
  PersonOutline,
  ShieldCheckmarkOutline,
  StatsChartOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
  NInput,
  NModal,
  NSkeleton,
  NTag,
  NUpload,
} from 'naive-ui'
import { useProfilePage } from '@/composables/useProfilePage'
import { formatDate, formatDateOnly } from '@/utils/dateFormat'

const {
  changingPwd,
  collectionStats,
  confirmDeletePasskey,
  customRequest,
  displayAvatar,
  displayName,
  emailFirstLetter,
  goTo,
  handleAddPasskey,
  handleChangePassword,
  handleRenamePasskey,
  handleSaveNickname,
  isAdmin,
  isPasskeySupported,
  nameForm,
  openAddPasskey,
  openChangePwd,
  openEditName,
  openRenamePasskey,
  passkeyNickname,
  passkeySubmitting,
  passkeys,
  passkeysLoading,
  profile,
  pwdForm,
  savingName,
  showAddPasskey,
  showChangePwd,
  showEditName,
  showRenamePasskey,
} = useProfilePage()
</script>

<template>
  <div class="page-container ui-page">
    <div class="page-header ui-page-header ui-card">
      <div class="title-block">
        <h2 class="title ui-page-title">
          <NIcon class="title-icon">
            <PersonOutline />
          </NIcon>
          个人中心
        </h2>
        <p class="subtitle ui-page-subtitle">
          管理您的个人资料与安全设置
        </p>
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
              <img v-if="displayAvatar" :src="displayAvatar" class="avatar-img" alt="用户头像" loading="lazy" decoding="async">
              <div v-else class="avatar-placeholder">
                {{ emailFirstLetter }}
              </div>
            </div>
            <NUpload
              :show-file-list="false"
              :custom-request="customRequest"
              accept="image/*"
              class="upload-trigger"
            >
              <NButton circle type="primary" color="#f586a9" class="edit-avatar-btn">
                <template #icon>
                  <NIcon><CloudUploadOutline /></NIcon>
                </template>
              </NButton>
            </NUpload>
          </div>

          <div class="user-info">
            <div class="name-row">
              <h3 class="username">
                {{ displayName }}
              </h3>
              <NButton text size="tiny" class="edit-name-btn" @click="openEditName">
                <NIcon><Pencil /></NIcon>
              </NButton>
            </div>

            <NTag
              :type="isAdmin ? 'error' : 'info'"
              round size="small" :bordered="false" class="role-badge"
            >
              {{ isAdmin ? '管理员' : '普通用户' }}
            </NTag>
          </div>

          <div class="mini-stats">
            <div class="stat-item">
              <span class="label">UID</span>
              <span class="value">{{ profile.id }}</span>
            </div>
            <div class="v-line" />
            <div class="stat-item">
              <span class="label">加入时间</span>
              <span class="value">{{ formatDateOnly(profile.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="ui-card security-card">
          <div class="sec-header">
            <NIcon color="#10b981" size="20">
              <ShieldCheckmarkOutline />
            </NIcon>
            <span class="sec-title">安全状态：良好</span>
          </div>
          <ul class="sec-tips">
            <li>🔐 建议设置复杂的密码以保护账号。</li>
            <li>🔑 请勿将 API Key 泄露给他人。</li>
            <li>✅ 定期检查登录记录和安全设置。</li>
          </ul>
          <NButton
            text
            type="primary"
            color="#f586a9"
            size="small"
            class="sec-action"
            @click="openChangePwd"
          >
            <template #icon>
              <NIcon><KeyOutline /></NIcon>
            </template>
            修改密码
          </NButton>
        </div>
      </div>

      <div class="right-column">
        <div class="ui-card info-card">
          <div class="info-header">
            <span class="card-title">账户资料</span>
            <NButton size="small" secondary type="warning" @click="openChangePwd">
              <template #icon>
                <NIcon><KeyOutline /></NIcon>
              </template>
              修改密码
            </NButton>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="item-icon pink">
                <NIcon><PersonOutline /></NIcon>
              </div>
              <div class="item-content">
                <span class="label">昵称</span>
                <span class="value">{{ profile.nickname || '未设置' }}</span>
              </div>
              <NButton text class="mini-edit" @click="openEditName">
                修改
              </NButton>
            </div>

            <div class="info-item">
              <div class="item-icon blue">
                <NIcon><MailOutline /></NIcon>
              </div>
              <div class="item-content">
                <span class="label">注册邮箱</span>
                <span class="value">{{ profile.email }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="item-icon purple">
                <NIcon><FingerPrintOutline /></NIcon>
              </div>
              <div class="item-content">
                <span class="label">用户 ID (UID)</span>
                <span class="value mono">{{ profile.id }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="item-icon green">
                <NIcon><LaptopOutline /></NIcon>
              </div>
              <div class="item-content">
                <span class="label">上次登录 IP</span>
                <div class="value-row">
                  <span class="value mono">{{ profile.lastLoginIp || '未知' }}</span>
                  <NTag v-if="profile.lastLoginIp" type="success" size="tiny" round :bordered="false" class="ml-2">
                    本机
                  </NTag>
                </div>
              </div>
            </div>

            <div class="info-item">
              <div class="item-icon orange">
                <NIcon><CalendarOutline /></NIcon>
              </div>
              <div class="item-content">
                <span class="label">注册日期</span>
                <span class="value">{{ formatDate(profile.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ui-card passkey-card">
          <div class="passkey-header">
            <div class="passkey-title-group">
              <div class="passkey-icon-wrapper">
                <NIcon size="18">
                  <FingerPrintOutline />
                </NIcon>
              </div>
              <span class="card-title">通行密钥</span>
              <NTag v-if="passkeys.length > 0" type="success" size="small" round :bordered="false">
                {{ passkeys.length }} 个
              </NTag>
            </div>
            <NButton
              size="small"
              type="primary"
              secondary
              color="#f586a9"
              :disabled="!isPasskeySupported()"
              @click="openAddPasskey"
            >
              添加
            </NButton>
          </div>

          <div v-if="!isPasskeySupported()" class="passkey-unavailable">
            当前浏览器或环境不支持通行密钥
          </div>

          <div v-else-if="passkeysLoading" class="passkey-skeleton-list">
            <NSkeleton v-for="i in 2" :key="i" height="64px" :sharp="false" />
          </div>

          <div v-else-if="passkeys.length === 0" class="passkey-empty">
            <div class="passkey-empty-icon">
              <NIcon size="26">
                <FingerPrintOutline />
              </NIcon>
            </div>
            <span>未开通通行密钥</span>
          </div>

          <div v-else class="passkey-list">
            <div v-for="item in passkeys" :key="item.id" class="passkey-item">
              <div class="passkey-device">
                <div class="passkey-device-icon">
                  <NIcon size="20">
                    <FingerPrintOutline />
                  </NIcon>
                </div>
                <div class="passkey-device-info">
                  <span class="passkey-name">{{ item.nickname || `通行密钥 #${item.id}` }}</span>
                  <span class="passkey-meta">
                    创建 {{ item.createdAt ? formatDateOnly(item.createdAt) : '-' }}
                    <template v-if="item.lastUsedAt"> · 最近使用 {{ formatDateOnly(item.lastUsedAt) }}</template>
                  </span>
                </div>
              </div>
              <div class="passkey-actions">
                <NButton size="tiny" text type="primary" @click="openRenamePasskey(item)">
                  重命名
                </NButton>
                <NButton size="tiny" text type="error" @click="confirmDeletePasskey(item)">
                  删除
                </NButton>
              </div>
            </div>
          </div>
        </div>

        <div class="ui-card favorite-card">
          <div class="fav-header">
            <div class="fav-title-group">
              <div class="fav-icon-wrapper">
                <NIcon size="18">
                  <HeartOutline />
                </NIcon>
              </div>
              <span class="card-title">我的收藏夹</span>
              <NTag v-if="collectionStats.total > 0" type="error" size="small" round :bordered="false" class="count-badge">
                {{ collectionStats.total }} 个
              </NTag>
            </div>
            <NButton size="small" type="primary" text @click="goTo('/dashboard/collections')">
              管理全部 →
            </NButton>
          </div>

          <!-- 加载状态 -->
          <div v-if="collectionStats.loading" class="fav-loading-grid">
            <div v-for="i in 4" :key="i" class="fav-skeleton-card">
              <NSkeleton height="100%" :sharp="false" />
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="collectionStats.total === 0" class="fav-empty-state">
            <div class="empty-icon-box">
              <NIcon size="48">
                <HeartOutline />
              </NIcon>
            </div>
            <p class="empty-title">
              还没有收藏夹
            </p>
            <p class="empty-desc">
              收藏喜欢的图片，随时查看
            </p>
            <NButton type="primary" color="#f586a9" size="small" round @click="goTo('/dashboard/collections')">
              开始收藏
            </NButton>
          </div>

          <!-- 收藏夹卡片网格 -->
          <div v-else class="fav-cards-grid">
            <div
              v-for="c in collectionStats.items.slice(0, 6)"
              :key="c.id"
              class="fav-card-item"
              :class="{ 'is-default': c.isDefault }"
              @click="goTo('/dashboard/collections')"
            >
              <div class="fav-card-icon" :class="c.isDefault ? 'default-icon' : (c.visibility === 1 ? 'public-icon' : 'private-icon')">
                <span v-if="c.isDefault">⭐</span>
                <NIcon v-else-if="c.visibility === 1" size="20">
                  <GlobeOutline />
                </NIcon>
                <NIcon v-else size="20">
                  <LockClosedOutline />
                </NIcon>
              </div>
              <div class="fav-card-info">
                <span class="fav-card-name">{{ c.name }}</span>
                <span class="fav-card-status">{{ c.visibility === 1 ? '公开' : '私有' }}</span>
              </div>
              <div class="fav-card-arrow">
                <NIcon size="14">
                  <ChevronForwardOutline />
                </NIcon>
              </div>
            </div>

            <!-- 更多收藏夹 -->
            <div
              v-if="collectionStats.items.length > 6"
              class="fav-card-item more-card"
              @click="goTo('/dashboard/collections')"
            >
              <div class="more-count">
                +{{ collectionStats.items.length - 6 }}
              </div>
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
            <div class="action-item" @click="goTo('/dashboard/api-keys')">
              <div class="action-icon" style="background: rgba(245, 134, 169, 0.1); color: #f586a9;">
                <NIcon size="24">
                  <KeyOutline />
                </NIcon>
              </div>
              <div class="action-content">
                <span class="action-title">API Key</span>
                <span class="action-desc">管理您的密钥</span>
              </div>
            </div>

            <div class="action-item" @click="goTo('/dashboard/points')">
              <div class="action-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                <NIcon size="24">
                  <StatsChartOutline />
                </NIcon>
              </div>
              <div class="action-content">
                <span class="action-title">积分抽卡</span>
                <span class="action-desc">试试今天的运气</span>
              </div>
            </div>

            <div class="action-item" @click="goTo('/dashboard/music')">
              <div class="action-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                <NIcon size="24">
                  <MusicalNotesOutline />
                </NIcon>
              </div>
              <div class="action-content">
                <span class="action-title">音乐搜索</span>
                <span class="action-desc">探索好听的歌</span>
              </div>
            </div>

            <div class="action-item" @click="goTo('/dashboard/docs')">
              <div class="action-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                <NIcon size="24">
                  <BookOutline />
                </NIcon>
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

    <NModal
      v-model:show="showEditName"
      preset="card"
      title="修改昵称"
      class="glass-modal"
      :style="{ width: '400px' }"
    >
      <div class="form-group">
        <label>新昵称</label>
        <NInput
          v-model:value="nameForm"
          placeholder="请输入新的昵称"
          autofocus
          @keydown.enter="handleSaveNickname"
        />
        <p class="hint">
          建议使用中文或英文，最多 64 个字符。
        </p>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showEditName = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="savingName" @click="handleSaveNickname">
            保存
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="showChangePwd"
      preset="card"
      title="修改密码"
      class="glass-modal"
      :style="{ width: '400px' }"
    >
      <div class="pwd-form-layout">
        <div class="form-group">
          <label>当前密码</label>
          <NInput v-model:value="pwdForm.old" type="password" show-password-on="click" />
        </div>
        <div class="form-group">
          <label>新密码</label>
          <NInput v-model:value="pwdForm.new" type="password" show-password-on="click" />
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <NInput v-model:value="pwdForm.confirm" type="password" show-password-on="click" />
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showChangePwd = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="changingPwd" @click="handleChangePassword">
            确认修改
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="showAddPasskey"
      preset="card"
      title="添加通行密钥"
      class="glass-modal"
      :style="{ width: '420px' }"
    >
      <div class="form-group">
        <label>名称</label>
        <NInput
          v-model:value="passkeyNickname"
          placeholder="例如：MacBook Touch ID"
          autofocus
          @keydown.enter="handleAddPasskey"
        />
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showAddPasskey = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="passkeySubmitting" @click="handleAddPasskey">
            添加
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="showRenamePasskey"
      preset="card"
      title="重命名通行密钥"
      class="glass-modal"
      :style="{ width: '420px' }"
    >
      <div class="form-group">
        <label>名称</label>
        <NInput
          v-model:value="passkeyNickname"
          placeholder="请输入新的名称"
          autofocus
          @keydown.enter="handleRenamePasskey"
        />
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showRenamePasskey = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="passkeySubmitting" @click="handleRenamePasskey">
            保存
          </NButton>
        </div>
      </template>
    </NModal>
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

/* 通行密钥 */
.passkey-card {
  padding: 28px 32px;
  margin-top: 24px;
  background: linear-gradient(135deg, #fff 0%, #f8fbff 100%);
}

.passkey-header,
.passkey-title-group,
.passkey-device,
.passkey-actions {
  display: flex;
  align-items: center;
}

.passkey-header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.passkey-title-group {
  gap: 12px;
}

.passkey-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #60a5fa, #f586a9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.22);
}

.passkey-unavailable,
.passkey-empty {
  display: grid;
  place-items: center;
  min-height: 120px;
  color: #64748b;
  border: 1px dashed rgba(148, 163, 184, 0.42);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.62);
}

.passkey-empty {
  gap: 10px;
}

.passkey-empty-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  color: #f26d99;
  background: rgba(245, 134, 169, 0.12);
}

.passkey-skeleton-list,
.passkey-list {
  display: grid;
  gap: 12px;
}

.passkey-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.82);
  background: rgba(255, 255, 255, 0.76);
}

.passkey-device {
  min-width: 0;
  gap: 12px;
}

.passkey-device-icon {
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: #2563eb;
  background: rgba(96, 165, 250, 0.12);
}

.passkey-device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.passkey-name {
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.passkey-meta {
  color: #94a3b8;
  font-size: 12px;
}

.passkey-actions {
  flex-shrink: 0;
  gap: 10px;
}

@media (max-width: 600px) {
  .passkey-card {
    padding: 20px;
  }

  .passkey-header,
  .passkey-item {
    align-items: stretch;
    flex-direction: column;
  }

  .passkey-actions {
    justify-content: flex-end;
  }
}

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
