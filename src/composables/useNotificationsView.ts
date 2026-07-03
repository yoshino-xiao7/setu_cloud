import type { UserNotification } from '@/api/notification'
import { useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeUnreadNotificationCount,
} from '@/api/notification'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const pageSize = 20

const typeMeta: Record<string, { label: string, type: 'success' | 'error' | 'warning' | 'info' }> = {
  GALLERY_SUBMISSION_APPROVED: { label: '投稿通过', type: 'success' },
  GALLERY_SUBMISSION_REJECTED: { label: '投稿拒绝', type: 'error' },
  IMAGE_DELETE_REQUEST_APPROVED: { label: '删除申请通过', type: 'success' },
  IMAGE_DELETE_REQUEST_REJECTED: { label: '删除申请拒绝', type: 'warning' },
  IMAGE_AUDIT_PROBLEM_CREATED_DELETE_REQUEST: { label: '审核问题', type: 'warning' },
  ADMIN_POINTS_GRANTED: { label: '积分到账', type: 'success' },
  AI_GENERATION_COMPLETED: { label: 'AI 绘图完成', type: 'success' },
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

function normalizeTargetId(targetId: UserNotification['targetId']) {
  const id = Number(targetId)
  return Number.isInteger(id) && id > 0 ? id : null
}

function inferTargetKind(item: UserNotification) {
  const targetType = String(item.targetType || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  const compactTargetType = targetType.replace(/[^A-Z0-9]/g, '')
  if (galleryTargetTypes.has(targetType))
    return 'gallery'
  if (deleteRequestTargetTypes.has(targetType))
    return 'delete-request'
  if (targetType === 'AI_GENERATION' || item.type === 'AI_GENERATION_COMPLETED')
    return 'ai-generation'
  if (compactTargetType.includes('GALLERY') && (compactTargetType.includes('BATCH') || compactTargetType.includes('SUBMISSION')))
    return 'gallery'
  if (compactTargetType.includes('DELETE') && compactTargetType.includes('REQUEST'))
    return 'delete-request'
  if (item.type.startsWith('GALLERY_SUBMISSION_'))
    return 'gallery'
  if (item.type.startsWith('IMAGE_DELETE_REQUEST_'))
    return 'delete-request'
  if (item.type === 'IMAGE_AUDIT_PROBLEM_CREATED_DELETE_REQUEST')
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
  if (targetKind === 'ai-generation') {
    return {
      name: 'AiHistory',
      query: { jobId: String(targetId) },
    }
  }

  return null
}

export function useNotificationsView() {
  const message = useMessage()
  const router = useRouter()
  const loading = ref(false)
  const actionLoading = ref(false)
  const list = ref<UserNotification[]>([])
  const total = ref(0)
  const page = ref(1)
  const unreadOnly = ref(false)
  const unreadCount = ref(0)

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  async function loadUnreadCount() {
    try {
      const data = unwrapApiData(await fetchUnreadNotificationCount(), 0)
      unreadCount.value = normalizeUnreadNotificationCount(data)
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
        showApiError(message, error, '加载通知失败')
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
        showApiError(message, error, '标记已读失败')
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
        showApiError(message, error, '操作失败')
    }
    finally {
      actionLoading.value = false
    }
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

  return {
    actionLoading,
    getTargetText,
    getTypeMeta,
    handleNotificationClick,
    handleUnreadSwitch,
    list,
    loadNotifications,
    loading,
    markAllRead,
    page,
    pageCount,
    pageSize,
    total,
    unreadCount,
    unreadOnly,
  }
}
