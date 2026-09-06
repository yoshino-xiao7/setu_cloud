import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'

test.beforeEach(async ({ page,
}) => {
  await loginAsAdmin(page)
})
for (const [path, title] of [['music-home', '音乐首页'], ['music-rankings', '排行榜'], ['liked-tracks', '我喜欢'], ['playlist/netease%3Aplaylist%3A9007199254741993', 'P17 推荐歌单'], ['playlist/setu%3Aplaylist%3A1', 'P17 我的歌单']]) {
  test(`populated ${path}`, async ({ page }, info) => {
    await page.goto(`/dashboard/${path}`)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: info.outputPath('populated.png'), fullPage: true })
    if (path.includes('netease'))
      await expect(page.getByTitle('编辑歌单')).toHaveCount(0)
    if (path.includes('setu'))
      await expect(page.getByTitle('编辑歌单')).toBeVisible()
  })
}
for (const mode of ['empty', 'error', 'unauthorized', 'loading']) {
  test(`home ${mode}`, async ({ page }, info) => {
    await page.evaluate(value => sessionStorage.setItem('p17:state', value), mode)
    await page.goto('/dashboard/music-home')
    if (mode === 'empty')
      await expect(page.getByText('暂时没有推荐内容')).toBeVisible()
    if (mode === 'error' || mode === 'unauthorized')
      await expect(page.getByRole('alert').filter({ has: page.getByRole('button', { name: '重试' }) })).toBeVisible()
    if (mode === 'loading')
      await expect(page.locator('.n-skeleton').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: info.outputPath(`${mode}.png`), fullPage: true })
  })
}
test('liked pagination and optimistic removal', async ({ page }) => {
  await page.goto('/dashboard/liked-tracks')
  await expect(page.getByText('P17 Song 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '加载更多' }).click()
  await expect(page.getByText('P17 Song 21', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消喜欢', exact: true }).first().click()
  await expect(page.getByText('P17 Song 1', { exact: true })).toHaveCount(0)
})
test('local deletion uses membership rather than track identity', async ({ page }) => {
  await page.goto('/dashboard/playlist/setu%3Aplaylist%3A1')
  await expect(page.getByText('P17 Song 1', { exact: true })).toBeVisible()
  await page.locator('.song-actions button').first().click()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('P17 Song 1', { exact: true })).toHaveCount(0)
})
test('search route and translated lyrics retain the player and queue', async ({ page }) => {
  await page.goto('/dashboard/music?q=melody')
  await expect(page.getByText('P17 Song 1', { exact: true })).toBeVisible()
  await page.locator('.song-item').first().getByRole('button', { name: /播放/ }).first().click()
  await expect(page.getByRole('region', { name: '音乐播放器' })).toBeVisible()
  await page.getByRole('region', { name: '音乐播放器' }).locator('.track-button').click()
  await page.getByText('歌词', { exact: true }).first().click()
  await expect(page.getByText('一段安静的旋律', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

for (const path of ['music-rankings', 'liked-tracks', 'playlist/setu%3Aplaylist%3A1']) {
  for (const mode of ['empty', 'error', 'unauthorized', 'loading']) {
    test(`four-state ${path} ${mode}`, async ({ page }, info) => {
      await page.evaluate(value => sessionStorage.setItem('p17:state', value), mode)
      await page.goto(`/dashboard/${path}`)
      if (mode === 'empty')
        await expect(page.getByText(path === 'music-rankings' ? '暂无榜单' : path === 'liked-tracks' ? '还没有收藏内容' : '歌单为空', { exact: true })).toBeVisible()
      if (mode === 'error' || mode === 'unauthorized')
        await expect(page.getByRole('alert').filter({ has: page.getByRole('button', { name: '重试' }) })).toBeVisible()
      if (mode === 'loading')
        await expect(page.locator('.n-skeleton').first()).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.screenshot({ path: info.outputPath(`${mode}.png`), fullPage: true })
    })
  }
}

test('direct regression history MV drag and token status', async ({ page }) => {
  await page.goto('/dashboard/music-history')
  await expect(page.getByText('P17 Song 1', { exact: true })).toBeVisible()
  await page.goto('/dashboard/music?q=melody')
  await page.getByTitle('播放 MV', { exact: true }).first().click()
  await page.getByTitle('缩小', { exact: true }).click()
  const header = page.locator('.mini-mv-header')
  await expect(header).toBeVisible()
  await header.hover({ position: { x: 40, y: 20 } })
  const box = (await header.boundingBox())!
  await page.mouse.move(box.x + 40, box.y + 20)
  await page.mouse.down()
  await expect(page.locator('.mini-mv-player')).toHaveClass(/is-dragging/)
  await page.mouse.move(box.x + 60, box.y + 80, { steps: 5 })
  await page.mouse.up()
  const position = await page.evaluate(() => localStorage.getItem('mv_player_position'))
  expect(position).not.toBeNull()
  await page.locator('.mini-mv-player').getByTitle('关闭', { exact: true }).click()
  await page.getByTitle('播放 MV', { exact: true }).first().click()
  await page.getByTitle('缩小', { exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('mv_player_position'))).toBe(position)
  await page.goto('/admin/music-tokens')
  await expect(page.getByText('当前服务未提供自动降级原因', { exact: false })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
test('direct regression Media Session metadata and registered actions', async ({ page }) => {
  await page.addInitScript(() => {
    const callbacks: Record<string, MediaSessionActionHandler | null> = {}
    Object.assign(window, { p17MediaActions: callbacks })
    const original = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession)
    navigator.mediaSession.setActionHandler = (action, handler) => {
      callbacks[action] = handler
      original(action, handler)
    }
  })
  const wav = Buffer.alloc(44 + 44100 * 2 * 10)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(44100, 24)
  wav.writeUInt32LE(88200, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(wav.length - 44, 40)
  await page.route('https://actions.google.com/**', route => route.fulfill({ status: 200, contentType: 'audio/wav', body: wav }))
  await page.goto('/dashboard/music?q=melody')
  await page.locator('.song-item').first().getByTitle('播放', { exact: true }).click()
  await expect.poll(() => page.evaluate(() => navigator.mediaSession.metadata?.title)).toBe('P17 Song 1')
  const actions = await page.evaluate(() => {
    const callbacks = (window as unknown as { p17MediaActions: Record<string, MediaSessionActionHandler | null> }).p17MediaActions
    callbacks.pause?.({ action: 'pause' })
    return Object.keys(callbacks).filter(key => callbacks[key]).sort()
  })
  expect(actions).toEqual(['nexttrack', 'pause', 'play', 'previoustrack', 'seekto'])
  await expect.poll(() => page.evaluate(() => navigator.mediaSession.playbackState)).toBe('paused')
})

test('provider playlist plays without a local mutation route', async ({ page }) => {
  await page.goto('/dashboard/playlist/netease%3Aplaylist%3A9007199254741993')
  await page.getByRole('button', { name: '播放全部', exact: true }).click()
  await expect(page.getByRole('region', { name: '音乐播放器' })).toBeVisible()
  await expect(page.getByRole('region', { name: '音乐播放器' }).getByText('P17 Song 1', { exact: true })).toBeVisible()
})
