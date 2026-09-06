import { beforeEach, describe, expect, it, vi } from 'vitest'
import http, { clearHttpCache } from '@/api/http'
import { userPlaylistApi } from '@/api/music'
import { musicV2Api, resolveSongLyrics } from '@/api/musicV2'

vi.mock('@/api/http', () => ({ default: { get: vi.fn(), request: vi.fn(), delete: vi.fn() }, clearHttpCache: vi.fn() }))
vi.mock('@/api/musicFlags', () => ({ musicFlags: { usesV2Playback: true, usesV2Lyrics: true } }))
const id = 'netease:track:9007199254740993'
const response = () => ({ status: 200, headers: { 'x-setu-playback-contract': '3.0.0' }, data: { kind: 'success', source: { trackId: id, url: 'https://cdn.example.test/song.mp3', requestedQuality: 'standard', actualQuality: null, refreshAt: new Date(Date.now() + 60000).toISOString(), sourceExpiresAt: null, bitrate: null, sizeBytes: null, format: null, notice: null } } })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(http.delete).mockResolvedValue({ status: 200, data: '移除成功',
  })
})
describe('p17 API boundary', () => {
  it('never routes a provider playlist to local play-count mutations', () => {
    expect(() => userPlaylistApi.recordPlay('netease:playlist:9007199254741993')).toThrow('本地资源')
    expect(http.request).not.toHaveBeenCalled()
  })
  it('degrades word lyrics to authoritative row text and retains translation', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { trackId: id, kind: 'word', hasTranslation: true, contributors: [], lines: [{ text: 'A quiet melody', translation: '一段安静的旋律', startMs: 0, durationMs: 3000, words: [{ text: 'A', startMs: 0, durationMs: 1000 }, { text: 'quiet melody', startMs: 1000, durationMs: 2000 }] }] } })
    expect(await resolveSongLyrics(id)).toEqual([{ time: 0, text: 'A quiet melody', translation: '一段安静的旋律', seekable: true }])
  })
  it('negotiates Contract 3.0 with unknown provider expiry and no derived TTL', async () => {
    vi.mocked(http.get).mockResolvedValue(response())
    expect(await musicV2Api.playback(id, 'standard')).toBe('https://cdn.example.test/song.mp3')
    expect(http.get).toHaveBeenCalledWith(`/user/music/v2/tracks/${encodeURIComponent(id)}/playback`, expect.objectContaining({ headers: { 'X-Setu-Playback-Contract': '3.0.0' } }))
  })
  it.each(['echo', 'identity', 'refresh', 'legacy', 'url'])('rejects invalid playback %s without legacy fallback', async (fault) => {
    const res = response()
    if (fault === 'echo')
      res.headers['x-setu-playback-contract'] = '2.0.0'
    if (fault === 'identity')
      res.data.source.trackId = 'netease:track:other'
    if (fault === 'refresh')
      res.data.source.refreshAt = '2000-01-01T00:00:00Z'
    if (fault === 'legacy')
      Object.assign(res.data.source, { expiresAt: res.data.source.refreshAt })
    if (fault === 'url')
      res.data.source.url = 'https://user:pass@cdn.example.test/song.mp3'
    vi.mocked(http.get).mockResolvedValue(res)
    await expect(musicV2Api.playback(id, 'standard')).rejects.toThrow()
    expect(http.get).toHaveBeenCalledTimes(1)
  })
  it('renders denied availability rather than guessing a playable source', async () => {
    vi.mocked(http.get).mockResolvedValue({ ...response(), data: { kind: 'denied', trackId: id, availability: { status: 'trialOnly', reason: '仅支持试听', maxQuality: null } } })
    await expect(musicV2Api.playback(id, 'standard')).rejects.toThrow('仅支持试听')
  })
  it('deletes the exact membership ID from the owning local playlist', async () => {
    await userPlaylistApi.removeSongFromPlaylist('setu:playlist:1', 'setu:playlistMembership:9007199254750001')
    expect(http.delete).toHaveBeenCalledWith('/user/playlists/1/songs/9007199254750001', expect.any(Object))
    expect(() => userPlaylistApi.removeSongFromPlaylist('setu:playlist:1', id)).toThrow()
  })
  it('accepts only empty 204 writes and always invalidates cache', async () => {
    vi.mocked(http.request).mockResolvedValue({ status: 204, data: '' })
    await musicV2Api.like(id, true)
    expect(clearHttpCache).toHaveBeenCalledTimes(1)
    vi.mocked(http.request).mockResolvedValue({ status: 200, data: {} })
    await expect(musicV2Api.like(id, false)).rejects.toThrow('刷新确认')
    expect(clearHttpCache).toHaveBeenCalledTimes(2)
  })
})
