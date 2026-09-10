import { expect, test } from '@playwright/test'

test('stalled card images stop loading and expose retry without following the card link', async ({ page }) => {
  await page.addInitScript(() => {
    const entries = [0, 1, 2, 3].map(index => [index, {
      artwork: { url: `https://stalled.test/${index}.png`, title: '作品', author: '作者' },
      expiresAt: Date.now() + 300000,
    }])
    sessionStorage.setItem('yike-public-artwork-v1', JSON.stringify(entries))
  })
  await page.route('https://stalled.test/**', () => {})
  await page.clock.install()
  await page.goto('/')
  await page.locator('#discover').scrollIntoViewIfNeeded()
  await expect(page.locator('.space-image img')).toHaveCount(3)
  await page.clock.fastForward(21000)
  await expect(page.locator('.space-image [aria-busy="true"]')).toHaveCount(0)
  await expect(page.locator('.space-image .is-failed')).toHaveCount(3)
  await expect(page.locator('.space-image button')).toHaveCount(3)
  const cached = await page.evaluate(() => JSON.parse(sessionStorage.getItem('yike-public-artwork-v1') || '[]'))
  expect(cached).toEqual([])
  await page.locator('.space-image button').first().click()
  await expect(page).toHaveURL('/')
})
