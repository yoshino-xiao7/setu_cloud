import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test('about cards keep readable widths, flip without dragging, and show biographies', async ({ page, isMobile }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const cards = page.locator('.holo-card')
  await expect(cards).toHaveCount(2)
  for (const card of await cards.all()) {
    await expect.poll(() => card.evaluate(el => el.clientWidth)).toBeGreaterThanOrEqual(240)
    await expect.poll(() => card.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
    expect(await card.locator('.holo-caption').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect(card.locator('.holo-back')).toHaveText('')
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await card.press('Enter')
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await card.press('Space')
    await expect(card).toHaveAttribute('aria-pressed', 'false')
  }
  if (!isMobile) {
    const card = cards.first()
    await card.scrollIntoViewIfNeeded()
    const bounds = await card.boundingBox()
    if (!bounds)
      throw new Error('Card must be laid out')
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect(card).toHaveAttribute('aria-pressed', 'false')
  }
  await expect(page.locator('.mascot-story')).toHaveCount(2)
  await expect(page.locator('.mascot-story details, .mascot-list details')).toHaveCount(0)
  await expect(page.getByText('嗨呀，这里是雪涼。', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
