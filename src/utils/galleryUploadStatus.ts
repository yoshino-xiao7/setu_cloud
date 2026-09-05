import type { TagProps } from 'naive-ui'
import type { GalleryPidMode, GalleryUploadStatus } from '@/api/galleryUpload'
import type { LocalUploadStatus } from '@/types/galleryUploadLocal'

export const GALLERY_UPLOAD_STATUS_OPTIONS: Array<{ label: string, value: GalleryUploadStatus }> = [
  { label: '全部状态', value: 'ALL' },
  { label: '上传中', value: 'UPLOADING' },
  { label: '等待人工审核', value: 'WAITING_MANUAL_REVIEW' },
  { label: '审核通过', value: 'APPROVED' },
  { label: '发布中', value: 'PUBLISHING' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '审核不通过', value: 'REJECTED' },
  { label: '清理失败', value: 'REJECT_DELETE_FAILED' },
  { label: '已取消', value: 'CANCELED' },
  { label: '发布失败', value: 'PUBLISH_FAILED' },
  { label: '已过期', value: 'EXPIRED' },
]

export const GALLERY_PID_MODE_OPTIONS: Array<{ label: string, value: GalleryPidMode }> = [
  { label: '不同 PID 多图', value: 'MULTI_PID_P0' },
  { label: '同一 PID 多页', value: 'SINGLE_PID_MULTI_PAGE' },
]

const STATUS_META: Record<GalleryUploadStatus, { label: string, type: NonNullable<TagProps['type']> }> = {
  ALL: { label: '全部状态', type: 'default' },
  UPLOADING: { label: '上传中', type: 'info' },
  WAITING_MANUAL_REVIEW: { label: '等待人工审核', type: 'warning' },
  APPROVED: { label: '审核通过', type: 'success' },
  PUBLISHING: { label: '发布中', type: 'info' },
  PUBLISHED: { label: '已发布', type: 'success' },
  REJECTED: { label: '审核不通过', type: 'error' },
  REJECT_DELETE_FAILED: { label: '清理失败', type: 'error' },
  CANCELED: { label: '已取消', type: 'default' },
  PUBLISH_FAILED: { label: '发布失败', type: 'error' },
  EXPIRED: { label: '已过期', type: 'error' },
}

export function getGalleryUploadStatusMeta(status?: GalleryUploadStatus | string | null) {
  return STATUS_META[(status || 'ALL') as GalleryUploadStatus] || {
    label: status || '未知状态',
    type: 'default' as const,
  }
}

export function getGalleryPidModeLabel(pidMode?: GalleryPidMode | string | null) {
  if (pidMode === 'SINGLE_PID_MULTI_PAGE')
    return '同一 PID 多页'
  if (pidMode === 'MULTI_PID_P0')
    return '不同 PID 多图'
  return '未知模式'
}

export function parseTagsInput(value: string) {
  return value
    .split(/[,，\n]/)
    .map(tag => tag.trim())
    .filter(Boolean)
}

export { formatFileSize } from './format'

export function getLocalUploadStatusText(status: LocalUploadStatus) {
  if (status === 'hashing')
    return '计算 SHA-256'
  if (status === 'uploading')
    return '上传 OSS'
  if (status === 'finished')
    return '已上传'
  if (status === 'error')
    return '失败'
  return '待上传'
}

export function getPublicImageLabel(item: { publicPid?: number | null, publicP?: number | null }) {
  if (item.publicPid === null || item.publicPid === undefined)
    return '-'
  return `${item.publicPid}_p${item.publicP ?? 0}`
}
