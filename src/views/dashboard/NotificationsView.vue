<script setup lang="ts">
import type { UserNotification } from '@/api/notification'
import {
  CheckmarkDoneOutline,
  MailOpenOutline,
  NotificationsOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import {
  NBadge,
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NPagination,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notification'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const router = useRouter()
const loading = ref(false)
const actionLoading = ref(false)
const list = ref<UserNotification[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const unreadOnly = ref(false)
const unreadCount = ref(0)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const typeMeta: Record<string, { label: string, type: 'success' | 'error' | 'warning' | 'info' }> = {
  GALLERY_SUBMISSION_APPROVED: { label: '投稿通过', type: 'success' },
  GALLERY_SUBMISSION_REJECTED: { label: '投稿拒绝', type: 'error' },
  IMAGE_DELETE_REQUEST_APPROVED: { label: '删除申请通过', type: 'success' },
  IMAGE_DELETE_REQUEST_REJECTED: { label: '删除申请拒绝', type: 'warning' },
  IMAGE_AUDIT_PROBLEM_CREATED_DELETE_REQUEST: { label: '审核问题', type: 'warning' },
}

const galleryTargetTypes = new Set([
  'BATCH',
  'GALLERY_BATCH',
  'GALLERY_UPLOAD_BATCH',
  'GALLERY_SUBMISSION',
  'GALLERY_SUBMISSION_BATCH',
])

const deleteRequestTargetTypes = new Set([
  'DELETE_REQUEST',
  'IMAGE_DELETE',
  'IMAGE_DELETE_REQUEST',
])

async function loadUnreadCount() {
  try {
    const data = unwrapApiData(await fetchUnreadNotificationCount(), 0)
    unreadCount.value = typeof data === 'number' ? data : data.count || 0
  }
  catch {}
}

async function loadNotifications() {
  loading.value = true
  try {
    const data = unwrapApiData(await fetchNotifications({
      page: page.value,
      pageSize,
      unreadOnly: unreadOnly.value,
    }), {
      total: 0,
      page: page.value,
      pageSize,
      list: [],
    })
    list.value = data.list || []
    total.value = data.total || 0
    page.value = data.page || page.value
    await loadUnreadCount()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '加载通知失败'))
  }
  finally {
    loading.value = false
  }
}

function handleUnreadSwitch() {
  page.value = 1
  void loadNotifications()
}

async function markRead(item: UserNotification) {
  if (item.read)
    return

  try {
    await markNotificationRead(item.id)
    item.read = true
    item.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    if (unreadOnly.value)
      list.value = list.value.filter(entry => entry.id !== item.id)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '标记已读失败'))
  }
}

async function markAllRead() {
  if (unreadCount.value === 0)
    return

  actionLoading.value = true
  try {
    await markAllNotificationsRead()
    list.value = unreadOnly.value
      ? []
      : list.value.map(item => ({ ...item, read: true, readAt: item.readAt || new Date().toISOString() }))
    unreadCount.value = 0
    message.success('已全部标记为已读')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '操作失败'))
  }
  finally {
    actionLoading.value = false
  }
}

function normalizeTargetId(targetId: UserNotification['targetId']) {
  const id = Number(targetId)
  return Number.isInteger(id) && id > 0 ? id : null
}

function inferTargetKind(item: UserNotification) {
  const targetType = String(item.targetType || '').trim().toUpperCase()
  if (galleryTargetTypes.has(targetType))
    return 'gallery'
  if (deleteRequestTargetTypes.has(targetType))
    return 'delete-request'
  if (!targetType && item.type.startsWith('GALLERY_SUBMISSION_'))
    return 'gallery'
  if (!targetType && item.type.startsWith('IMAGE_DELETE_REQUEST_'))
    return 'delete-request'
  if (!targetType && item.type === 'IMAGE_AUDIT_PROBLEM_CREATED_DELETE_REQUEST')
    return 'delete-request'
  return null
}

