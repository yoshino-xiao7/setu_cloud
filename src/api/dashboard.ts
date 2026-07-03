import http from '@/api/http'

export interface UsageLogItem {
  id: number
  timestamp: string
  endpoint: string
  status: number
  ip: string
}

export interface OverviewData {
  totalCalls: number
  todayCalls: number
  lastCalledAt: string | null
}

export interface KeyState {
  count: number
  limit: number
  loading: boolean
}

export interface UsageLogsQuery {
  page: number
  limit: number
}

export interface UsageLogsPayload {
  count?: number
  data?: UsageLogItem[]
  items?: UsageLogItem[]
  list?: UsageLogItem[]
  total?: number
}

export function fetchUsageOverview() {
  return http.get<Partial<OverviewData>>('/usage/overview')
}

export function fetchUsageLogs(params: UsageLogsQuery) {
  return http.get('/usage/logs', { params })
}

export function normalizeUsageLogsResponse(raw: UsageLogItem[] | UsageLogsPayload) {
  if (Array.isArray(raw)) {
    return {
      list: raw,
      total: raw.length,
    }
  }

  if (raw.data && Array.isArray(raw.data)) {
    return {
      list: raw.data,
      total: raw.total || raw.count || 0,
    }
  }

  if (raw.items && Array.isArray(raw.items)) {
    return {
      list: raw.items,
      total: raw.total || raw.count || 0,
    }
  }

  if (raw.list && Array.isArray(raw.list)) {
    return {
      list: raw.list,
      total: raw.total || 0,
    }
  }

  return {
    list: [] as UsageLogItem[],
    total: 0,
  }
}
