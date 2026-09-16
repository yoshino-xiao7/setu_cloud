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
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, nextTick, ref, watch } from 'vue'
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
  isCurrentArchived,
  loading,
  loadSession,
  messages,
  nsfwMode,
  archiveCurrentSession,
  unarchiveCurrentSession,
  send,
  sendButtonText,
  sending,
  sessions,
  archivedSessions,
  sessionUsage,
  startNewConversation,
  streamingDraft,
} = useAiChatDrawPage({
  isAdmin: isAdminRef,
  loadPoints: props.loadPoints,
  message,
})

const sessionOptions = computed(() => {
  const active = sessions.value.map(item => ({
    label: item.title || `对话 #${item.id}`,
    value: item.id,
  }))
  const archived = archivedSessions.value.map(item => ({
    label: `${item.title || `对话 #${item.id}`}（已归档）`,
    value: item.id,
  }))
  if (!archived.length)
    return active
  return [
    {
      type: 'group',
      label: '进行中',
      key: 'active',
      children: active,
    },
    {
      type: 'group',
      label: '已归档',
      key: 'archived',
      children: archived,
    },
  ]
})

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey)
    return
  event.preventDefault()
  void send()
}

const messageListRef = ref<HTMLElement | null>(null)
const pinnedToBottom = ref(true)

function handleMessageListScroll() {
  const el = messageListRef.value
  if (!el)
    return
  pinnedToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

async function scrollMessageListToBottom() {
  await nextTick()
  const el = messageListRef.value
  if (!el)
    return
  el.scrollTop = el.scrollHeight
}

watch(
  () => [
    messages.value.length,
    streamingDraft.value?.content,
    streamingDraft.value?.status,
    streamingDraft.value?.job?.status,
  ],
  () => {
    if (pinnedToBottom.value)
      void scrollMessageListToBottom()
  },
  { flush: 'post' },
)

watch(
  () => detail.value?.session?.id,
  () => {
    pinnedToBottom.value = true
    void scrollMessageListToBottom()
  },
  { flush: 'post' },
)
</script>

<template>
  <NCard class="ui-card chat-card" :bordered="false">
    <template #header>
      <div class="card-title">
        <NIcon><ChatbubblesOutline /></NIcon>
        AI 对话绘画
      </div>
    </template>

    <template #header-extra>
      <div class="chat-toolbar">
        <NSelect
          :value="detail?.session?.id ?? null"
          :options="sessionOptions"
          :loading="loading"
          placeholder="当前对话"
          class="session-select"
          @update:value="(id: number) => id && loadSession(id)"
        />
        <NButton size="small" secondary :loading="loading" @click="startNewConversation">
          开新对话
        </NButton>
        <NButton
          v-if="detail?.session?.id && !isCurrentArchived"
          size="small"
          secondary
          :disabled="loading || sending"
          @click="archiveCurrentSession"
        >
          归档
        </NButton>
        <NButton
          v-else-if="isCurrentArchived"
          size="small"
          secondary
          type="primary"
          :disabled="loading || sending"
          @click="unarchiveCurrentSession"
        >
          取消归档
        </NButton>
      </div>
    </template>

    <div class="chat-hints">
      <span v-if="isCurrentArchived" class="archive-hint">
        当前对话已归档，取消归档后才能继续发送。
      </span>
      <span v-if="sessionUsage && hasAiChatDrawUsage(sessionUsage)" class="usage-bar">
        本次对话消耗：{{ formatAiChatDrawUsage(sessionUsage) }}
      </span>
      <span class="cost-hint">
        按 Token 计费：<b>{{ pricingText }}</b>（不足按 1 积分计），管理员免费，同一用户 30 秒内只能发一次。
      </span>
    </div>

    <div ref="messageListRef" class="message-list" @scroll="handleMessageListScroll">
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
            <NSkeleton v-else-if="item.generationJob.status !== 'FAILED'" height="120px" />
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
      <div v-if="sending && streamingDraft" class="message assistant">
        <div class="bubble" :class="{ 'has-job': Boolean(streamingDraft.job) }">
          <div class="message-meta">
            <strong>绘画助手</strong>
            <NTag size="small" type="info">
              {{ streamingDraft.status || '正在输出…' }}
            </NTag>
          </div>
          <p v-if="streamingDraft.content" class="content">
            {{ streamingDraft.content }}
          </p>
          <NCollapse v-if="streamingDraft.reasoningContent" class="reasoning">
            <NCollapseItem title="查看思考链" name="reasoning">
              <pre>{{ streamingDraft.reasoningContent }}</pre>
            </NCollapseItem>
          </NCollapse>
          <div v-if="streamingDraft.job" class="job-card">
            <div class="job-meta">
              <NIcon><ImageOutline /></NIcon>
              <NTag :type="getAiGenerationStatusMeta(streamingDraft.job.status).type" size="small">
                {{ getAiGenerationStatusMeta(streamingDraft.job.status).label }}
              </NTag>
              <span>#{{ streamingDraft.job.id }}</span>
            </div>
            <NSkeleton height="120px" />
          </div>
          <p v-else-if="!streamingDraft.content" class="content">
            {{ streamingDraft.status || '正在思考并准备绘画…' }}
          </p>
        </div>
      </div>
    </div>

    <div class="composer">
      <NInput
        v-model:value="input"
        class="composer-input"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 5 }"
        placeholder="想画什么？直接说「生成一张猫娘」就会出图"
        :disabled="sending || isCurrentArchived"
        @keydown.enter="handleEnter"
      />
      <NButton class="composer-send" type="primary" :loading="sending" :disabled="!canSend" @click="send">
        <template #icon>
          <NIcon>
            <SparklesOutline v-if="sending" />
            <PaperPlaneOutline v-else />
          </NIcon>
        </template>
        {{ sendButtonText }}
      </NButton>
      <div class="composer-foot">
        <label class="nsfw-switch">
          <NSwitch v-model:value="nsfwMode" :disabled="isCurrentArchived || sending" />
          <span>成人向</span>
        </label>
        <small v-if="cooldownSeconds > 0">冷却中，{{ cooldownSeconds }} 秒后可再发</small>
      </div>
    </div>
    <Teleport defer to="#ai-chat-sidebar">
      <aside class="chat-side">
        <div class="chat-side-head">
          <span>历史聊天</span>
        </div>
        <div class="chat-side-list">
          <NEmpty v-if="!sessions.length && !archivedSessions.length" size="small" description="还没有对话" />
          <button
            v-for="item in sessions"
            :key="`active-${item.id}`"
            type="button"
            class="chat-side-item"
            :class="{ active: detail?.session?.id === item.id }"
            @click="loadSession(item.id)"
          >
            {{ item.title || `对话 #${item.id}` }}
          </button>
          <p v-if="archivedSessions.length" class="chat-side-group">
            已归档
          </p>
          <button
            v-for="item in archivedSessions"
            :key="`archived-${item.id}`"
            type="button"
            class="chat-side-item is-archived"
            :class="{ active: detail?.session?.id === item.id }"
            @click="loadSession(item.id)"
          >
            {{ item.title || `对话 #${item.id}` }}
          </button>
        </div>
      </aside>
    </Teleport>
  </NCard>
