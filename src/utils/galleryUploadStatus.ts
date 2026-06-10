import type { TagProps } from 'naive-ui'
import type { GalleryPidMode, GalleryUploadStatus } from '@/api/galleryUpload'

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

export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0)
    return '-'
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
