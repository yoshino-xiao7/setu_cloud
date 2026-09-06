import { afterEach, expect, it, vi } from 'vitest'
import { musicRehearsalProxy } from '../../scripts/musicRehearsalProxy'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
it('production cannot activate rehearsal flags', async () => {
  vi.stubEnv('MODE', 'production'); vi.stubEnv('VITE_MUSIC_REHEARSAL_FLAGS', 'usesV2Playback')
  const { musicFlags } = await import('@/api/musicFlags')
  expect(Object.values(musicFlags).every(value => !value)).toBe(true)
})
it('real rehearsal enables only its approved batch, retaining R2', async () => {
  vi.stubEnv('MODE', 'rehearsal'); vi.stubEnv('VITE_API_BASE_URL', 'https://api.yukiryou.icu')
  vi.stubEnv('VITE_USE_API_MOCKS', 'false'); vi.stubEnv('VITE_MUSIC_REHEARSAL_FLAGS', 'usesV2History,usesV2Playback')
  const { musicFlags } = await import('@/api/musicFlags')
  expect(musicFlags.usesV2History).toBe(true); expect(musicFlags.usesV2Playback).toBe(true)
  expect(musicFlags.usesV2Home).toBe(false); expect(musicFlags.rankingsEnabled).toBe(false)
})
it('rehearsal rejects mock traffic and unsupported flags', async () => {
  vi.stubEnv('MODE', 'rehearsal'); vi.stubEnv('VITE_API_BASE_URL', 'https://api.yukiryou.icu')
  vi.stubEnv('VITE_USE_API_MOCKS', 'true')
  await expect(import('@/api/musicFlags')).rejects.toThrow('Invalid development')
  vi.resetModules(); vi.stubEnv('VITE_USE_API_MOCKS', 'false'); vi.stubEnv('VITE_MUSIC_REHEARSAL_FLAGS', 'rankingsEnabled')
  await expect(import('@/api/musicFlags')).rejects.toThrow('Invalid development')
})
it('supports same-origin real rehearsal without altering the signed upstream path', async () => {
  const base = 'http://127.0.0.1:5173/__music-rehearsal-api'
  vi.stubEnv('MODE', 'rehearsal'); vi.stubEnv('VITE_API_BASE_URL', base)
  vi.stubEnv('VITE_USE_API_MOCKS', 'false'); vi.stubEnv('VITE_MUSIC_REHEARSAL_FLAGS', 'usesV2Playback')
  const { musicFlags } = await import('@/api/musicFlags')
  expect(musicFlags.usesV2Playback).toBe(true)
  const proxy = Object.values(musicRehearsalProxy('rehearsal')!)[0]!
  expect(proxy.target).toBe('https://api.yukiryou.icu')
  expect(proxy.secure).toBe(true)
  expect(proxy.rewrite!('/__music-rehearsal-api/user/info')).toBe('/user/info')
  expect(new URL('/user/info', base).pathname).toBe('/user/info')
  expect(musicRehearsalProxy('production')).toBeUndefined()
  expect(musicRehearsalProxy('development')).toBeUndefined()
})
