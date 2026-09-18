import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test('mock password login reaches admin overview', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByText('API 总调用')).toBeVisible()
})

test('API Key is available from personal center instead of sidebar', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/profile')

  await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible()
  await expect(page.locator('.glass-menu').getByText('API Key', { exact: true })).toHaveCount(0)
  await expect(page.locator('.glass-menu').getByText('开发文档', { exact: true })).toHaveCount(0)
  await expect(page.locator('.quick-actions-card').getByText('API Key', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('developer docs route has been removed', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/docs')

  await expect(page.getByText('这里...是哪里？', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