</template>

<style scoped>
/* 对话卡片吃满父容器高度：只有消息列表滚动，输入区常驻底部 */
.chat-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 对话卡片吃满对话区，只有消息列表滚动 */
.chat-card.ui-card :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 历史聊天栏由页面左侧通高容器承载（Teleport 过去） */
.chat-side {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding-right: 16px;
  border-right: 1px solid rgba(148, 163, 184, 0.2);
}

.chat-side-head {
  flex: 0 0 auto;
  padding-bottom: 8px;
  color: var(--ui-text);
  font-size: 13px;
  font-weight: 800;
}

.chat-side-list {
  display: grid;
  align-content: start;
  flex: 1 1 auto;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.chat-side-item {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  color: #475569;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-side-item:hover {
  border-color: rgba(245, 134, 169, 0.4);
  background: rgba(255, 255, 255, 0.86);
}

.chat-side-item.active {
  border-color: rgba(245, 134, 169, 0.55);
  background: var(--ui-primary-soft);
  color: var(--ui-primary-hover);
  font-weight: 700;
}

.chat-side-item.is-archived {
  color: #94a3b8;
}

.chat-side-group {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.chat-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.chat-toolbar .session-select {
  width: min(260px, 38vw);
  min-width: 150px;
}

.chat-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin-bottom: 0;
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
  line-height: 1.6;
}

.chat-hints .archive-hint {
  color: #d97706;
}

.archive-hint,
.usage-bar,
.cost-hint,
.turn-usage {
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
}

.message-list {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 0;
  padding: 4px 2px 12px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
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
  width: min(420px, 100%);
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
  width: min(280px, 100%);
  max-width: min(280px, 100%);
}

.job-image :deep(.n-image),
.job-image :deep(img) {
  display: block;
  max-width: min(280px, 100%) !important;
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
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: end;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.composer-send {
  grid-row: 1;
  grid-column: 2;
  height: 40px;
}

.composer-foot {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 22px;
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
}

.nsfw-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  /* 窄屏由顶部下拉切换会话，左侧历史栏由页面容器隐藏 */
  .chat-card.ui-card :deep(.n-card-header) {
    flex-wrap: wrap;
  }

  .chat-card.ui-card :deep(.n-card-header__main) {
    flex: 0 0 auto;
  }

  .chat-toolbar {
    justify-content: flex-start;
    width: 100%;
  }

  .chat-toolbar .session-select {
    flex: 1 1 140px;
    min-width: 0;
  }

  .composer {
    grid-template-columns: minmax(0, 1fr);
  }

  .composer-send {
    grid-row: auto;
    grid-column: 1;
    width: 100%;
  }
}
</style>
