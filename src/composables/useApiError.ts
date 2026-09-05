import type { MessageApi, MessageOptions } from 'naive-ui'
import type { VNodeChild } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import axios from 'axios'
import { h } from 'vue'
import { getRouter } from '@/router'

type HeaderBag = Record<string, string | string[] | undefined> & {
  get?: (key: string) => string | null | undefined
}

interface ApiErrorResponseData {
  message?: string
  msg?: string
  traceId?: string
  traceID?: string
  trace_id?: string
  data?: unknown
}

interface ApiErrorLike {
  message?: string
  traceId?: string
  traceID?: string
  trace_id?: string
  response?: {
    headers?: HeaderBag
    data?: ApiErrorResponseData | string
  }
}

export type ApiErrorMessageContent = string | (() => VNodeChild)

export interface ApiErrorInfo {
  message: string
  traceId?: string
}

export interface ShowApiErrorOptions extends MessageOptions {
  messageOverride?: string
  messagePrefix?: string
}

export function shouldIgnoreApiError(error: unknown) {
  if (axios.isCancel(error))
    return true

  if (!error || typeof error !== 'object')
    return false

  const anyError = error as {
    __CANCEL__?: boolean
    code?: string
    message?: string
    name?: string
  }

  return anyError.__CANCEL__ === true
    || anyError.code === 'ERR_CANCELED'
    || anyError.name === 'CanceledError'
    || anyError.message === 'canceled'
}

export function getApiErrorInfo(error: unknown, fallback = '操作失败，请稍后再试'): ApiErrorInfo {
  if (!error || typeof error !== 'object')
    return { message: fallback }

  const anyError = error as ApiErrorLike
  const message = getResponseDataMessage(anyError.response?.data)
    || anyError.message
    || fallback
  const traceId = getResponseDataTraceId(anyError.response?.data)
    || normalizeTraceId(anyError.traceId)
    || normalizeTraceId(anyError.traceID)
    || normalizeTraceId(anyError.trace_id)
    || getHeaderValue(anyError.response?.headers, 'x-trace-id')
    || getHeaderValue(anyError.response?.headers, 'trace-id')

  return { message, traceId }
}

export function getApiErrorTraceId(error: unknown) {
  return getApiErrorInfo(error).traceId
}

export function getApiErrorMessage(error: unknown, fallback = '操作失败，请稍后再试') {
  const { message, traceId } = getApiErrorInfo(error, fallback)
  return appendTraceId(message, traceId)
}

export function getTraceOperationLogsLocation(traceId: string): RouteLocationRaw {
  return {
    path: '/admin/operation-logs',
    query: { traceId: traceId.trim() },
  }
}

export function openTraceOperationLogs(traceId: string) {
  const normalized = normalizeTraceId(traceId)
  if (!normalized)
    return Promise.resolve()

  return getRouter().push(getTraceOperationLogsLocation(normalized))
}

export function getApiErrorMessageContent(error: unknown, fallback = '操作失败，请稍后再试'): ApiErrorMessageContent {
  return renderApiErrorInfo(getApiErrorInfo(error, fallback))
}

export function showApiError(
  messageApi: Pick<MessageApi, 'error'>,
  error: unknown,
  fallback = '操作失败，请稍后再试',
  options: ShowApiErrorOptions = {},
) {
  const { messageOverride, messagePrefix, ...messageOptions } = options
  const rawInfo = getApiErrorInfo(error, fallback)
  const baseInfo = messageOverride
    ? { ...rawInfo, message: messageOverride }
    : rawInfo
  const info = messagePrefix
    ? { ...baseInfo, message: `${messagePrefix}${baseInfo.message}` }
    : baseInfo

  return messageApi.error(renderApiErrorInfo(info), {
    ...(info.traceId
      ? {
          closable: true,
          duration: 8000,
          keepAliveOnHover: true,
        }
      : {}),
    ...messageOptions,
  })
}

function getResponseDataMessage(data: ApiErrorResponseData | string | undefined) {
  if (typeof data === 'string')
    return data

  if (!data || typeof data !== 'object' || Array.isArray(data))
    return undefined

  return data.message || data.msg
}

function getResponseDataTraceId(data: ApiErrorResponseData | string | undefined) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return undefined

  return normalizeTraceId(data.traceId)
    || normalizeTraceId(data.traceID)
    || normalizeTraceId(data.trace_id)
    || getNestedTraceId(data.data)
}

function getNestedTraceId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return undefined

  const nested = data as ApiErrorResponseData
  return normalizeTraceId(nested.traceId)
    || normalizeTraceId(nested.traceID)
    || normalizeTraceId(nested.trace_id)
}

function normalizeTraceId(value: unknown) {
  if (typeof value !== 'string')
    return undefined

  const trimmed = value.trim()
  return trimmed || undefined
}

function appendTraceId(message: string, traceId?: string) {
  if (traceId && !message.includes(traceId))
    return `${message}（追踪ID：${traceId}）`

  return message
}

function renderApiErrorInfo({ message, traceId }: ApiErrorInfo): ApiErrorMessageContent {
  if (!traceId)
    return message

  return () => h('span', {
    style: {
      overflowWrap: 'anywhere',
    },
  }, renderTraceableMessage(message, traceId))
}

function renderTraceableMessage(message: string, traceId: string): VNodeChild[] {
  const index = message.indexOf(traceId)
  const traceNode = renderTraceId(traceId)

  if (index >= 0) {
    return [
      message.slice(0, index),
      traceNode,
      message.slice(index + traceId.length),
    ]
  }

  return [
    message,
    '（追踪ID：',
    traceNode,
    '）',
  ]
}

function renderTraceId(traceId: string) {
  return h('span', {
    style: {
      color: '#2563eb',
      fontWeight: '600',
    },
    title: '请求追踪 ID，可用于后端日志排查',
  }, traceId)
}

function getHeaderValue(headers: HeaderBag | undefined, key: string) {
  if (!headers)
    return undefined

  const getterValue = typeof headers.get === 'function'
    ? headers.get(key)
    : undefined
  if (getterValue)
    return normalizeTraceId(getterValue)

  const matchedKey = Object.keys(headers).find(item => item.toLowerCase() === key.toLowerCase())
  const value = matchedKey ? headers[matchedKey] : undefined
  if (Array.isArray(value))
    return normalizeTraceId(value[0])
  return normalizeTraceId(value)
}
