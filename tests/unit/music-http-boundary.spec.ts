import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import http from '@/api/http'
import { observeMusic } from '@/api/musicObservation'

const state = vi.hoisted(() => ({ auth: { user: null as { id: number } | null, clearLocalState: vi.fn() } }))
vi.mock('@/api/env', () => ({ API_BASE_URL: 'https://api.example.test', USE_API_MOCKS: false }))
vi.mock('@/api/musicClientRelease', () => ({ musicReleaseHeader: 'web:2.6.1:test' }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => state.auth }))
vi.mock('pinia', () => ({ getActivePinia: () => ({}) }))
vi.mock('@/router', () => ({ getRouter: vi.fn() }))
vi.mock('@/utils/navigation', () => ({ safeReplace: vi.fn() }))

beforeEach(() => {
  state.auth.user = null
  state.auth.clearLocalState.mockClear()
  vi.stubGlobal('window', { location: { origin: 'https://cloud.example.test' }, dispatchEvent: vi.fn() })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('music HTTP browser boundary', () => {
  it('does not send background music events with default transport flags', () => {
    state.auth.user = { id: 1 }
    const post = vi.spyOn(http, 'post').mockResolvedValue({})
    observeMusic('session', false)
    observeMusic('client.exception', false)
    expect(post).not.toHaveBeenCalled()
  })

  it.each(['/user/music/history?limit=20&offset=0', '/user/music/history/count', '/user/music/search', '/user/playlists', '/user/playlists/123', '/user/usage/overview'])('keeps legacy/dashboard request %s compatible with deployed CORS', async (url) => {
    let headers = new AxiosHeaders()
    await http.get(url, { adapter: async config => {
      headers = AxiosHeaders.from(config.headers)
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    } })
    expect(headers.has('X-Setu-Client')).toBe(false)
    expect(headers.has('X-Request-Id')).toBe(true)
  })

  it('retains attribution on explicit v2 requests', async () => {
    await http.get('/user/music/v2/home', { adapter: async config => {
      expect(config.headers.get('X-Setu-Client')).toBe('web:2.6.1:test')
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    } })
  })

  it.each([0, 401, 503])('keeps observation failure %s out of global user error handling', async (status) => {
    await expect(http.post('/user/music/rollout/events', {}, { adapter: async config => {
      throw new AxiosError('failed', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config, {},
        status ? { data: {}, status, statusText: 'failed', headers: {}, config } : undefined)
    } })).rejects.toThrow('failed')
    expect(window.dispatchEvent).not.toHaveBeenCalled()
    expect(state.auth.clearLocalState).not.toHaveBeenCalled()
  })
})