function getNotificationTargetRoute(item: UserNotification) {
  const targetId = normalizeTargetId(item.targetId)
  if (!targetId)
    return null

  const targetKind = inferTargetKind(item)
  if (targetKind === 'gallery') {
    return {
      name: 'GalleryUpload',
      query: { batchId: String(targetId) },
    }
  }
  if (targetKind === 'delete-request') {
    return {
      name: 'MyDeleteRequests',
      query: { requestId: String(targetId) },
    }
  }

  return null
}

async function handleNotificationClick(item: UserNotification) {
  const targetRoute = getNotificationTargetRoute(item)
  if (!targetRoute) {
    await markRead(item)
    return
  }

  void markRead(item)
  await router.push(targetRoute)
}

function getTypeMeta(type: string) {
  return typeMeta[type] || { label: type, type: 'info' as const }
}

function getTargetText(item: UserNotification) {
  if (!item.targetType && !item.targetId)
    return ''
  return `${item.targetType || '目标'} #${item.targetId || '-'}`
}

onMounted(() => {
  void loadNotifications()
})
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <div>
        <h1>
          <NIcon size="28" color="#f586a9">
            <NotificationsOutline />
          </NIcon>
          通知中心
          <NBadge v-if="unreadCount > 0" :value="unreadCount" type="warning" />
        </h1>
        <p>查看投稿审核、删除申请和图片审核相关通知</p>
      </div>
      <NButton secondary :loading="loading" @click="loadNotifications">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard :bordered="false" class="toolbar-card">
      <div class="toolbar">
        <NSpace align="center">
          <span>只看未读</span>
          <NSwitch v-model:value="unreadOnly" @update:value="handleUnreadSwitch" />
        </NSpace>
        <NButton
          type="primary"
          secondary
          :loading="actionLoading"
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          <template #icon>
            <NIcon><CheckmarkDoneOutline /></NIcon>
          </template>
          全部已读
        </NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="list-card">
      <NSpin :show="loading">
        <div v-if="list.length > 0" class="notification-list">
          <button
            v-for="item in list"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.read }"
            type="button"
            @click="handleNotificationClick(item)"
          >
            <div class="notification-icon">
              <NIcon size="22">
                <MailOpenOutline />
              </NIcon>
            </div>
            <div class="notification-body">
              <div class="notification-head">
                <div class="notification-title">
                  {{ item.title }}
                </div>
                <NTag :type="getTypeMeta(item.type).type" size="small" bordered>
                  {{ getTypeMeta(item.type).label }}
                </NTag>
              </div>
              <p>{{ item.content }}</p>
              <div class="notification-meta">
                <span>{{ formatDate(item.createdAt) }}</span>
                <span v-if="getTargetText(item)">{{ getTargetText(item) }}</span>
                <span>{{ item.read ? '已读' : '未读' }}</span>
              </div>
            </div>
          </button>
        </div>
        <div v-else class="empty-box">
          <NEmpty description="暂无通知" />
        </div>
      </NSpin>

      <div v-if="total > pageSize" class="pagination-wrap">
        <NPagination
          v-model:page="page"
          :page-count="pageCount"
          @update:page="loadNotifications"
        />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.notifications-page {
  max-width: 980px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  color: #263247;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.toolbar-card,
.list-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.toolbar-card {
  margin-bottom: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notification-list {
  display: grid;
  gap: 10px;
}

.notification-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 14px;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
  cursor: pointer;
}

.notification-item.unread {
  border-color: rgba(245, 134, 169, 0.36);
  background: rgba(255, 247, 251, 0.86);
}

.notification-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  color: #f26d99;
  background: rgba(245, 134, 169, 0.14);
}

.notification-body {
  min-width: 0;
}

.notification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.notification-title {
  min-width: 0;
  font-weight: 700;
  color: #263247;
  overflow-wrap: anywhere;
}

.notification-body p {
  margin: 8px 0;
  color: #475569;
  line-height: 1.6;
}

.notification-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #94a3b8;
  font-size: 12px;
}

.empty-box {
  display: grid;
  min-height: 260px;
  place-items: center;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .page-header,
  .toolbar,
  .notification-head {
    align-items: stretch;
    flex-direction: column;
  }

  .notification-item {
    grid-template-columns: 1fr;
  }
}
</style>
