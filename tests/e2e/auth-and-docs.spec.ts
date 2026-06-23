import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test('mock password login reaches admin overview', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByText('API 总调用')).toBeVisible()
})

test('developer docs expose the music api guide', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/docs')

  await expect(page.getByRole('heading', { name: '集成指南' })).toBeVisible()
  await page.getByText('音乐 API', { exact: true }).click()

  await expect(page.getByText('常用音乐接口')).toBeVisible()
  await expect(page.getByText('/user/music/search').first()).toBeVisible()
  await expect(page.getByText('FULL', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
