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
      response?: {
        data?: {
          message?: string
          msg?: string
        }
      }
    }

    return anyError.response?.data?.message
      || anyError.response?.data?.msg
      || anyError.message
      || fallback
  }

  return fallback
}
