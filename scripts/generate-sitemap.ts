/**
 * 构建时自动生成 sitemap.xml。
 * 默认只包含静态公开页面；如需动态公开收藏夹/用户主页，设置 SITEMAP_DYNAMIC=true。
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const SITE_URL = 'https://cloud.yukiryou.icu'
const API_BASE_URL = 'https://api.yukiryou.icu'
const includeDynamicPages = process.env.SITEMAP_DYNAMIC === 'true'

interface SitemapPage {
  path: string
  priority: number
  changefreq: string
}

interface SquareCollectionRecord {
  id?: unknown
  userId?: unknown
}

const publicPages: SitemapPage[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/login', priority: 0.6, changefreq: 'monthly' },
  { path: '/register', priority: 0.6, changefreq: 'monthly' },
  { path: '/status', priority: 0.7, changefreq: 'weekly' },
  { path: '/forgot-password', priority: 0.3, changefreq: 'yearly' },
]

const today = new Date().toISOString().split('T')[0]

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toPositiveInteger(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null
}

function readCollectionList(json: unknown): SquareCollectionRecord[] {
  if (!isRecord(json)) {
    return []
  }

  const data = isRecord(json.data) ? json.data : json
  for (const key of ['list', 'items', 'records']) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

async function fetchDynamicPages(): Promise<SitemapPage[]> {
  if (!includeDynamicPages) {
    return []
  }

  const pages: SitemapPage[] = []

  try {
    const res = await fetch(
      `${API_BASE_URL}/square/collections?page=1&size=200`,
      { signal: AbortSignal.timeout(10000) },
    )

    if (!res.ok) {
      console.warn(`Sitemap dynamic pages skipped: API returned ${res.status}`)
      return pages
    }

    const list = readCollectionList(await res.json())
    const userIds = new Set<number>()

    for (const item of list) {
      const collectionId = toPositiveInteger(item.id)
      if (collectionId) {
        pages.push({
          path: `/c/${collectionId}`,
          priority: 0.8,
          changefreq: 'weekly',
        })
      }

      const userId = toPositiveInteger(item.userId)
      if (userId) {
        userIds.add(userId)
      }
    }

    for (const userId of userIds) {
      pages.push({
        path: `/user/${userId}`,
        priority: 0.7,
        changefreq: 'weekly',
      })
    }

    console.warn(`Sitemap dynamic pages fetched: ${pages.length} URLs`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Sitemap dynamic pages skipped: ${message}`)
  }

  return pages
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
</urlset>`
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
