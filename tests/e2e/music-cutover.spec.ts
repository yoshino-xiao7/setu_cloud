import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin } from './helpers'
test.beforeEach(async ({page}) => { await loginAsAdmin(page) })
test('canonical history read, pagination and clear use one semantic surface', async ({page}) => {
  await page.goto('/dashboard/music-history')
  await expect(page.getByText('P17 Song 1', {exact:true})).toBeVisible()
  await expect(page.getByText(/共 24 条记录/)).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', {name:'清空历史',exact:true}).click()
  await page.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(page.getByText('P17 Song 1', {exact:true})).toHaveCount(0)
})
test('new admission denial preserves current queue and saved navigation is reachable', async ({page}) => {
  await page.goto('/dashboard/music?q=melody')
  await expect(page.getByText('P17 Song 1', {exact:true})).toBeVisible()
  await page.evaluate(() => sessionStorage.setItem('cutover:admission','closed'))
  await page.locator('.song-item').first().getByRole('button',{name:/播放/}).first().click()
  await expect(page.getByText('当前版本暂未开放新的 v2 播放会话').first()).toBeVisible()
  await page.goto('/dashboard/liked-tracks?collection=saved')
  await expect(page.getByRole('heading',{name:'收藏歌单',exact:true})).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
test('daily selection remains a legacy capability', async ({page}) => {
  await page.goto('/dashboard/music-home?selection=dailyTracks')
  await expect(page.getByRole('heading',{name:'每日推荐',exact:true})).toBeVisible()
  await expect(page.getByText('P17 Song 1',{exact:true})).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
