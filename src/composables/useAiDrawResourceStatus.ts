import type { AiServiceStatusResponse } from '@/api/aiGeneration'

export function formatAiDrawWaitSeconds(seconds: number) {
  if (!seconds)
    return '较短'
  if (seconds < 60)
    return `${seconds} 秒`
  return `${Math.ceil(seconds / 60)} 分钟`
}

export function getAiDrawServiceReady(status: AiServiceStatusResponse | null) {
  if (!status)
    return true
  return status.online
}

export function getAiDrawQueueStatusText(status: AiServiceStatusResponse | null) {
  if (!status)
    return '队列状态检测中'
  const queued = status.queuedCount || 0
  const running = (status.claimedCount || 0) + (status.runningCount || 0) + (status.uploadingCount || 0)
  const wait = formatAiDrawWaitSeconds(status.estimatedWaitSeconds || 0)
  return `排队 ${queued} 个，处理中 ${running} 个，预计等待 ${wait}`
}

export function getAiDrawServiceStatusType(status: AiServiceStatusResponse | null) {
  if (!status)
    return 'info'
  return getAiDrawServiceReady(status) ? 'success' : 'error'
}

export function getAiDrawServiceStatusLabel(status: AiServiceStatusResponse | null, loading: boolean) {
  if (!status)
    return loading ? '服务检测中' : '状态未知'
  return getAiDrawServiceReady(status) ? 'AI服务在线' : 'AI服务离线'
}

export function getAiDrawServiceStatusMessage(status: AiServiceStatusResponse | null) {
  if (!status)
    return '正在检测本机 Worker 在线状态。'
  if (status.online)
    return 'AI绘画正式版已开放，不再限制使用时间，机器在线即可生成。'
  return '当前没有在线 Worker，机器上线后即可生成。'
}
