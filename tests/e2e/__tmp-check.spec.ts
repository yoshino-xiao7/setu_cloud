import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.use({ isMobile: false, hasTouch: false, viewport: { width: 1440, height: 900 } })

test('composer flush bottom', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/ai-draw?mode=chat')
  await page.waitForTimeout(2500)
  const o = await page.evaluate(() => {
    const r = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el)
        return null
      const b = el.getBoundingClientRect()
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }
    }
    return {
      card: r('.chat-card'),
      content: r('.chat-card .n-card__content'),
      list: r('.message-list'),
      input: r('.composer-input'),
      send: r('.composer-send'),
      composer: r('.composer'),
    }
  })
  // eslint-disable-next-line no-console
  console.log('B', JSON.stringify(o))
  await page.screenshot({ path: 'test-results/tmp-bottom.png' })
  expect(o.card!.bottom - o.send!.bottom).toBeLessThanOrEqual(20)
})
