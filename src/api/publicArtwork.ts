import type { SetuImageItem } from '@/api/setu'
import { fetchPublicBlogSetu } from '@/api/blogPublic'

export interface PublicArtwork {
  url: string
  title: string
  author: string
}

interface CachedArtwork {
  artwork: PublicArtwork
  expiresAt: number
}

const storageKey = 'yike-public-artwork-v1'
const cache = new Map<number, CachedArtwork>()
let queue: Promise<unknown> = Promise.resolve()
let retryAfter = 0
let restored = false

function validUrl(value: unknown): value is string {
  if (typeof value !== 'string')
    return false
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol)
  }
  catch {
    return false
  }
}

export function selectPublicArtwork(items: SetuImageItem[]): PublicArtwork | undefined {
  for (const item of items) {
    if (!item || Number(item.r18) !== 0)
      continue
    const url = [item.urls?.regular, item.urlRegular, item.urls?.original, item.urlOriginal, item.url].find(validUrl)
    if (url)
      return { url, title: typeof item.title === 'string' ? item.title : '精选作品', author: typeof item.author === 'string' ? item.author : '' }
  }
}

function restoreCache() {
  if (restored || typeof window === 'undefined')
    return
  restored = true
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(saved))
      return
    for (const entry of saved) {
      if (!Array.isArray(entry) || entry.length !== 2)
        continue
      const [index, value] = entry
      if (Number.isInteger(index) && index >= 0 && index < 4 && value?.expiresAt > Date.now()
        && validUrl(value.artwork?.url) && typeof value.artwork.title === 'string' && typeof value.artwork.author === 'string') {
        cache.set(index, value)
      }
    }
  }
  catch { /* Storage can be unavailable in private browsing. */ }
}

export function loadPublicArtwork(index: number): Promise<PublicArtwork> {
  if (!Number.isInteger(index) || index < 0 || index > 3)
    return Promise.reject(new Error('Unknown artwork slot'))
  restoreCache()
  // Serialize the four slots and reuse them across public routes to respect the API budget.
  const result = queue.then(async () => {
    const cached = cache.get(index)
    if (cached && cached.expiresAt > Date.now())
      return cached.artwork
    if (Date.now() < retryAfter)
      throw new Error('图片服务暂时不可用，请稍后重试')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    try {
      const artwork = selectPublicArtwork(await fetchPublicBlogSetu(controller.signal))
      if (!artwork)
        throw new Error('暂无可展示的图片')
      cache.set(index, { artwork, expiresAt: Date.now() + 5 * 60 * 1000 })
      try {
        sessionStorage.setItem(storageKey, JSON.stringify([...cache]))
      }
      catch { /* Keep the in-memory cache when storage is unavailable. */ }
      return artwork
    }
    catch (error) {
      retryAfter = Date.now() + 60000
      throw error
    }
    finally {
      clearTimeout(timeout)
    }
  })
  queue = result.catch(() => undefined)
  return result
}
