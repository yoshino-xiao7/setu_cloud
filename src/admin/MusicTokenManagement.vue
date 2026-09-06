<script setup lang="ts">
import {
  AddOutline,
  CreateOutline,
  ShieldCheckmarkOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {

  NButton,
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
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useMusicTokenManagement } from '@/composables/useMusicTokenManagement'
import { formatDate } from '@/utils/dateFormat'

const {
  loadError,
  fetchTokens,
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
  <UiBoard class="page-container">
    <p class="board-panel" role="note" style="padding: 16px">
      禁用状态可能来自手动操作或自动降级；当前服务未提供自动降级原因，无法区分。请使用检测结果确认可用性。
    </p>
    <!-- 头部 -->
    <div class="board-header-section">
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

    <UiRecordBoard :error="loadError" :items="tokens" :loading="loading" empty="暂无 Token" :item-key="token => token.id">
      <template #error>
        {{ loadError }}<NButton @click="fetchTokens()">
          重试
        </NButton>
      </template>
      <template #default="{ item: token }">
        <UiRecordCard :headline="token.nickname || `Token #${token.id}`" :supporting="maskCookie(token.cookie)" :status="{ text: token.status === 1 ? '启用' : '禁用', tone: token.status === 1 ? 'success' : 'muted' }" :fields="[{ name: 'ID', value: String(token.id) }, { name: '创建时间', value: formatDate(token.createdAt) }, { name: '更新时间', value: formatDate(token.updatedAt) }]" density="compact">
          <div class="token-check">
            <NTag :type="getCheckTagType(getTokenCheckResult(token.id))" size="small" round>
              {{ getCheckLabel(getTokenCheckResult(token.id)) }}
            </NTag><span>{{ getCheckReason(getTokenCheckResult(token.id)) }}</span>
          </div>
          <template #actions>
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
          </template>
        </UiRecordCard>
      </template>
    </UiRecordBoard>

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
  </UiBoard>
</template>

<style scoped>
.board-panel { padding: 16px; border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); background: var(--board-surface); color: var(--board-text); }
.page-container, .admin-page, .operation-log-page { width: 100%; min-width: 0; padding-bottom: 80px; }
.board-page-header, .board-header-section, .section-header, .list-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.title, .page-title, .board-page-header h2, .section-title { margin: 0; color: var(--board-text); }
.subtitle, .board-page-header p, .section-subtitle { margin: 4px 0 0; color: var(--board-text-muted); }
.toolbar, .filter-card, .search-bar, .temp-block-wrapper { padding: 16px; border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); background: var(--board-surface); }
.toolbar, .header-actions, .actions-box, .filter-actions, .bulk-actions, .bulk-select, .token-buttons, .token-check { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.search-box { flex: 1; min-width: min(180px, 100%); }
.header-actions, .probe-input { min-width: 0; max-width: 100%; }
.probe-input { width: 180px; }
.filter-grid, .search-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.filter-actions { margin-top: 12px; }
:deep(.n-pagination) { flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 100%; }
:deep(.n-button) { min-height: 44px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
 .token-check { overflow-wrap: anywhere; } .token-buttons { justify-content: flex-end; }
</style>
