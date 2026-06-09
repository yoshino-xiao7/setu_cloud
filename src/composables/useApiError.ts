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
