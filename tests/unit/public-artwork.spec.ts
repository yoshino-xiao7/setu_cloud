import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPublicBlogSetu } from '@/api/blogPublic'

vi.mock('@/api/blogPublic', () => ({ fetchPublicBlogSetu: vi.fn() }))

const image = { pid: 1, p: 0, uid: 2, title: '作品', author: '作者', r18: 0, width: 1200, height: 800, urls: { regular: 'https://images.example.test/art.jpg' } }

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  const storage = new Map<string, string>()
  vi.stubGlobal('window', {})
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('public artwork loading', () => {
  it('shares a pending slot across homepage and account page requests', async () => {
    const { loadPublicArtwork } = await import('@/api/publicArtwork')
    vi.mocked(fetchPublicBlogSetu).mockResolvedValue([image])
    const results = await Promise.all([loadPublicArtwork(0), loadPublicArtwork(0)])
    expect(fetchPublicBlogSetu).toHaveBeenCalledTimes(1)
    expect(results[0]).toEqual({ url: image.urls.regular, title: '作品', author: '作者' })
    expect(results[1]).toEqual(results[0])
  })

  it('reuses session artwork after a full page reload', async () => {
    const first = await import('@/api/publicArtwork')
    vi.mocked(fetchPublicBlogSetu).mockResolvedValue([image])
    await first.loadPublicArtwork(0)
    vi.resetModules()
    const reloaded = await import('@/api/publicArtwork')
    await reloaded.loadPublicArtwork(0)
    expect(fetchPublicBlogSetu).toHaveBeenCalledTimes(1)
  })

  it('stops queued slots when the public endpoint rejects a request', async () => {
    const { loadPublicArtwork } = await import('@/api/publicArtwork')
    vi.mocked(fetchPublicBlogSetu).mockRejectedValue(new Error('403'))
    const results = await Promise.allSettled([0, 1, 2, 3].map(loadPublicArtwork))
    expect(results.every(result => result.status === 'rejected')).toBe(true)
    expect(fetchPublicBlogSetu).toHaveBeenCalledTimes(1)
  })

  it('skips restricted and unusable entries before selecting a public image', async () => {
    const { selectPublicArtwork } = await import('@/api/publicArtwork')
    expect(selectPublicArtwork([
      { ...image, r18: 1 },
      { ...image, urls: { regular: 'javascript:alert(1)' } },
      image,
    ])?.url).toBe(image.urls.regular)
    expect(selectPublicArtwork([])).toBeUndefined()
  })

  it('bounds an unresponsive request and releases queued callers', async () => {
    vi.useFakeTimers()
    const { loadPublicArtwork } = await import('@/api/publicArtwork')
    vi.mocked(fetchPublicBlogSetu).mockImplementation(signal => new Promise((_, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true })
    }))
    const results = Promise.allSettled([loadPublicArtwork(0), loadPublicArtwork(1)])
    await vi.advanceTimersByTimeAsync(12001)
    expect((await results).every(result => result.status === 'rejected')).toBe(true)
    expect(fetchPublicBlogSetu).toHaveBeenCalledTimes(1)
  })
})
