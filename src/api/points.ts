import http from '@/api/http'

export interface PointsMeDTO {
  points: number
}

export interface PointsLogDTO {
  id: number
  delta: number
  bizType: string
  endpoint?: string
  createdAt?: string
}

export interface PointsLogPageDTO {
  page: number
  size: number
  total: number
  items: PointsLogDTO[]
}

export function getMyPoints() {
  return http.get<PointsMeDTO>('/points/me')
}

export function getPointsLogs(params: { page: number, size?: number }) {
  return http.get<PointsLogPageDTO>('/points/logs', { params })
}
