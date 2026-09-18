import { describe, expect, it } from 'vitest'
import { getLoginErrorMessage } from '@/utils/authError'

function apiError(code: string, status = 400) {
  return {
    response: {
      status,
      data: { code, message: '后端内部错误' },
    },
    message: `Request failed with status code ${status}`,
  }
}

describe('login error messages', () => {
  it('distinguishes an invalid captcha from invalid credentials', () => {
    expect(getLoginErrorMessage(apiError('AUTH_CAPTCHA_INVALID')))
      .toBe('验证码错误或已过期，请重新输入')
    expect(getLoginErrorMessage(apiError('AUTH_CREDENTIALS_INVALID', 401)))
      .toBe('邮箱或密码不正确，请检查后重试')
  })

  it('explains account state and avoids exposing axios backend errors', () => {
    expect(getLoginErrorMessage(apiError('AUTH_ACCOUNT_LOCKED', 429)))
      .toBe('登录失败次数过多，账号已暂时锁定，请 15 分钟后再试')
    expect(getLoginErrorMessage(apiError('AUTH_EMAIL_NOT_VERIFIED', 403)))
      .toBe('邮箱还未验证，请先查收验证邮件')
    expect(getLoginErrorMessage({ response: { status: 500 }, message: 'Request failed with status code 500' }))
      .toBe('登录服务暂时不可用，请稍后重试')
    expect(getLoginErrorMessage({ code: 'ERR_NETWORK' }))
      .toBe('网络连接失败，请检查网络设置')
  })
})
