<script setup lang="ts">
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { useAiChatDrawAdminSettings } from '@/composables/useAiChatDrawAdminSettings'

const message = useMessage()
const {
  PROTOCOL_OPTIONS,
  activating,
  activeId,
  activeOptions,
  activate,
  apiKeyHint,
  availablePresets,
  catalogHint,
  closeEditor,
  deletingId,
  editorMode,
  editorTitle,
  editorVisible,
  fetchModels,
  form,
  load,
  loading,
  loadingModels,
  modelOptions,
  openCreateCustom,
  openCreatePreset,
  openEdit,
  providers,
  remove,
  save,
  saving,
} = useAiChatDrawAdminSettings(message)
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div>
        <h2 class="title">
          对话绘画模型
        </h2>
        <p class="subtitle">
          配置多个提供方后，可随时切换当前使用的模型，无需每次重新填写密钥。
        </p>
      </div>
      <NButton secondary :loading="loading" @click="load">
        刷新
      </NButton>
    </div>

    <NCard class="ui-card active-card" :bordered="false" :loading="loading">
      <div class="active-row">
        <div>
          <div class="active-label">
            当前使用模型
          </div>
          <p class="active-help">
            从已保存的提供方中选择，切换后立即生效。
          </p>
        </div>
        <NSelect
          class="active-select"
          :value="activeId"
          :options="activeOptions"
          :loading="activating"
          :disabled="!activeOptions.length"
          placeholder="请先添加并配置提供方"
          @update:value="activate"
        />
      </div>
    </NCard>

    <NCard class="ui-card" :bordered="false" :loading="loading" title="已配置提供方">
      <div v-if="!providers.length" class="empty-hint">
        还没有提供方。先添加预设或自定义提供方，并填入 API 密钥。
      </div>
      <div v-else class="provider-list">
        <div
          v-for="item in providers"
          :key="item.id ?? item.providerId"
          class="provider-row"
        >
          <div class="provider-main">
            <span
              class="status-dot"
              :class="{ on: item.active && item.apiKeyConfigured && item.enabled }"
            />
            <div>
              <div class="provider-name">
                {{ item.displayName }}
                <NTag v-if="item.custom" size="small" :bordered="false">
                  自定义
                </NTag>
                <NTag v-if="item.active" size="small" type="success" :bordered="false">
                  当前使用
                </NTag>
              </div>
              <div class="provider-meta">
                {{ item.model }} · {{ item.apiProtocol }}
              </div>
            </div>
          </div>
          <NSpace>
            <NButton secondary size="small" @click="openEdit(item)">
              编辑
            </NButton>
            <NButton
              v-if="!item.active"
              size="small"
              type="error"
              secondary
              :loading="deletingId === item.id"
              @click="remove(item)"
            >
              删除
            </NButton>
          </NSpace>
        </div>
      </div>

      <div class="add-actions">
        <NButton
          v-for="preset in availablePresets"
          :key="preset.providerId"
          dashed
          class="add-btn"
          @click="openCreatePreset(preset)"
        >
          + 添加 {{ preset.displayName }}
        </NButton>
        <NButton dashed class="add-btn" @click="openCreateCustom">
          + 添加自定义提供方
        </NButton>
      </div>
    </NCard>

    <NModal
      v-model:show="editorVisible"
      preset="card"
      :title="editorTitle"
      style="width: min(720px, 94vw)"
      :mask-closable="false"
      @after-leave="closeEditor"
    >
      <NForm label-placement="top" class="provider-form">
        <NFormItem label="Provider ID" required>
          <NInput
            v-model:value="form.providerId"
            placeholder="acme-gateway"
            :disabled="editorMode === 'edit' && !form.custom"
          />
        </NFormItem>
        <NFormItem label="显示名称" required>
          <NInput v-model:value="form.displayName" placeholder="显示名称" />
        </NFormItem>
        <NFormItem label="API 地址" required>
          <NInput v-model:value="form.baseUrl" placeholder="https://gateway.example/v1" />
        </NFormItem>
        <NFormItem label="API 协议" required>
          <NSelect v-model:value="form.apiProtocol" :options="PROTOCOL_OPTIONS" />
        </NFormItem>
        <NFormItem label="API 密钥" :required="!apiKeyHint.includes('已配置')">
          <NInput
            v-model:value="form.apiKey"
            type="password"
            show-password-on="click"
            placeholder="输入 API 密钥"
          />
          <template #feedback>
            {{ apiKeyHint }}
          </template>
        </NFormItem>
        <div class="model-section">
          <div class="model-section-header">
            <strong>模型目录</strong>
            <NButton text type="primary" :loading="loadingModels" @click="fetchModels">
              获取可用模型
            </NButton>
          </div>
          <div class="model-catalog-box">
            {{ catalogHint }}
          </div>
          <NFormItem label="绘画模型" required :show-feedback="false">
            <NSelect
              v-model:value="form.model"
              filterable
              tag
              :options="modelOptions"
              :loading="loadingModels"
              placeholder="选择或输入模型 ID"
            />
          </NFormItem>
        </div>
        <NFormItem label="每积分 Token 数">
          <NInputNumber v-model:value="form.tokensPerPoint" :min="1" :precision="0" class="tokens-input" />
        </NFormItem>
        <NFormItem label="启用">
          <NSwitch v-model:value="form.enabled" />
        </NFormItem>
        <NFormItem v-if="editorMode !== 'edit'" label="保存后设为当前使用">
          <NSwitch v-model:value="form.activate" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton secondary :disabled="saving" @click="closeEditor">
            取消
          </NButton>
          <NButton type="primary" :loading="saving" @click="save">
            保存
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.page-container {
  display: grid;
  gap: 16px;
}

.header-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.subtitle {
  margin: 6px 0 0;
  color: var(--n-text-color-3, #64748b);
}

.active-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.active-label {
  font-weight: 600;
  margin-bottom: 4px;
}

.active-help {
  margin: 0;
  color: var(--n-text-color-3, #64748b);
  font-size: 13px;
}

.active-select {
  width: min(360px, 100%);
}

.empty-hint {
  color: var(--n-text-color-3, #64748b);
  margin-bottom: 16px;
}

.provider-list {
  display: grid;
  gap: 10px;
}

.provider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
}

.provider-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}

.status-dot.on {
  background: #22c55e;
}

.provider-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.provider-meta {
  margin-top: 2px;
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
}

.add-actions {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.add-btn {
  width: 100%;
  justify-content: center;
  min-height: 44px;
}

.provider-form {
  max-width: 100%;
}

.model-section {
  margin: 8px 0 18px;
}

.model-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.model-catalog-box {
  border: 1px dashed rgba(148, 163, 184, 0.55);
  border-radius: 12px;
  padding: 14px 16px;
  color: var(--n-text-color-3, #64748b);
  margin-bottom: 12px;
  background: rgba(148, 163, 184, 0.06);
}

.tokens-input {
  width: 100%;
  max-width: 240px;
}

@media (max-width: 720px) {
  .header-section,
  .active-row,
  .provider-row {
    flex-direction: column;
    align-items: stretch;
  }

  .active-select {
    width: 100%;
  }
}
</style>
