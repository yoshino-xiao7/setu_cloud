import { beforeEach, describe, expect, it, vi } from 'vitest'
import { musicClientHeader } from '@/api/musicClientRelease'
import http from '@/api/http'
import { musicHistoryApi, userMusicApi } from '@/api/music'
import { musicFlags } from '@/api/musicFlags'
import { usePlaylistDetail } from '@/composables/usePlaylistDetail'
import type { MessageApi } from 'naive-ui'
import { usesCanonicalHistory, pinCanonicalHistory } from '@/api/musicCohort'
import { admitPlaybackSession, resolveSongPlayback, resolveSongLyrics, musicV2Api } from '@/api/musicV2'
const state = vi.hoisted(() => ({ auth: { user: { id: 1 } as {id: number} | null } }))
vi.mock('@/api/http', () => ({ default: { get: vi.fn(), request: vi.fn(), post: vi.fn(), delete: vi.fn() }, clearHttpCache: vi.fn() }))
vi.mock('@/api/env', () => ({ API_BASE_URL: 'http://mock.local', USE_API_MOCKS: false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => state.auth }))
vi.mock('@/api/musicFlags', () => ({ musicFlags: { usesV2History: false, usesV2Playback: false, usesV2Lyrics: false } }))
const storage = new Map<string,string>()
vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key,value) })
const mutable = musicFlags as unknown as Record<string,boolean>
beforeEach(() => { vi.resetAllMocks(); vi.mocked(http.delete).mockResolvedValue({status:200,data:''}); state.auth.user = { id: state.auth.user!.id + 1 }; mutable.usesV2History = false; mutable.usesV2Playback = false; mutable.usesV2Lyrics = false })
describe('cutover routing and safe rollback', () => {
  it('loads standalone recommendations with validated source and no Home request', async () => {
    const source = { kind: 'sharedAlgorithmic', audience: 'shared', personalized: false, catalogSource: 'netease', ownerId: null, label: null }
    vi.mocked(http.get).mockResolvedValue({ data: { items: [], source } })
    expect((await musicV2Api.recommendedPlaylists()).items).toEqual([])
    expect(http.get).toHaveBeenCalledExactlyOnceWith('/user/music/v2/recommend/playlists', { params: { limit: 20 } })
    vi.mocked(http.get).mockResolvedValue({ data: { items: [], source: null } })
    await expect(musicV2Api.recommendedPlaylists()).rejects.toThrow()
  })
  it('keeps owned playlist management on retained legacy with detail cutover enabled', async () => {
    mutable.usesV2PlaylistDetail = true
    vi.mocked(http.get).mockResolvedValue({ data: { id: '123', name: 'owned', songs: [] } })
    const detail = usePlaylistDetail({ getPlaylistId: () => '123', message: {} as MessageApi, musicStore: { playPlaylist: vi.fn() } })
    await detail.loadPlaylist()
    expect(http.get).toHaveBeenCalledWith('/user/playlists/123', expect.anything())
    expect(detail.v2Playlist.value).toBeNull()
    expect(detail.memberships.value).toBeNull()
  })
  it('bounded release headers reject unsafe and oversized values', () => {
    expect(musicClientHeader('2.6.0','abc-123')).toBe('web:2.6.0:abc-123')
    for (const build of ['x\r\nCookie: secret','a'.repeat(41),'user@example.com','']) expect(musicClientHeader('2.6.0',build)).toBeUndefined()
  })
  it('false routes history, lyrics and retained hot/daily to legacy', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { lrc: { lyric: '[00:01]hello' } } })
    await musicHistoryApi.getHistory(); await musicHistoryApi.getCount(); await musicHistoryApi.clearHistory()
    await resolveSongLyrics('123'); await userMusicApi.getRecommendSongs()
    expect(vi.mocked(http.get).mock.calls.map(call => call[0])).toEqual(['/user/music/history?limit=20&offset=0','/user/music/history/count','/user/music/lyric','/user/music/recommend/songs'])
    expect(http.delete).toHaveBeenCalledWith('/user/music/history', expect.anything())
  })
  it('canonical history pin survives flag rollback and isolates owners', async () => {
    mutable.usesV2History = true
    vi.mocked(http.request).mockResolvedValue({status:204,data:''})
    await musicHistoryApi.addHistory({ songId:'netease:track:opaque', songName:'private', artistName:'private', duration:0 })
    mutable.usesV2History = false
    expect(usesCanonicalHistory()).toBe(true)
    await musicHistoryApi.clearHistory()
    expect(http.request).toHaveBeenLastCalledWith({method:'delete',url:'/user/music/v2/library/history'})
    state.auth.user = {id:10000}
    expect(usesCanonicalHistory()).toBe(false)
  })
  it('v2 history parses exact page and preserves opaque ID', async () => {
    pinCanonicalHistory()
    vi.mocked(http.get).mockResolvedValue({data:{items:[{ownerId:'setu:user:1',trackId:'netease:track:9007199254740993',lastPlayedAt:'2026-09-06T00:00:00Z',track:null}],offset:0,limit:20,total:1,hasMore:false,nextOffset:null}})
    expect((await musicHistoryApi.getHistory()).data[0].songId).toBe('netease:track:9007199254740993')
    expect(http.get).toHaveBeenCalledWith('/user/music/v2/library/history',{params:{limit:20,offset:0}})
  })
  it('admission denial blocks new playback with no URL fallback', async () => {
    mutable.usesV2Playback = true
    vi.mocked(http.get).mockResolvedValue({data:{version:1,admitNewPlaybackSession:false,validForSeconds:30}})
    await expect(resolveSongPlayback({id:'1'},'standard')).rejects.toThrow('暂未开放')
    expect(http.get).toHaveBeenCalledTimes(1)
  })
  it('missing/unknown protocol admission fails closed', async () => {
    for (const value of [{}, {version:2,admitNewPlaybackSession:true,validForSeconds:30}, {version:1,admitNewPlaybackSession:true,validForSeconds:31}]) {
      vi.mocked(http.get).mockResolvedValue({data:value})
      await expect(admitPlaybackSession()).rejects.toThrow()
    }
  })
})
