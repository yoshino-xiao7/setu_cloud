<script setup lang="ts">
import type { ComputedRef } from 'vue'
import {
  ChatbubblesOutline,
  DownloadOutline,
  ImageOutline,
  PaperPlaneOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NSelect,
  NSkeleton,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed } from 'vue'
import { formatAiChatDrawUsage, hasAiChatDrawUsage } from '@/composables/ai-chat-draw/aiChatDrawUsage'
import { useAiChatDrawPage } from '@/composables/ai-chat-draw/useAiChatDrawPage'
import { getAiGenerationStatusMeta } from '@/utils/aiGenerationStatus'

const props = defineProps<{
  isAdmin: boolean
  loadPoints: () => Promise<void>
}>()

const message = useMessage()
const isAdminRef = computed(() => props.isAdmin) as ComputedRef<boolean>
const {
  pricingText,
  canSend,
  cooldownSeconds,
  detail,
  downloadJob,
  input,
  loading,
  loadSession,
  messages,
  nsfwMode,
  send,
  sendButtonText,
  sending,
  sessions,
  sessionUsage,
  startNewConversation,
} = useAiChatDrawPage({
  isAdmin: isAdminRef,
  loadPoints: props.loadPoints,
  message,
})

const sessionOptions = computed(() => sessions.value.map(item => ({
  label: item.title || `对话 #${item.id}`,
  value: item.id,
})))

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey)
    return
  event.preventDefault()
  void send()
}
</script>

<template>
  <NCard class="ui-card chat-card" :bordered="false">
    <template #header>
      <div class="card-title">
        <NIcon><ChatbubblesOutline /></NIcon>
        AI 对话绘画
      </div>
    </template>

    <div class="chat-toolbar">
      <NSelect
        :value="detail?.session?.id ?? null"
        :options="sessionOptions"
        :loading="loading"
        placeholder="当前对话"
        class="session-select"
        @update:value="(id: number) => id && loadSession(id)"
      />
      <NButton secondary :loading="loading" @click="startNewConversation">
        开新对话
      </NButton>
    </div>

    <div v-if="sessionUsage && hasAiChatDrawUsage(sessionUsage)" class="usage-bar">
      本次对话消耗：{{ formatAiChatDrawUsage(sessionUsage) }}
    </div>
    <p class="cost-hint">
      按 Token 计费：<b>{{ pricingText }}</b>（不足按 1 积分计），管理员免费。同一用户 30 秒内只能发送一次。
    </p>

    <div class="message-list">
      <NEmpty v-if="!messages.length && !sending" description="直接说想画什么，例如：生成一张猫娘" />
      <div v-for="item in messages" :key="item.id" class="message" :class="item.role">
        <div class="bubble" :class="{ 'has-job': Boolean(item.generationJob) }">
          <div class="message-meta">
            <strong>{{ item.role === 'user' ? '我' : '绘画助手' }}</strong>
            <NTag v-if="item.role === 'user' && item.adminFree" size="small" type="success">
              管理员免费
            </NTag>
            <NTag v-else-if="item.role === 'user' && item.pointsRefunded" size="small" type="warning">
              已退回积分
            </NTag>
            <NTag v-else-if="item.role === 'user' && item.pointsCost" size="small">
              {{ item.pointsCost }} 积分
            </NTag>
          </div>
          <p class="content">
            {{ item.content }}
          </p>
          <NCollapse v-if="item.reasoningContent" class="reasoning">
            <NCollapseItem title="查看思考链" name="reasoning">
              <pre>{{ item.reasoningContent }}</pre>
            </NCollapseItem>
          </NCollapse>
          <div v-if="item.usage && hasAiChatDrawUsage(item.usage)" class="turn-usage">
            本轮：{{ formatAiChatDrawUsage(item.usage) }}
          </div>
          <div v-if="item.generationJob" class="job-card">
            <div class="job-meta">
              <NIcon><ImageOutline /></NIcon>
              <NTag :type="getAiGenerationStatusMeta(item.generationJob.status).type" size="small">
                {{ getAiGenerationStatusMeta(item.generationJob.status).label }}
              </NTag>
              <span>#{{ item.generationJob.id }}</span>
            </div>
            <NImage
              v-if="item.generationJob.imageUrl"
              class="job-image"
              :src="item.generationJob.imageUrl"
              object-fit="contain"
              :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
            />
            <NSkeleton v-else-if="item.generationJob.status !== 'FAILED'" height="180px" />
            <p v-if="item.generationJob.errorMessage" class="job-error">
              {{ item.generationJob.userErrorMessage || item.generationJob.errorMessage }}
            </p>
            <NButton
              v-if="item.generationJob.imageUrl"
              size="small"
              secondary
              @click="downloadJob(item.generationJob)"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              下载原图
            </NButton>
          </div>
        </div>
      </div>
      <div v-if="sending" class="message assistant">
        <div class="bubble">
          正在思考并准备绘画…
        </div>
      </div>
    </div>

    <div class="composer">
      <NSpace align="center" justify="space-between">
        <label class="nsfw-switch">
          <NSwitch v-model:value="nsfwMode" />
          <span>成人向</span>
        </label>
        <small v-if="cooldownSeconds > 0">冷却中，{{ cooldownSeconds }} 秒后可再发</small>
      </NSpace>
      <NInput
        v-model:value="input"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 6 }"
        placeholder="想画什么？直接说「生成一张猫娘」就会出图"
        :disabled="sending"
        @keydown.enter="handleEnter"
      />
      <NButton type="primary" block :loading="sending" :disabled="!canSend" @click="send">
        <template #icon>
          <NIcon>
            <SparklesOutline v-if="sending" />
            <PaperPlaneOutline v-else />
          </NIcon>
        </template>
        {{ sendButtonText }}
      </NButton>
    </div>
  </NCard>
</template>

<style scoped>
.chat-card {
  min-height: 70vh;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.chat-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}

.usage-bar,
.cost-hint,
.turn-usage {
  color: var(--n-text-color-3, #64748b);
  font-size: 13px;
}

.cost-hint {
  margin: 6px 0 12px;
}

.message-list {
  display: grid;
  gap: 12px;
  min-height: 320px;
  max-height: min(58vh, 640px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 8px 0 16px;
}

.message {
  display: flex;
  width: 100%;
  min-width: 0;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  box-sizing: border-box;
  max-width: min(720px, 100%);
  min-width: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(148, 163, 184, 0.12);
  overflow: hidden;
}

.bubble.has-job {
  /* Definite width so generated images can scale with max-width:100% */
  width: min(720px, 100%);
}

.message.user .bubble {
  background: rgba(59, 130, 246, 0.16);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.content,
.reasoning pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.reasoning {
  margin-top: 8px;
}

.turn-usage {
  margin-top: 8px;
}

.job-card {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  min-width: 0;
  width: 100%;
}

.job-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.job-image {
  display: block;
  width: 100%;
  max-width: 100%;
}

.job-image :deep(.n-image),
.job-image :deep(img) {
  display: block;
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
}

.job-error {
  color: #e11d48;
  margin: 0;
}

.composer {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.nsfw-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .chat-card {
    min-height: auto;
  }

  .message-list {
    min-height: 240px;
    max-height: 48vh;
  }
}
</style>
