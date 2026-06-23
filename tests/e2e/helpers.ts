import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill('mock@example.com')
  await page.getByTestId('login-password').fill('password123')
  await page.getByTestId('login-captcha').fill('7K2P9')
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/admin\/overview/)
}

export async function expectNoHorizontalOverflow(page: Page) {
  const hasNoOverflow = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth)
    return scrollWidth <= window.innerWidth + 2
  })

  expect(hasNoOverflow).toBe(true)
}
