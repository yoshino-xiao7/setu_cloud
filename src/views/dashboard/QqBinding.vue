<script setup lang="ts">
import {
  ChatbubbleEllipsesOutline,
  CheckmarkCircleOutline,
  RefreshOutline,
  SendOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NSpace,
  NTag,
} from 'naive-ui'
import { useQqBindingPage } from '@/composables/useQqBindingPage'

const {
  binding,
  canSaveBinding,
  canSendCode,
  disableBinding,
  isBound,
  loadBinding,
  loading,
  qqEmail,
  qqNumber,
  saveBinding,
  saving,
  sendVerificationCode,
  sendingCode,
  statusText,
  verificationCode,
} = useQqBindingPage()
</script>

<template>
  <div class="qq-binding-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          QQ 绑定
        </h1>
        <p class="ui-page-subtitle">
          绑定前会向对应 QQ 邮箱发送验证码，验证通过后用于 AI 绘图推送和后续账号通知。
        </p>
      </div>
      <NSpace>
        <NTag round :type="isBound ? 'success' : 'default'">
          {{ statusText }}
        </NTag>
        <NButton secondary :loading="loading" @click="loadBinding">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <div class="binding-layout">
      <NCard class="ui-card binding-card" :bordered="false">
        <template #header>
          <div class="card-title">
            <NIcon><ChatbubbleEllipsesOutline /></NIcon>
            账号 QQ
          </div>
        </template>

        <NAlert type="info" class="binding-alert">
          一个账号只能绑定一个 QQ。输入 QQ 号后，验证码会发送到对应的 QQ 邮箱。
        </NAlert>

        <NForm label-placement="top" class="binding-form">
          <NFormItem label="QQ 号">
            <div class="field-with-action">
              <NInput
                v-model:value="qqNumber"
                clearable
                maxlength="20"
                placeholder="请输入 QQ 号"
                :disabled="loading || saving || sendingCode"
                @keydown.enter="sendVerificationCode"
              />
              <NButton
                secondary
                type="primary"
                :disabled="!canSendCode"
                :loading="sendingCode"
                @click="sendVerificationCode"
              >
                <template #icon>
                  <NIcon><SendOutline /></NIcon>
                </template>
                发送验证码
              </NButton>
            </div>
          </NFormItem>

          <NFormItem label="邮箱验证码">
            <NInput
              v-model:value="verificationCode"
              clearable
              maxlength="6"
              placeholder="请输入 6 位验证码"
              :disabled="loading || saving"
              @keydown.enter="saveBinding"
            />
          </NFormItem>

          <div v-if="qqEmail" class="mail-hint">
            验证邮件将发送至 <strong>{{ qqEmail }}</strong>
          </div>

          <div class="binding-actions">
            <NButton
              type="primary"
              :disabled="!canSaveBinding"
              :loading="saving"
              @click="saveBinding"
            >
              <template #icon>
                <NIcon><CheckmarkCircleOutline /></NIcon>
              </template>
              验证并绑定
            </NButton>
            <NButton
              v-if="isBound"
              tertiary
              type="error"
              :loading="saving"
              @click="disableBinding"
            >
              取消绑定
            </NButton>
          </div>
        </NForm>
      </NCard>

      <section class="ui-card usage-card">
        <div class="usage-icon">
          <NIcon><SendOutline /></NIcon>
        </div>
        <div class="usage-content">
          <h2>可用场景</h2>
          <p>AI 绘图进入本机队列和生成完成时，会优先使用这里的 QQ 绑定。后续如果接入系统通知、审核提醒或其他 Bot 功能，也会复用这份账号级绑定。</p>
          <div class="usage-status">
            <span>当前状态</span>
            <strong>{{ binding.enabled ? '已启用' : '未启用' }}</strong>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.qq-binding-page {
  display: grid;
  gap: 18px;
}

.binding-layout {
  display: grid;
  grid-template-columns: minmax(320px, 560px) minmax(280px, 1fr);
  gap: 18px;
  align-items: start;
}

.binding-card,
.usage-card {
  border-radius: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-text);
  font-weight: 800;
}

.binding-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}

.binding-form {
  display: grid;
  gap: 4px;
}

.field-with-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  width: 100%;
}

.mail-hint {
  margin-top: -4px;
  color: var(--ui-text-muted);
  font-size: 13px;
}

.mail-hint strong {
  color: var(--ui-text);
  font-weight: 700;
}

.binding-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.usage-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 14px;
  padding: 20px;
}

.usage-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  background: rgba(245, 134, 169, 0.12);
  color: var(--ui-primary);
  font-size: 25px;
}

.usage-content {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.usage-content h2 {
  margin: 0;
  color: var(--ui-text);
  font-size: 17px;
}

.usage-content p {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.usage-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.usage-status span {
  color: var(--ui-text-muted);
  font-size: 12px;
}

.usage-status strong {
  color: var(--ui-text);
  font-size: 13px;
}

@media (max-width: 900px) {
  .binding-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .qq-binding-page {
    gap: 12px;
  }

  .binding-layout {
    gap: 12px;
  }

  .field-with-action {
    grid-template-columns: 1fr;
  }

  .usage-card {
    grid-template-columns: 1fr;
  }
}
</style>
