import type { AiDeleteStatus, AiGenerationStatus, AiReviewStatus } from '@/api/aiGeneration'

export function getAiGenerationStatusMeta(status?: AiGenerationStatus | string | null) {
  switch (status) {
    case 'QUEUED':
      return { label: '排队中', type: 'info' as const }
    case 'CLAIMED':
      return { label: '已领取', type: 'info' as const }
    case 'RUNNING':
      return { label: '生成中', type: 'warning' as const }
    case 'UPLOADING':
      return { label: '上传OSS中', type: 'warning' as const }
    case 'COMPLETED':
      return { label: '已完成', type: 'success' as const }
    case 'FAILED':
      return { label: '失败', type: 'error' as const }
    default:
      return { label: status || '未知', type: 'default' as const }
  }
}

export function getAiReviewStatusMeta(status?: AiReviewStatus | string | null) {
  switch (status) {
    case 'NOT_SUBMITTED':
      return { label: '仅自己可见', type: 'default' as const }
    case 'WAITING':
      return { label: '待审核', type: 'warning' as const }
    case 'APPROVED':
      return { label: '已公开', type: 'success' as const }
    case 'REJECTED':
      return { label: '已拒绝', type: 'error' as const }
    case 'UNPUBLISHED':
      return { label: '已下架', type: 'default' as const }
    default:
      return { label: status || '未知', type: 'default' as const }
  }
}

export function getAiDeleteStatusMeta(status?: AiDeleteStatus | string | null) {
  switch (status) {
    case 'WAITING':
      return { label: '删除审核中', type: 'warning' as const }
    case 'APPROVED':
      return { label: '已删除', type: 'error' as const }
    case 'REJECTED':
      return { label: '删除被拒绝', type: 'default' as const }
    case 'NONE':
    case undefined:
    case null:
    case '':
      return { label: '未申请删除', type: 'default' as const }
    default:
      return { label: status || '未知', type: 'default' as const }
  }
}

export const AI_DELETE_STATUS_OPTIONS = [
  { label: '全部删除申请', value: 'ALL' },
  { label: '待审核', value: 'WAITING' },
  { label: '已删除', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
]

export function getAiCategoryLabel(category?: string | null) {
  if (category === 'R18')
    return 'R18'
  if (category === 'GENERAL')
    return '全年龄'
  return '未分类'
}

export const AI_GENERATION_STATUS_OPTIONS = [
  { label: '全部状态', value: 'ALL' },
  { label: '排队中', value: 'QUEUED' },
  { label: '已领取', value: 'CLAIMED' },
  { label: '生成中', value: 'RUNNING' },
  { label: '上传OSS中', value: 'UPLOADING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '失败', value: 'FAILED' },
]

export const AI_REVIEW_STATUS_OPTIONS = [
  { label: '全部审核', value: 'ALL' },
  { label: '待审核', value: 'WAITING' },
  { label: '已公开', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已下架', value: 'UNPUBLISHED' },
]

export const AI_CATEGORY_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '全年龄', value: 'GENERAL' },
  { label: 'R18', value: 'R18' },
]

export { formatFileSize } from './format'
