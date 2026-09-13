import http from '@/api/http'

export const CLOUD_VIDEO_PROGRESS_SAVE_INTERVAL_MS = 10_000

export function shouldSaveCloudVideoProgress(params: {
  allowSave: boolean
  lastSavedAt: number
  now?: number
  force?: boolean
}) {
  if (!params.allowSave)
    return false
  if (params.force)
    return true
  return (params.now ?? Date.now()) - params.lastSavedAt >= CLOUD_VIDEO_PROGRESS_SAVE_INTERVAL_MS
}
