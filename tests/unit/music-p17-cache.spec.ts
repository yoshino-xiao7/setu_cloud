import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import http, { clearHttpCache } from '@/api/http'

const fixture = vi.hoisted(() => ({ auth: { user: { id: 1 } as {
  id: number
} | null } }))
vi.mock('@/api/env', () => ({ API_BASE_URL: 'http://mock.local', USE_API_MOCKS: false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => fixture.auth }))
vi.mock('@/router', () => ({ getRouter: vi.fn() }))
vi.mock('@/api/requestLifecycle', () => ({ registerRouteAbortHandler: vi.fn() }))
vi.stubGlobal('window', { location: { origin: 'http://mock.local' }, dispatchEvent: vi.fn() })
vi.stubGlobal('sessionStorage', { getItem: () => 'mock-test-only-secret' })
const response = (config: InternalAxiosRequestConfig) => ({ data: { items: [{ name: 'original' }] }, status: 200, statusText: 'OK', headers: {}, config })
beforeEach(() => {
  clearHttpCache()
  fixture.auth.user = { id: 1,
  }
  vi.useRealTimers()
})
describe('p17 HTTP music cache', () => {
  it('reuses cloned responses for 60 seconds and separates users', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config))
    const url = '/user/music/v2/home'
    const first = await http.get(url, { adapter })
    first.data.items[0].name = 'changed'
    expect((await http.get(url, { adapter })).data.items[0].name).toBe('original')
    expect(adapter).toHaveBeenCalledTimes(1)
    fixture.auth.user = { id: 2 }
    await http.get(url, { adapter })
    expect(adapter).toHaveBeenCalledTimes(2)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000)
    await http.get(url, { adapter })
    expect(adapter).toHaveBeenCalledTimes(3)
    vi.restoreAllMocks()
  })
  it('never caches playback or FM and separates offsets', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config))
    for (const url of ['/user/music/v2/tracks/x/playback', '/user/music/v2/radio']) {
      await http.get(url, { adapter })
      await http.get(url, { adapter })
    }
    await http.get('/user/music/v2/library/liked-tracks', { adapter, params: { offset: 0 } })
    await http.get('/user/music/v2/library/liked-tracks', { adapter, params: { offset: 20 } })
    expect(adapter).toHaveBeenCalledTimes(6)
  })
  it('does not repopulate invalidated cache from an in-flight response', async () => {
    let release!: () => void
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      await new Promise<void>((resolve) => {
        release = resolve
        started()
      })
      return response(config)
    })
    const first = http.get('/user/music/v2/home', { adapter })
    await ready
    clearHttpCache()
    release()
    await first
    const nextAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config))
    await http.get('/user/music/v2/home', { adapter: nextAdapter })
    expect(nextAdapter).toHaveBeenCalledTimes(1)
  })
})
