import { expect, test } from '@playwright/test'

// 这些用例跑在 VITE_USE_API_MOCKS=true 下：mock 适配器直接接管 axios，
// 所以断言针对 mocks/api-mock.ts 的固定夹具，而不是拦截网络。
// 夹具里 index % 9 === 0 的图片是 R18（pid 990009 / 990018），必须被首屏挡掉。

test('the logged-out first screen leads with real artwork', async ({ page }) => {
  await page.goto('/')

  const tiles = page.locator('.stage-wall img')
  await expect(tiles.first()).toBeVisible()
  await expect(tiles).toHaveCount(8)

  // 作品墙是背景，辅助技术应读到标题而不是一堆装饰图
  await expect(page.locator('.stage-wall')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('r18 previews never reach the logged-out first screen', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stage-wall img').first()).toBeVisible()

  const sources = await page.locator('.stage-wall img').evaluateAll(
    images => images.map(image => (image as HTMLImageElement).src),
  )

  expect(sources).not.toHaveLength(0)
  for (const pid of ['990009', '990018'])
    expect(sources.some(src => src.includes(pid))).toBe(false)
})

test('the first screen mixes collections instead of one owner filling the wall', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stage-wall img').first()).toBeVisible()

  const pids = await page.locator('.stage-wall img').evaluateAll(
    images => images.map(image => (decodeURIComponent((image as HTMLImageElement).src).match(/PID (\d+)_p/) || [])[1]),
  )

  // 夹具里 99000x 与 99002x 分属不同收藏夹，交错排列才不会被单个收藏夹刷屏
  expect(new Set(pids.map(pid => pid?.slice(0, 5))).size).toBeGreaterThan(1)
})

test('the primary call to action stays reachable above the fold', async ({ page }) => {
  await page.goto('/')

  const cta = page.getByRole('link', { name: /开启我的空间/ })
  await expect(cta).toBeVisible()

  // 作品墙不能盖住主按钮
  const box = await cta.boundingBox()
  expect(box).not.toBeNull()
  const hit = await page.evaluate(
    point => document.elementFromPoint(point.x, point.y)?.closest('a')?.getAttribute('href') ?? null,
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  )
  expect(hit).toBe('/register')

  await cta.click()
  await expect(page).toHaveURL(/\/register$/)
})

test('the first screen has no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stage-wall img').first()).toBeVisible()

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
})
