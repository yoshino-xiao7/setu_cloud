interface ApiErrorShape {
  code?: string
  response?: {
    status?: number
    data?: {
      code?: string
      data?: {
        code?: string
      }
    } | string
  }
}

export function getApiErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object')
    return ''

  const value = error as ApiErrorShape
  const responseData = value.response?.data
  if (responseData && typeof responseData === 'object')
    return responseData.code || responseData.data?.code || ''

  return value.code || ''
}

export function getLoginErrorMessage(error: unknown, fallback = '登录失败，请检查账号密码或验证码'): string {
  const code = getApiErrorCode(error)
  switch (code) {
    case 'AUTH_CAPTCHA_REQUIRED':
      return '请输入验证码'
    case 'AUTH_CAPTCHA_INVALID':
      return '验证码错误或已过期，请重新输入'
    case 'AUTH_CREDENTIALS_INVALID':
      return '邮箱或密码不正确，请检查后重试'
    case 'AUTH_ACCOUNT_LOCKED':
      return '登录失败次数过多，账号已暂时锁定，请 15 分钟后再试'
    case 'AUTH_ACCOUNT_DISABLED':
      return '该账号已被禁用，请联系管理员'
    case 'AUTH_EMAIL_NOT_VERIFIED':
      return '邮箱还未验证，请先查收验证邮件'
    case 'AUTH_CAPTCHA_RATE_LIMITED':
      return '验证码请求过于频繁，请稍后再试'
    case 'AUTH_CAPTCHA_BLOCKED':
      return '验证码失败次数过多，请 10 分钟后再试'
  }

  const status = (error as ApiErrorShape | null)?.response?.status
  if (status && status >= 500)
    return '登录服务暂时不可用，请稍后重试'
  if (status === 401)
    return '邮箱或密码不正确，请检查后重试'
  if (status === 403)
    return '登录信息暂时无法验证，请检查账号状态'
  if (status === 429)
    return '尝试次数过多，请稍后再试'
  const transportCode = (error as { code?: string } | null)?.code
  if (transportCode === 'ECONNABORTED')
    return '登录请求超时，请检查网络后重试'
  if (transportCode === 'ERR_NETWORK')
    return '网络连接失败，请检查网络设置'

  return fallback
}
