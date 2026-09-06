<script setup lang="ts">
import {
  AddOutline,
  CreateOutline,
  ShieldCheckmarkOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {

  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui'
import { useMusicTokenManagement } from '@/composables/useMusicTokenManagement'
import { formatDate } from '@/utils/dateFormat'

const {
  columns,
  editingId,
  getTokenCheckResult,
  handleDelete,
  formData,
  getCheckLabel,
  getCheckReason,
  getCheckTagType,
  handleCheckToken,
  handleSubmit,
  handleToggleStatus,
  isCheckingToken,
  isCompact,
  loading,
  maskCookie,
  modalTitle,
  openAddModal,
  openEditModal,
  probeSongId,
  showModal,
  submitting,
  tokens,
} = useMusicTokenManagement()
</script>

<template>
  <div class="page-container">
    <p class="ui-card" role="note" style="padding: 16px">禁用状态可能来自手动操作或自动降级；当前服务未提供自动降级原因，无法区分。请使用检测结果确认可用性。</p>
    <!-- 头部 -->
    <div class="header-section">
      <div>
        <h2 class="title">
          网易云音乐 Token 管理
        </h2>
        <p class="subtitle">
          管理网易云音乐 Cookie，用于代理音乐服务
        </p>
      </div>
      <div class="header-actions">
        <NInput
          v-model:value="probeSongId"
          class="probe-input"
          placeholder="VIP 测试歌曲 ID"
        />
        <NButton type="primary" size="large" @click="openAddModal">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          添加 Token
        </NButton>
      </div>
    </div>

    <!-- Token 列表 -->
    <NDataTable
      v-if="!isCompact"
      :columns="columns"
      :data="tokens"
      :loading="loading"
      :bordered="false"
      :scroll-x="1200"
      class="data-table"
    />

    <div v-else class="token-mobile-list">
      <div v-if="loading && tokens.length === 0" class="mobile-loading">
        加载中...
      </div>
      <div v-else-if="tokens.length === 0" class="empty-card">
        暂无 Token
      </div>
      <div v-for="token in tokens" :key="token.id" class="token-card">
        <div class="token-card-header">
          <div>
            <div class="token-name">
              {{ token.nickname || `Token #${token.id}` }}
            </div>
            <div class="token-id">
              #{{ token.id }}
            </div>
          </div>
          <NTag :type="token.status === 1 ? 'success' : 'default'" size="small" round>
            {{ token.status === 1 ? '启用' : '禁用' }}
          </NTag>
        </div>
        <div class="token-cookie">
          {{ maskCookie(token.cookie) }}
        </div>
        <div class="token-meta">
          <span>创建：{{ formatDate(token.createdAt) }}</span>
          <span>更新：{{ formatDate(token.updatedAt) }}</span>
        </div>
        <div class="token-check">
          <NTag :type="getCheckTagType(getTokenCheckResult(token.id))" size="small" round>
            {{ getCheckLabel(getTokenCheckResult(token.id)) }}
          </NTag>
          <span>{{ getCheckReason(getTokenCheckResult(token.id)) }}</span>
        </div>
        <div class="token-actions">
          <NSpace align="center">
            <span class="switch-label">启用</span>
            <NSwitch :value="token.status === 1" @update:value="() => handleToggleStatus(token)" />
          </NSpace>
          <div class="token-buttons">
            <NButton
              size="small"
              secondary
              type="info"
              :loading="isCheckingToken(token.id)"
              @click="handleCheckToken(token)"
            >
              <template #icon>
                <NIcon><ShieldCheckmarkOutline /></NIcon>
              </template>
              检测
            </NButton>
            <NButton size="small" secondary type="primary" @click="openEditModal(token)">
              <template #icon>
                <NIcon><CreateOutline /></NIcon>
              </template>
              编辑
            </NButton>
            <NPopconfirm
              positive-text="确认删除"
              negative-text="取消"
              @positive-click="handleDelete(token.id, token.nickname)"
            >
              <template #trigger>
                <NButton size="small" secondary type="error">
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                  删除
                </NButton>
              </template>
              确定要删除 Token「{{ token.nickname }}」吗？此操作不可恢复！
            </NPopconfirm>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      :style="{ width: '600px', maxWidth: '92vw' }"
      :mask-closable="false"
    >
      <NForm label-placement="top" label-width="80">
        <NFormItem label="Cookie" required>
          <NInput
            v-model:value="formData.cookie"
            type="textarea"
            placeholder="请粘贴完整的网易云 Cookie&#10;示例：MUSIC_U=xxxxx; __csrf=yyyyy"
            :rows="6"
          />
        </NFormItem>

        <NFormItem label="昵称">
          <NInput
            v-model:value="formData.nickname"
            placeholder="如：主账号、备用账号"
          />
        </NFormItem>

        <NFormItem v-if="editingId" label="状态">
          <NSpace align="center">
            <NSwitch v-model:value="formData.status" :checked-value="1" :unchecked-value="0" />
            <span style="color: #666;">{{ formData.status === 1 ? '启用' : '禁用' }}</span>
          </NSpace>
        </NFormItem>

        <!-- 帮助说明 -->
        <NSpace vertical style="margin-top: 16px; padding: 12px; background: #f5f7fa; border-radius: 8px;">
          <div style="font-weight: 600; color: #333;">
            📖 如何获取网易云 Cookie？
          </div>
          <div style="color: #666; font-size: 13px; line-height: 1.6;">
            1. 登录网易云音乐网页版（music.163.com）<br>
            2. 按 F12 打开开发者工具<br>
            3. 切换到"网络"（Network）选项卡<br>
            4. 刷新页面，找到任意请求<br>
            5. 在请求头中找到 Cookie，复制完整内容
          </div>
        </NSpace>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">
            取消
          </NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingId ? '保存' : '确定' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.probe-input {
  width: 220px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.data-table {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.playability-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.playability-reason {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.35;
}

.token-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-loading,
.empty-card,
.token-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mobile-loading,
.empty-card {
  color: #6b7280;
  text-align: center;
}

.token-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-card-header,
.token-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.token-name {
  color: #1f2937;
  font-size: 15px;
  font-weight: 800;
}

.token-id,
.token-meta {
  color: #6b7280;
  font-size: 12px;
}

.token-cookie {
  color: #4b5563;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.token-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.45;
}

.switch-label {
  color: #6b7280;
  font-size: 13px;
}

.token-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 640px) {
  .page-container {
    padding: 16px;
  }

  .header-section {
    align-items: stretch;
  }

  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .probe-input {
    width: 100%;
  }

  .header-section :deep(.n-button) {
    width: 100%;
  }

  .token-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .token-buttons,
  .token-buttons :deep(.n-button) {
    width: 100%;
  }

  .token-buttons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
