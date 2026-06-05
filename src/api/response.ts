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

export function unwrapApiList<T>(response: MaybeAxiosResponse<T[]>, fallback: T[] = []): T[] {
  const value = unwrapApiData<T[] | { list?: T[]; items?: T[] }>(response as MaybeAxiosResponse<T[] | { list?: T[]; items?: T[] }>)

  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.list)) return value.list
  if (value && Array.isArray(value.items)) return value.items
  return fallback
}
