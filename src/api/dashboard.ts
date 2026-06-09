// src/api/types/dashboard.ts

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
