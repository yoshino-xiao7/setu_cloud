import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test.describe('admin mobile critical pages', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  test('image audit keeps filters and card list usable', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/image-audit')

    await expect(page.getByTestId('image-audit-page')).toBeVisible()
    await expect(page.getByText('图片库管理')).toBeVisible()
    await expect(page.getByRole('radio', { name: /未审核/ })).toBeVisible()
    await expect(page.getByRole('radio', { name: /复审/ })).toBeVisible()
    await expect(page.getByRole('radio', { name: /全部图库/ })).toBeVisible()
    await expect(page.getByTestId('image-audit-mobile-list')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('delete request management renders cards without horizontal overflow', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/image-delete-requests')

    await expect(page.getByTestId('image-delete-requests-page')).toBeVisible()
    await expect(page.getByText('图片删除申请管理')).toBeVisible()
    await expect(page.getByTestId('image-delete-request-card').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
