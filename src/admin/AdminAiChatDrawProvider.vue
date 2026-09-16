<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch,
  useMessage,
} from 'naive-ui'
import { useAiChatDrawAdminSettings } from '@/composables/useAiChatDrawAdminSettings'

const message = useMessage()
const {
  PROTOCOL_OPTIONS,
  apiKeyHint,
  catalogHint,
  fetchModels,
  form,
  load,
  loading,
  loadingModels,
  modelOptions,
  save,
  saving,
} = useAiChatDrawAdminSettings(message)
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div>
        <h2 class="title">
          对话绘画提供方
        </h2>
        <p class="subtitle">
          在后台配置 DeepSeek / OpenAI 兼容网关，更换绘画对话模型，无需改服务器 .env。
        </p>
      </div>
      <NSpace>
        <NButton secondary :loading="loading" @click="load">
          刷新
        </NButton>
        <NButton type="primary" :loading="saving" @click="save">
          保存配置
        </NButton>
      </NSpace>
    </div>

    <NCard class="ui-card" :bordered="false" :loading="loading">
      <NAlert type="info" :bordered="false" class="hint">
        保存后立即生效。API 密钥不会回显明文；留空密钥字段表示保持现有密钥。未在后台覆盖时，仍会回退到环境变量。
      </NAlert>

      <NForm label-placement="top" class="provider-form">
        <NFormItem label="Provider ID" required>
          <NInput v-model:value="form.providerId" placeholder="acme-gateway" />
          <template #feedback>
            以小写字母开头的标识，在请求中唯一标识该提供方。
          </template>
        </NFormItem>

        <NFormItem label="显示名称" required>
          <NInput v-model:value="form.displayName" placeholder="显示名称" />
        </NFormItem>

        <NFormItem label="API 地址" required>
          <NInput v-model:value="form.baseUrl" placeholder="https://gateway.example/v1" />
        </NFormItem>

        <NFormItem label="API 协议" required>
          <NSelect v-model:value="form.apiProtocol" :options="PROTOCOL_OPTIONS" />
          <template #feedback>
            openai-completions：DeepSeek / 多数兼容网关；openai-responses：OpenAI Responses；anthropic-messages：Claude Messages。
          </template>
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
              placeholder="选择或输入模型 ID，例如 deepseek-flash"
            />
          </NFormItem>
          <p class="model-help">
            可从上游目录选择，也可直接输入目录外的模型 ID。
          </p>
        </div>

        <NFormItem label="每积分 Token 数">
          <NInputNumber v-model:value="form.tokensPerPoint" :min="1" :precision="0" class="tokens-input" />
          <template #feedback>
            默认 1000，即每 1000 Token = 1 积分（向上取整）。
          </template>
        </NFormItem>

        <NFormItem label="启用对话绘画">
          <NSwitch v-model:value="form.enabled" />
        </NFormItem>
      </NForm>

      <div class="footer-actions">
        <NButton secondary :disabled="saving" @click="load">
          取消更改
        </NButton>
        <NButton type="primary" :loading="saving" @click="save">
          保存提供方
        </NButton>
      </div>
    </NCard>
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

.hint {
  margin-bottom: 18px;
}

.provider-form {
  max-width: 720px;
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

.model-help {
  margin: 6px 0 0;
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
}

.tokens-input {
  width: 100%;
  max-width: 240px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

@media (max-width: 720px) {
  .header-section {
    flex-direction: column;
  }
}
</style>
