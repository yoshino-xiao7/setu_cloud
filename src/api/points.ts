import http from '@/api/http'

export type PointsMeDTO = {
  points: number
}

export type PointsLogDTO = {
  id: number
  delta: number
  bizType: string
  endpoint?: string
  createdAt?: string
}

export type PointsLogPageDTO = {
  page: number
  size: number
  total: number
  items: PointsLogDTO[]
}

export function getMyPoints() {
  return http.get<PointsMeDTO>('/points/me')
}

export function getPointsLogs(params: { page: number; size?: number }) {
  return http.get<PointsLogPageDTO>('/points/logs', { params })
}
