/**
 * 构建时自动生成 sitemap.xml。
 * 默认包含静态公开页面，并尝试追加动态公开收藏夹/用户主页。
 * 动态页面数据源与 vite-ssg 预渲染枚举共用 scripts/publicPages.ts。
 * 如需在本地或离线构建时跳过动态页面，设置 SITEMAP_DYNAMIC=false。
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fetchPublicDynamicPages } from './publicPages'

const SITE_URL = 'https://cloud.yukiryou.icu'
const includeDynamicPages = process.env.SITEMAP_DYNAMIC !== 'false'

interface SitemapPage {
  path: string
  priority: number
  changefreq: string
}

const publicPages: SitemapPage[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/docs', priority: 0.9, changefreq: 'weekly' },
  { path: '/status', priority: 0.7, changefreq: 'weekly' },
]

const today = new Date().toISOString().split('T')[0]

async function fetchDynamicPages(): Promise<SitemapPage[]> {
  if (!includeDynamicPages) {
    return []
  }

  const { collectionIds, userIds } = await fetchPublicDynamicPages()

  return [
    ...collectionIds.map(id => ({
      path: `/c/${id}`,
      priority: 0.8,
      changefreq: 'weekly',
    })),
    ...userIds.map(id => ({
      path: `/user/${id}`,
      priority: 0.7,
      changefreq: 'weekly',
    })),
  ]
}

function generateSitemap(allPages: SitemapPage[]): string {
  const urls = allPages.map(page => `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

async function main() {
  const dynamicPages = await fetchDynamicPages()
  const allPages = [...publicPages, ...dynamicPages]
  const sitemap = generateSitemap(allPages)
  const outputPath = resolve(process.cwd(), 'dist', 'sitemap.xml')
  const publicPath = resolve(process.cwd(), 'public', 'sitemap.xml')

  try {
    writeFileSync(outputPath, sitemap, 'utf-8')
  }
  catch {
    // dist 目录可能还不存在
  }

  try {
    writeFileSync(publicPath, sitemap, 'utf-8')
  }
  catch {
    // public 目录写入失败不影响构建
  }

  console.warn(`Sitemap generated (${allPages.length} URLs)`)
}

main()
