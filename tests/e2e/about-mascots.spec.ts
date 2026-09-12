import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test('summer edition switches both cards, resets flips, and remembers the choice', async ({ page }, testInfo) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const cards = page.locator('.holo-card')
  await expect(cards).toHaveCount(2)
  await expect(page.getByRole('radio', { name: '经典', exact: true })).toBeChecked()
  const classic = await cards.locator('.holo-front img').evaluateAll(images => images.map(image => (image as HTMLImageElement).src))
  const classicSizes = await cards.evaluateAll(elements => elements.map(el => ({ width: el.clientWidth, height: el.clientHeight })))
  await cards.first().click()
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'true')
  await page.locator('label.n-radio-button').filter({ hasText: '夏日限定' }).click()
  await expect(page.getByRole('radio', { name: '夏日限定', exact: true })).toBeChecked()
  await page.locator('.mascot-heading').screenshot({ animations: 'disabled', path: testInfo.outputPath('edition-switch.png') })
  for (const [index, card] of (await cards.all()).entries()) {
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await expect(card).toHaveAttribute('data-renderer', 'procedural-foil')
    await expect(card.locator('.holo-top')).toHaveText('YIKE · SUMMER LIMITED')
    await expect(card.locator('.holo-front img')).toHaveAttribute('src', /summer-approved/)
    await card.locator('.holo-front img').evaluate(el => (el as HTMLImageElement).decode())
    expect.soft(await card.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))).toEqual(classicSizes[index])
    await card.click()
    await expect(card.locator('.holo-front')).toBeHidden()
    await expect(card.locator('.holo-back')).toHaveText('')
    const backCoverage = await card.locator('.holo-back img').evaluate(async (el) => {
      const image = el as HTMLImageElement
      await image.decode()
      const scale = getComputedStyle(image).objectFit === 'cover'
        ? Math.max(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight)
        : Math.min(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight)
      return { horizontalGap: image.clientWidth - image.naturalWidth * scale, verticalGap: image.clientHeight - image.naturalHeight * scale }
    })
    expect.soft(backCoverage.horizontalGap).toBeLessThanOrEqual(1)
    expect.soft(backCoverage.verticalGap).toBeLessThanOrEqual(1)
    await expect.poll(() => card.locator('.holo-turn').evaluate(el => (el as HTMLElement).style.transform)).toBe('rotateY(180deg)')
    await card.screenshot({ animations: 'disabled', path: testInfo.outputPath(`summer-back-${index + 1}.png`) })
    await card.click()
    await expect(card.locator('.holo-back')).toBeHidden()
    await card.scrollIntoViewIfNeeded()
    await expect.poll(() => card.locator('.holo-turn').evaluate(el => (el as HTMLElement).style.transform)).toBe('rotateY(0deg)')
    await card.screenshot({ animations: 'disabled', path: testInfo.outputPath(`summer-card-${index + 1}.png`) })
  }
  await expectNoHorizontalOverflow(page)
  await cards.first().screenshot({ animations: 'disabled', path: testInfo.outputPath('summer-card.png') })
  await page.reload()
  await expect(page.getByRole('radio', { name: '夏日限定', exact: true })).toBeChecked()
  await expect(cards.first().locator('.holo-top')).toHaveText('YIKE · SUMMER LIMITED')
  await page.locator('label.n-radio-button').filter({ hasText: '经典' }).click()
  await expect.poll(() => cards.locator('.holo-front img').evaluateAll(images => images.map(image => (image as HTMLImageElement).src))).toEqual(classic)
  await expect(cards.first().locator('.holo-top')).toHaveText('YIKE · MASCOT COLLECTION')
  expect(await cards.first().evaluate(el => el.clientWidth / el.clientHeight)).toBeCloseTo(2 / 3, 2)
})

test('card colors survive the Safari unpremultiplied canvas compositor bug', async ({ page }, testInfo) => {
  await loginAsAdmin(page)
  await page.goto('/dashboard/about')
  const card = page.locator('.holo-card').first()
  const waitForPaint = async () => {
    await expect(card).toHaveAttribute('data-renderer', 'procedural-foil')
    await card.scrollIntoViewIfNeeded()
    await card.locator('.holo-front img').evaluate(el => (el as HTMLImageElement).decode())
    await page.evaluate(() => document.fonts.ready.then(() => {}))
    await expect.poll(() => card.locator('.holo-foil').evaluate((el) => {
      const canvas = el as HTMLCanvasElement
      const gl = canvas.getContext('webgl')!
      const pixel = new Uint8Array(4)
      gl.readPixels(canvas.width >> 1, canvas.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      return pixel[3]
    })).toBeGreaterThan(0)
  }
  await waitForPaint()
  const reference = await card.screenshot({ animations: 'disabled', path: testInfo.outputPath('reference.png') })
  // WebKit #200026 interprets straight-alpha drawing buffers as premultiplied.
  // Force that interpretation even on browsers where the upstream bug is fixed.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, options?: any) {
      return original.call(this, type as any, type === 'webgl' ? { ...options, premultipliedAlpha: true } : options)
    } as typeof original
  })
  await page.reload()
  await waitForPaint()
  const composited = await card.screenshot({ animations: 'disabled', path: testInfo.outputPath('safari-alpha-composited.png') })
  const error = await page.evaluate(async ([before, after]) => {
    const decode = async (base64: string) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, image.width, image.height).data
    }
    const [a, b] = await Promise.all([decode(before!), decode(after!)])
    if (a.length !== b.length)
      return Infinity
    let difference = 0
    for (let i = 0; i < a.length; i += 4)
      difference += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!)
    return difference / (a.length / 4 * 3)
  }, [reference.toString('base64'), composited.toString('base64')])
  expect(error, 'Safari compositing must preserve the reference card colors').toBeLessThan(3)
})

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
