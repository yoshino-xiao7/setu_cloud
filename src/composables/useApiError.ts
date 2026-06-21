import axios from 'axios'

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

export function getApiErrorMessage(error: unknown, fallback = '操作失败，请稍后再试') {
  if (error && typeof error === 'object') {
    const anyError = error as {
      message?: string
      traceId?: string
      response?: {
        headers?: Record<string, string | string[] | undefined>
        data?: {
          traceId?: string
          message?: string
          msg?: string
        }
      }
    }

    const message = anyError.response?.data?.message
      || anyError.response?.data?.msg
      || anyError.message
      || fallback
    const traceId = anyError.response?.data?.traceId
      || anyError.traceId
      || getHeaderValue(anyError.response?.headers, 'x-trace-id')

    if (traceId && !message.includes(traceId))
      return `${message}（追踪ID：${traceId}）`

    return message
  }

  return fallback
}

function getHeaderValue(headers: Record<string, string | string[] | undefined> | undefined, key: string) {
  if (!headers)
    return undefined

  const matchedKey = Object.keys(headers).find(item => item.toLowerCase() === key.toLowerCase())
  const value = matchedKey ? headers[matchedKey] : undefined
  if (Array.isArray(value))
    return value[0]
  return value
}
