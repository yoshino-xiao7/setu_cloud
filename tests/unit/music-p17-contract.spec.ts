import type { InternalAxiosRequestConfig } from 'axios'
import { AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { realMusicFlags } from '@/api/musicFlags'
import { legacyMusicID, normalizeMusicIDs, parseMusicJSON, typedMusicID } from '@/api/musicIdentity'
import { decodeHome, decodeMusic } from '@/api/musicV2Models'
import { createMockAdapter } from '../../mocks/api-mock'

vi.mock('@/api/env', () => ({ USE_API_MOCKS: false }))
vi.stubGlobal('window', { setTimeout: (fn: () => void) => {
  fn()
  return 0
}, location: { origin: 'http://mock.local',
} })
const adapter = createMockAdapter(async () => {
  throw new Error('Unexpected real request')
})
async function get(path: string, params = {}) {
  const res = await adapter({ url: path, method: 'get', baseURL: 'http://mock.local', params, headers: new AxiosHeaders({ 'X-Setu-Playback-Contract': '3.0.0' }) } as InternalAxiosRequestConfig)
  return res.data
}
describe('p17 music contracts', () => {
  it('preserves large legacy identity tokens before numeric conversion', () => {
    expect(parseMusicJSON('{"id":9007199254740993,"songId":9007199254740995,"duration":180000}')).toEqual({ id: '9007199254740993', songId: '9007199254740995', duration: 180000 })
  })
  it('migrates safe old storage numbers and rejects already damaged IDs', () => {
    expect(normalizeMusicIDs({ id: 123, artists: [{ id: 4 }], duration: 5 })).toEqual({ id: '123', artists: [{ id: '4' }], duration: 5 })
    expect(() => normalizeMusicIDs({ id: 9007199254740992 })).toThrow('丢失精度')
  })
  it('keeps relation and resource identities distinct at the legacy boundary', () => {
    expect(legacyMusicID('setu:playlistMembership:9007199254750001', 'playlistMembership')).toBe('9007199254750001')
    expect(() => legacyMusicID('netease:track:9007199254740993', 'playlistMembership')).toThrow()
    expect(typedMusicID('track', '9007199254740993')).toBe('netease:track:9007199254740993')
  })
  it('keeps every real cutover disabled', () => {
    expect(Object.values(realMusicFlags).every(value => value === false)).toBe(true)
  })
  it('skips unknown Home sections but rejects malformed known sections', async () => {
    const feed = structuredClone(await get('/user/music/v2/home'))
    expect(decodeHome(feed).sections).toHaveLength(3)
    feed.sections[1].items[0].track.artists = []
    expect(() => decodeHome(feed)).toThrow()
  })
  it.each([
    ['/user/music/v2/rankings', 'Rankings'],
    ['/user/music/v2/playlists/setu%3Aplaylist%3A1', 'PlaylistDetail'],
    ['/user/music/v2/playlists/netease%3Aplaylist%3A9007199254741993', 'PlaylistDetail'],
    ['/user/music/v2/library/liked-tracks', 'LikedPage'],
    ['/user/music/v2/library/favorite-playlists', 'SavedPage'],
    ['/user/music/v2/tracks/netease%3Atrack%3A9007199254740993/lyrics', 'Lyric'],
    ['/user/music/v2/tracks/netease%3Atrack%3A9007199254740993/playback', 'SinglePlaybackResult'],
    ['/user/music/v2/search', 'SearchResult'],
  ])('validates mock response %s against the production reader', async (path, schema) => {
    const value = await get(path, { keywords: 'test' })
    expect(decodeMusic(schema, value)).toEqual(value)
  })
  it('keeps required-nullable fields required', async () => {
    const data = await get('/user/music/v2/tracks/netease%3Atrack%3A9007199254740993/playback')
    delete data.source.sourceExpiresAt
    expect(() => decodeMusic('SinglePlaybackResult', data)).toThrow()
  })
})
