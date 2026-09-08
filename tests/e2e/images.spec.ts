import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

const media = '/user/images/media/00000000-0000-4000-8000-000000000001?scope=gallery'
function artwork(id: number, source = 'pixiv') {
  return { source, id: String(id), pid: String(id), title: `画集 ${id}`, artist: { id: '77', name: '雪涼', avatarUrl: media, followed: false }, kind: 'illust', pageCount: id === 1 ? 2 : 1, pages: Array.from({ length: id === 1 ? 2 : 1 }, (_, index) => ({ index, pid: String(id), width: 800, height: id % 2 ? 1000 : 700, thumbnailUrl: media, previewUrl: media, originalUrl: media, bookmarked: false })), tags: ['原创', '插画'], caption: '图片模块视觉样例，使用本站已有素材。', createdAt: null, views: null, bookmarks: null, bookmarked: false, restricted: false, aiGenerated: false }
}

test('Pixiv is unavailable without requests; gallery supports details, save and PID validation', async ({ page }, info) => {
  const bound = true // Even an old server binding must not enable Web Pixiv.
  let failGallery = false
  const requests: string[] = []
  await page.route('http://mock.local/user/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/user/pixiv') && !url.pathname.startsWith('/user/images'))
      return route.continue()
    requests.push(`${request.method()} ${url.pathname}`)
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers })
    if (url.pathname.includes('/media/'))
      return route.fulfill({ path: resolve('src/assets/mascot-xueliang.webp'), contentType: 'image/webp', headers })
    let data: unknown = {}
    if (url.pathname.endsWith('/account')) {
      data = { bound, accountId: bound ? '77' : null, name: '雪涼', version: 'fixture' }
    }
    else if (url.pathname.endsWith('/spotlights')) {
      data = [{ id: '1', title: '原创插画特辑', thumbnailUrl: media, url: 'https://www.pixivision.net/zh/a/1' }, { id: '2', title: '角色与色彩', thumbnailUrl: media, url: 'https://www.pixivision.net/zh/a/2' }]
    }
    else if (url.pathname.endsWith('/artists')) {
      data = [artwork(1).artist]
    }
    else if (url.pathname.endsWith('/works')) {
      if (failGallery && url.pathname.includes('/images'))
        return route.fulfill({ status: 503, headers, json: { code: 'UPSTREAM_ERROR', message: '暂时不可用，请重试' } })
      data = { items: Array.from({ length: 8 }, (_, i) => artwork(i + 1, url.pathname.includes('/images') ? 'gallery' : 'pixiv')), nextCursor: null }
    }
    else if (/\/works\/\d+$/.test(url.pathname)) {
      data = artwork(Number(url.pathname.split('/').pop()), url.pathname.includes('/images') ? 'gallery' : 'pixiv')
    }
    return route.fulfill({ headers, json: data })
  })
  await loginAsAdmin(page)
  await page.goto('/dashboard/images?channel=pixiv&work=1')
  await expect(page.getByRole('heading', { name: 'Pixiv 在线暂未开放' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: '作品详情' })).toHaveCount(0)
  expect(requests.some(path => path.includes('/user/pixiv'))).toBe(false)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/images-${info.project.name}-unavailable.png`, fullPage: true })
  await page.getByRole('tab', { name: '本站图库', exact: true }).click()
  await expect(page.locator('.artwork-masonry .artwork-card')).toHaveCount(8)
  await expect(page.locator('.artwork-masonry img').first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/images-${info.project.name}-home.png`, fullPage: true })
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('.image-browser')).toHaveClass(/dark/)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/images-${info.project.name}-home-dark.png`, fullPage: true })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.getByRole('button', { name: '查看 画集 1', exact: true }).first().click()
  const detail = page.getByRole('dialog', { name: '作品详情' })
  await expect(detail.getByRole('heading', { name: '画集 1', exact: true })).toBeVisible()
  await expect(detail.locator('.detail-image-page')).toHaveCount(2)
  await page.screenshot({ path: `test-results/images-${info.project.name}-detail.png` })
  const downloaded = page.waitForEvent('download')
  await detail.getByRole('button', { name: '保存本页', exact: true }).first().click()
  expect((await downloaded).suggestedFilename()).toMatch(/\.webp$/)
  await page.getByRole('button', { name: '下一部作品', exact: true }).click()
  await expect(detail.getByRole('heading', { name: '画集 2', exact: true })).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(detail.getByRole('heading', { name: '画集 1', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭作品详情' }).click()
  await page.getByRole('tab', { name: '本站图库', exact: true }).click()
  await expect(page.locator('.artwork-masonry .artwork-card')).toHaveCount(8)
  await page.locator('.artwork-masonry .bookmark').first().click()
  await expect(page.locator('.artwork-masonry .bookmark').first()).toHaveAttribute('aria-pressed', 'true')
  expect(requests).toContain('PUT /user/images/works/1/bookmark')
  await page.getByRole('button', { name: '新增图片', exact: true }).click()
  await page.getByPlaceholder(/PID/).fill('123, bad-pid')
  await page.getByRole('button', { name: '提交 PID', exact: true }).click()
  await page.screenshot({ path: `test-results/images-${info.project.name}-import.png` })
  await expect(page.getByText(/PID 无效/)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await page.getByRole('tab', { name: 'Pixiv 在线', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pixiv 在线暂未开放' })).toBeVisible()
  expect(requests.some(path => path.includes('/user/pixiv'))).toBe(false)
  failGallery = true
  await page.getByRole('tab', { name: '本站图库', exact: true }).click()
  await page.getByRole('button', { name: '刷新图片' }).click()
  await expect(page.getByText('暂时不可用，请重试')).toBeVisible()
})
