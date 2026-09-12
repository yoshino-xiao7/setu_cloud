import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test('reflection layers cannot cover the artwork with an opaque black surface', async ({ page }, testInfo) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const card = page.locator('.holo-card').first()
  await expect(card).toHaveAttribute('data-renderer', 'procedural-foil')
  await card.scrollIntoViewIfNeeded()
  await card.press('ArrowRight')
  await expect.poll(() => card.locator('.holo-shine').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const gl = canvas.getContext('webgl')!
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    let transparent = 0
    let reflected = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3]! < 8)
        transparent++
      if (pixels[i + 3]! > 8 && Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) > 16)
        reflected++
    }
    return transparent > canvas.width * canvas.height / 2 && reflected > 0
  })).toBe(true)
  await card.screenshot({ path: testInfo.outputPath('foil-front.png') })
  // Reproduce a compositor losing CSS blending: the artwork must remain readable.
  await page.addStyleTag({ content: '.holo-shine { mix-blend-mode: normal !important }' })
  await card.screenshot({ path: testInfo.outputPath('foil-without-screen-blend.png') })
})

test('about cards keep readable widths, flip without dragging, and show biographies', async ({ page, isMobile }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const cards = page.locator('.holo-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toHaveAttribute('data-renderer', 'procedural-foil')
  const rotator = cards.first().locator('.holo-rotator')
  const restingTransform = await rotator.evaluate(el => getComputedStyle(el).transform)
  await cards.first().press('ArrowRight')
  await expect(rotator).not.toHaveCSS('transform', restingTransform)
  await cards.first().press('Escape')
  await expect(rotator).toHaveCSS('transform', restingTransform)
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

test('the inactive card face is removed from painting after a flip', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const card = page.locator('.holo-card').first()
  await card.click()
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await expect(card.locator('.holo-front')).toHaveCSS('display', 'none')
  await expect(card.locator('.holo-back')).not.toHaveCSS('display', 'none')
  await card.click()
  await expect(card.locator('.holo-back')).toHaveCSS('display', 'none')
  await expect(card.locator('.holo-front')).not.toHaveCSS('display', 'none')
})

test('rapid flip reversals settle with only the requested face visible', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const card = page.locator('.holo-card').first()
  for (let i = 0; i < 21; i++) await card.press('Enter')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await expect(card.locator('.holo-front')).toHaveCSS('display', 'none')
  await expect(card.locator('.holo-back')).not.toHaveCSS('display', 'none')
  await expect(card.locator('img')).toHaveCount(2)
  await card.press('Enter')
  await expect(card.locator('.holo-back')).toHaveCSS('display', 'none')
  await expect(card.locator('.holo-front')).not.toHaveCSS('display', 'none')
})

test('procedural foil works without uploading character textures', async ({ page }) => {
  await page.addInitScript(() => {
    WebGLRenderingContext.prototype.texImage2D = () => {
      throw new Error('Character textures must not be uploaded')
    }
  })
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  for (const card of await page.locator('.holo-card').all()) {
    await expect(card).toHaveAttribute('data-renderer', 'procedural-foil')
    await expect(card.locator('.holo-foil')).toHaveCSS('mix-blend-mode', 'overlay')
    await expect(card.locator('.holo-shine')).toHaveCSS('mix-blend-mode', 'screen')
    await expect(card.locator('.holo-front img')).toBeVisible()
  }
})
