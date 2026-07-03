import type { ImageAuditListDTO, ImageAuditListStats, ImageAuditScope, ImageAvailabilityStatus } from '@/api/admin'

export const IMAGE_AUDIT_DESKTOP_PAGE_SIZE = 20
export const IMAGE_AUDIT_MOBILE_PAGE_SIZE = 5
export const IMAGE_AUDIT_DEFAULT_STALE_DAYS = 30

export const IMAGE_AUDIT_SCOPE_OPTIONS: Array<{ label: string, value: ImageAuditScope }> = [
  { label: '未审核', value: 'UNREVIEWED' },
  { label: '到期复审', value: 'DUE_REVIEW' },
  { label: '全部图库', value: 'ALL' },
]

export const IMAGE_AVAILABILITY_OPTIONS: Array<{ label: string, value: ImageAvailabilityStatus | '' }> = [
  { label: '全部可用性', value: '' },
  { label: '未知', value: 'UNKNOWN' },
  { label: '正常', value: 'OK' },
  { label: '疑似失效', value: 'SUSPECTED_BROKEN' },
  { label: '已失效', value: 'BROKEN' },
]

export const IMAGE_AVAILABILITY_STATUS_META: Record<
  ImageAvailabilityStatus,
  { label: string, type: 'default' | 'success' | 'warning' | 'error' }
> = {
  UNKNOWN: { label: '未知', type: 'default' },
  OK: { label: '正常', type: 'success' },
  SUSPECTED_BROKEN: { label: '疑似失效', type: 'warning' },
  BROKEN: { label: '已失效', type: 'error' },
}

export function normalizeImageAuditFilterNumber(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return undefined
  return Math.trunc(value)
}

export function getImageAuditScopeStatKey(value: ImageAuditScope): keyof ImageAuditListStats {
  if (value === 'DUE_REVIEW')
    return 'dueReview'
  if (value === 'ALL')
    return 'all'
  return 'unreviewed'
}

export function getImageAuditScopeLabel(value: ImageAuditScope) {
  return IMAGE_AUDIT_SCOPE_OPTIONS.find(option => option.value === value)?.label || value
}

export function getImageAuditScopeOptionLabel(value: ImageAuditScope, stats?: ImageAuditListStats | null) {
  const label = getImageAuditScopeLabel(value)
  const count = stats?.[getImageAuditScopeStatKey(value)]
  return typeof count === 'number' ? `${label} (${count})` : label
}

export function parseImageAuditTime(value: string | null | undefined) {
  if (!value)
    return 0
  const timestamp = Date.parse(value.includes(' ') ? value.replace(' ', 'T') : value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function getCurrentImageAuditTime() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function getImageAvailabilityMeta(status?: ImageAvailabilityStatus | null) {
  return IMAGE_AVAILABILITY_STATUS_META[status || 'UNKNOWN']
}

export function getImageAvailabilityDetail(row: ImageAuditListDTO) {
  const parts: string[] = []
  if (row.lastAvailabilityHttpStatus)
    parts.push(`HTTP ${row.lastAvailabilityHttpStatus}`)
  if (row.availabilityFailCount)
    parts.push(`失败 ${row.availabilityFailCount} 次`)
  if (row.lastAvailabilityError)
    parts.push(row.lastAvailabilityError)
  return parts.join(' · ')
}

export function getImageAuditBatchFailureText(results: Array<{ imageId: number, success: boolean, message?: string, code?: string }>) {
  const firstFailure = results.find(item => !item.success)
  if (!firstFailure)
    return ''
  return firstFailure.message || firstFailure.code || `图片 #${firstFailure.imageId} 处理失败`
}
