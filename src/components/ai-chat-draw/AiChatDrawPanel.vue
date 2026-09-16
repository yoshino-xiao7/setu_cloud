<script setup lang="ts">
import type { ComputedRef } from 'vue'
import {
  AddOutline,
  ArchiveOutline,
  ArrowUndoOutline,
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
  NPopover,
  NSelect,
  NSkeleton,
  NSwitch,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { computed, nextTick, ref, watch } from 'vue'
import { formatAiChatDrawUsage, hasAiChatDrawUsage } from '@/composables/ai-chat-draw/aiChatDrawUsage'
import { useAiChatDrawPage } from '@/composables/ai-chat-draw/useAiChatDrawPage'
import { AI_DRAW_COST_PER_IMAGE } from '@/composables/useAiDrawDefaults'
import { getAiGenerationStatusMeta } from '@/utils/aiGenerationStatus'

const props = defineProps<{
  isAdmin: boolean
  loadPoints: () => Promise<void>
}>()

const message = useMessage()
const showExtras = ref(false)
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
  archiveSession,
  unarchiveSession,
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
      <NSelect
        class="chat-session-select"
        :value="detail?.session?.id ?? null"
        :options="sessionOptions"
        :loading="loading"
        size="small"
        placeholder="当前对话"
        @update:value="(id: number) => id && loadSession(id)"
      />
    </template>

    <div ref="messageListRef" class="message-list" @scroll="handleMessageListScroll">
      <NEmpty v-if="!messages.length && !sending" description="直接说想画什么，例如：生成一张猫娘" />
      <div v-for="item in messages" :key="item.id" class="message" :class="item.role">
        <div class="bubble" :class="{ 'has-job': Boolean(item.generationJob) }">
          <div
            v-if="item.role === 'user' && !item.adminFree && (item.pointsRefunded || item.pointsCost)"
            class="message-meta"
          >
            <NTag v-if="item.pointsRefunded" size="small" type="warning">
              已退回积分
            </NTag>
            <NTag v-else size="small">
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
              <NTag v-if="item.generationJob.pointsRefunded" size="small" type="warning">
                已退回积分
              </NTag>
              <NTag v-else-if="item.generationJob.pointsCost && !item.generationJob.adminFree" size="small">
                出图 {{ item.generationJob.pointsCost }} 积分
              </NTag>
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
      <div v-if="sessionUsage && hasAiChatDrawUsage(sessionUsage)" class="chat-usage-line">
        本次对话消耗：{{ formatAiChatDrawUsage(sessionUsage) }}
      </div>
    </div>

    <div class="composer">
      <NPopover v-model:show="showExtras" trigger="click" placement="top-start" :show-arrow="false" raw>
        <template #trigger>
          <button
            class="composer-plus"
            type="button"
            title="拓展功能"
            :class="{ 'is-open': showExtras }"
          >
            <NIcon size="16">
              <AddOutline />
            </NIcon>
          </button>
        </template>
        <div class="extras-panel">
          <div class="extras-row">
            <div class="extras-text">
              <strong>成人向</strong>
              <small>开启后按成人向规则生成</small>
            </div>
            <NSwitch v-model:value="nsfwMode" :disabled="isCurrentArchived || sending" />
          </div>
          <p class="extras-hint">
            Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </NPopover>

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
      <div class="composer-foot" :class="{ 'has-note': cooldownSeconds > 0 }">
        <small v-if="cooldownSeconds > 0">冷却中，{{ cooldownSeconds }} 秒后可再发</small>
      </div>
    </div>
    <Teleport defer to="#ai-chat-history">
      <div class="chat-side">
        <div class="chat-side-head">
          <span>历史聊天</span>
          <button class="chat-side-add" type="button" title="开新对话" :disabled="loading" @click="startNewConversation">
            <NIcon size="16">
              <AddOutline />
            </NIcon>
          </button>
        </div>
        <div class="chat-side-list">
          <NEmpty v-if="!sessions.length && !archivedSessions.length" size="small" description="还没有对话" />
          <div
            v-for="item in sessions"
            :key="`active-${item.id}`"
            class="chat-side-item"
            :class="{ active: detail?.session?.id === item.id }"
          >
            <button class="chat-side-main" type="button" @click="loadSession(item.id)">
              {{ item.title || `对话 #${item.id}` }}
            </button>
            <button
              class="chat-side-act"
              type="button"
              title="归档"
              :disabled="loading || sending"
              @click="archiveSession(item.id)"
            >
              <NIcon size="14">
                <ArchiveOutline />
              </NIcon>
            </button>
          </div>
          <p v-if="archivedSessions.length" class="chat-side-group">
            已归档
          </p>
          <div
            v-for="item in archivedSessions"
            :key="`archived-${item.id}`"
            class="chat-side-item is-archived"
            :class="{ active: detail?.session?.id === item.id }"
          >
            <button class="chat-side-main" type="button" @click="loadSession(item.id)">
              {{ item.title || `对话 #${item.id}` }}
            </button>
            <button
              class="chat-side-act"
              type="button"
              title="取消归档"
              :disabled="loading || sending"
              @click="unarchiveSession(item.id)"
            >
              <NIcon size="14">
                <ArrowUndoOutline />
              </NIcon>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport defer to="#ai-chat-pricing">
      <NTooltip trigger="hover" placement="bottom-start">
        <template #trigger>
          <span class="chat-pricing-chip">计费</span>
        </template>
        按 Token 计费：{{ pricingText }}（不足按 1 积分计），每张出图另扣 {{ AI_DRAW_COST_PER_IMAGE }} 积分
      </NTooltip>
    </Teleport>

    <Teleport defer to="#ai-chat-foot">
      <p v-if="isCurrentArchived" class="chat-foot-line is-warning">
        当前对话已归档，取消归档后才能继续发送。
      </p>
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

/* 对话卡片吃满对话区，只有消息列表滚动；输入区贴到卡片底部 */
.chat-card.ui-card :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 0;
  overflow: hidden;
}

