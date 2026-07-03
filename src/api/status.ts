import http from '@/api/http'

export interface StatusData {
  status: string
  availability: number | null
  avgLatencyMs: number | null
  callsToday: number
}

export interface ServiceHealthData {
  status: string
  healthy: boolean
  code: string
  checkedAt: string
}

export interface StatusOverviewData {
  status: StatusData
  health: ServiceHealthData | null
}

export type ImageCountData = number | { count?: number }

export interface FetchImageCountOptions {
  cacheBust?: boolean
}

export function fetchImageCount(options?: FetchImageCountOptions) {
  return http.get<ImageCountData>('/status/image-count', {
    params: options?.cacheBust ? { t: Date.now() } : undefined,
  })
}

export function normalizeImageCount(value: unknown) {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : 0

  if (!value || typeof value !== 'object')
    return 0

  const payload = value as { count?: unknown, data?: unknown }
  if (typeof payload.count === 'number')
    return Number.isFinite(payload.count) ? payload.count : 0

  if (typeof payload.data === 'number')
    return Number.isFinite(payload.data) ? payload.data : 0

  return 0
}

export function fetchStatusOverview() {
  return http.get<StatusOverviewData>('/status/overview')
}
