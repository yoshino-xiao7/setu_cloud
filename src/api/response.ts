import type { AxiosResponse } from 'axios'

export interface ApiEnvelope<T> {
  code?: number
  message?: string
  msg?: string
  data?: T
  total?: number
  count?: number
  page?: number
  size?: number
  list?: T
}

type MaybeAxiosResponse<T> = AxiosResponse<ApiEnvelope<T> | T> | ApiEnvelope<T> | T
interface ListPayload<T> {
  list?: T[]
  items?: T[]
  records?: T[]
  rows?: T[]
  content?: T[]
}

const listFields = ['list', 'items', 'records', 'rows', 'content'] as const

export function unwrapApiData<T>(response: MaybeAxiosResponse<T>, fallback?: T): T {
  const value = response && typeof response === 'object' && 'data' in response
    ? (response as AxiosResponse<ApiEnvelope<T> | T>).data
    : response

  if (value && typeof value === 'object' && 'data' in value) {
    const nested = (value as ApiEnvelope<T>).data
    return (nested === undefined ? fallback : nested) as T
  }

  return (value === undefined ? fallback : value) as T
}

export function getApiList<T>(value: unknown): T[] | null {
  if (Array.isArray(value))
    return value as T[]

  if (!value || typeof value !== 'object')
    return null

  const payload = value as ListPayload<T>
  for (const field of listFields) {
    const list = payload[field]
    if (Array.isArray(list))
      return list
  }

  return null
}

export function unwrapApiList<T>(response: MaybeAxiosResponse<T[]>, fallback: T[] = []): T[] {
  const value = unwrapApiData<T[] | ListPayload<T>>(
    response as MaybeAxiosResponse<T[] | ListPayload<T>>,
  )

  const list = getApiList<T>(value)
  if (list)
    return list
  return fallback
}