/* 历史聊天：Teleport 进页面左侧栏，列表内部滚动 */
.chat-side {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chat-side-head {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  color: var(--ui-text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
}

.chat-side-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ui-text-soft);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.chat-side-add:hover {
  background: var(--ui-primary-soft);
  color: var(--ui-primary-hover);
}

.chat-side-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  flex: 1 1 auto;
  gap: 2px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

/* 窄栏里不显示滚动条，滚动仍然可用 */
.chat-side-list::-webkit-scrollbar {
  display: none;
}

/* 用量说明跟在对话最后一行，不固定悬浮 */
.chat-usage-line {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed rgba(148, 163, 184, 0.28);
  color: var(--ui-text-soft);
  font-size: 11px;
  line-height: 1.55;
  text-align: center;
}

.chat-side-item {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  border-radius: 9px;
  transition: background 0.18s ease, color 0.18s ease;
}

.chat-side-item:hover {
  background: rgba(255, 255, 255, 0.72);
}

.chat-side-item.active {
  background: var(--ui-primary-soft);
}

.chat-side-item.is-archived {
  color: var(--ui-text-soft);
}

.chat-side-main {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 4px 8px 10px;
  overflow: hidden;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-side-item.active .chat-side-main {
  color: var(--ui-primary-hover);
  font-weight: 700;
}

.chat-side-act {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 6px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: #b6c0cd;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.chat-side-act:hover {
  background: rgba(245, 134, 169, 0.18);
  color: var(--ui-primary-hover);
}

.chat-side-item.active .chat-side-act {
  color: var(--ui-primary);
}

.chat-side-group {
  margin: 10px 0 2px;
  padding-left: 4px;
  color: var(--ui-text-soft);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.6px;
}

/* 会话下拉只在移动端用（桌面端左栏就是会话列表） */
.chat-session-select {
  width: 100%;
}

.chat-foot-line {
  margin: 0;
  color: var(--ui-text-soft);
  font-size: 11px;
  line-height: 1.55;
}

/* 「计费」占位文案，悬停才看规则 */
.chat-pricing-chip {
  border-bottom: 1px dashed rgba(148, 163, 184, 0.7);
  color: var(--ui-text-soft);
  cursor: help;
  font-size: 11px;
}

.chat-foot-line.is-warning {
  color: #d97706;
}

.turn-usage {
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
}

@media (min-width: 981px) {
  .chat-card.ui-card :deep(.n-card-header) {
    display: none;
  }
}

.message-list {
  display: grid;
  align-content: start;
  flex: 1 1 auto;
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
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: end;
  padding: 14px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

/* 拓展功能入口 */
.composer-plus {
  display: inline-flex;
  grid-row: 1;
  grid-column: 1;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  color: #64748b;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.composer-plus:hover {
  border-color: rgba(245, 134, 169, 0.6);
  color: var(--ui-primary-hover);
}

.composer-plus.is-open {
  border-color: rgba(245, 134, 169, 0.7);
  background: var(--ui-primary-soft);
  color: var(--ui-primary-hover);
  transform: rotate(45deg);
}

.extras-panel {
  display: grid;
  gap: 10px;
  width: 240px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 244, 249, 0.92));
  box-shadow: 0 18px 40px rgba(31, 41, 55, 0.14);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.extras-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.extras-text {
  display: grid;
  gap: 2px;
}

.extras-text strong {
  color: var(--ui-text);
  font-size: 13px;
}

.extras-text small,
.extras-hint {
  color: var(--ui-text-soft);
  font-size: 11px;
  line-height: 1.5;
}

.extras-hint {
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--ui-border-subtle);
}

.composer-send {
  grid-row: 1;
  grid-column: 3;
  height: 40px;
}

.composer-foot {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 0;
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
}

/* 没有提示内容时不占那一行，输入框直接贴底 */
.composer-foot:not(.has-note) {
  display: none;
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
    grid-template-columns: auto minmax(0, 1fr);
  }

  .composer-plus {
    grid-row: 1;
    grid-column: 1;
  }

  .composer-input {
    grid-row: 1;
    grid-column: 2;
  }

  .composer-send {
    grid-row: 2;
    grid-column: 1 / -1;
    width: 100%;
  }

  .composer-foot {
    grid-row: 3;
  }
}
</style>
