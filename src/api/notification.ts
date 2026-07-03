import http from '@/api/http'

export type UserNotificationType
  = | 'GALLERY_SUBMISSION_APPROVED'
    | 'GALLERY_SUBMISSION_REJECTED'
    | 'IMAGE_DELETE_REQUEST_APPROVED'
    | 'IMAGE_DELETE_REQUEST_REJECTED'
    | 'IMAGE_AUDIT_PROBLEM_CREATED_DELETE_REQUEST'
    | 'AI_GENERATION_COMPLETED'

export interface UserNotification {
  id: number
  type: UserNotificationType | string
  title: string
  content: string
  targetType?: string | null
  targetId?: string | number | null
  read: boolean
  readAt?: string | null
  createdAt: string
}

export interface UserNotificationPage {
  total: number
  page: number
  pageSize: number
  list: UserNotification[]
}

export interface NotificationQuery {
  page?: number
  pageSize?: number
  unreadOnly?: boolean
}

export type UnreadNotificationCountData = number | { count?: number }

export function fetchNotifications(params: NotificationQuery) {
  return http.get<UserNotificationPage>('/notifications', {
    params,
  })
}

export function fetchUnreadNotificationCount() {
  return http.get<UnreadNotificationCountData>('/notifications/unread-count')
}

export function normalizeUnreadNotificationCount(value: unknown) {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : 0

  if (!value || typeof value !== 'object')
    return 0

  const payload = value as { count?: unknown }
  return typeof payload.count === 'number' && Number.isFinite(payload.count)
    ? payload.count
    : 0
}

export function markNotificationRead(id: number) {
  return http.post<string>(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return http.post<string>('/notifications/read-all')
}
