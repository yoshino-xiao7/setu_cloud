import http from '@/api/http'

export type OperationLogStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL'

export interface OperationLogQuery {
  page?: number
  pageSize?: number
  traceId?: string
  userId?: number
  userEmail?: string
  eventType?: string
  status?: OperationLogStatus
  code?: string
  targetType?: string
  targetId?: string
  startTime?: string
  endTime?: string
}

export interface OperationLogItem {
  id: number
  traceId?: string | null
  requestId?: string | null
  userId?: number | null
  userEmail?: string | null
  eventType: string
  status: OperationLogStatus
  code?: string | null
  message?: string | null
  targetType?: string | null
  targetId?: string | null
  method?: string | null
  path?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt: string
  durationMs?: number | null
}

export interface OperationLogDetail extends OperationLogItem {
  requestBody?: unknown
  responseBody?: unknown
  extra?: unknown
}

export interface OperationLogPage {
  total: number
  page: number
  pageSize: number
  list: OperationLogItem[]
}

export function fetchOperationLogs(params: OperationLogQuery) {
  return http.get<OperationLogPage>('/admin/operation-logs', {
    params,
  })
}

export function fetchOperationLogDetail(id: number) {
  return http.get<OperationLogDetail>(`/admin/operation-logs/${id}`)
}
