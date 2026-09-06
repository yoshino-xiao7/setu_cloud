import type { LyricResponse, MusicQuality, Song } from './music'
import type { HomeFeed, LikedTrack, Lyric, Membership, Page, Playback, Playlist, PlaylistDetail, SavedPlaylist, Track } from './musicV2Models'
import { observeMusic } from './musicObservation'
import http, { clearHttpCache } from './http'
import { userMusicApi } from './music'
import { pinCanonicalHistory } from './musicCohort'
import { musicFlags } from './musicFlags'
import { typedMusicID } from './musicIdentity'
import { parseLegacyLyrics, resolveLegacyPlayback } from './musicLegacy'
import { decodeHome, decodeMusic } from './musicV2Models'
import { unwrapApiData } from './response'

const base = '/user/music/v2'
const pathID = (id: string) => encodeURIComponent(id)
async function read<T>(path: string, schema: string, params?: Record<string, unknown>): Promise<T> {
  const response = await http.get(`${base}${path}`, { params })
  return decodeMusic<T>(schema, unwrapApiData(response))
}
async function mutation(method: 'put' | 'delete', path: string) {
  try {
    const response = await http.request({ method, url: `${base}${path}`, ...(method === 'put' ? { data: {} } : {}) })
    if (response.status !== 204 || (response.data !== '' && response.data !== undefined))
      throw new Error('音乐写入响应不完整，请刷新确认状态')
  }
  finally {
    clearHttpCache()
  }
}
export const musicV2Api = {
  recommendedPlaylists: () => read<{ items: Playlist[], source: { label: string | null, personalized: boolean } }>('/recommend/playlists', 'RecommendedPlaylists', { limit: 20 }),
  home: async (): Promise<HomeFeed> => decodeHome(unwrapApiData(await http.get(`${base}/home`))),
  rankings: () => read<{
    items: Playlist[]
    source: unknown
  }>('/rankings', 'Rankings'),
  playlist: (id: string) => read<PlaylistDetail>(`/playlists/${pathID(id)}`, 'PlaylistDetail'),
  memberships: (id: string, offset: number) => read<Page<Membership>>(`/playlists/${pathID(id)}/tracks`, 'MembershipPage', { offset, limit: 50 }),
  liked: (offset = 0) => read<Page<LikedTrack>>('/library/liked-tracks', 'LikedPage', { offset, limit: 20 }),
  saved: (offset = 0) => read<Page<SavedPlaylist>>('/library/favorite-playlists', 'SavedPage', { offset, limit: 20 }),
  like: (id: string, selected: boolean) => mutation(selected ? 'put' : 'delete', `/library/liked-tracks/${pathID(typedMusicID('track', id))}`),
  save: (id: string, selected: boolean) => mutation(selected ? 'put' : 'delete', `/library/favorite-playlists/${pathID(typedMusicID('playlist', id))}`),
  lyrics: (id: string) => read<Lyric>(`/tracks/${pathID(typedMusicID('track', id))}/lyrics`, 'Lyric'),
  search: async (query: string, offset: number, limit: number): Promise<Page<Track>> => {
    const data = await read<{
      sections: {
        scope: string
        status: string
        items?: Page<Track>
        error?: {
          message: string
        }
      }[]
    }>('/search', 'SearchResult', { keywords: query, scope: 'tracks', offset, limit })
    const section = data.sections.find(s => s.scope === 'tracks')
    if (section?.status !== 'loaded' || !section.items)
      throw new Error(section?.error?.message ?? '搜索暂不可用')
    return section.items
  },
  playback: async (id: string, level: MusicQuality): Promise<string> => {
    const trackId = typedMusicID('track', id)
    const response = await http.get(`${base}/tracks/${pathID(trackId)}/playback`, { params: { level, allowFallback: true }, headers: { 'X-Setu-Playback-Contract': '3.0.0' } })
    if (response.headers['x-setu-playback-contract'] !== '3.0.0')
      throw new Error('播放契约版本不匹配')
    const result = decodeMusic<Playback>('SinglePlaybackResult', unwrapApiData(response))
    if (result.kind === 'denied') {
      if (result.trackId !== trackId)
        throw new Error('播放资源不匹配')
      throw new Error(result.availability.reason ?? '该歌曲暂不可播放')
    }
    if (result.kind !== 'success')
      throw new Error('不支持的播放响应')
    const source = result.source
    const url = new URL(source.url)
    if (source.trackId !== trackId || source.requestedQuality !== level || 'expiresAt' in source || url.protocol !== 'https:' || url.username || url.password || url.hash || Date.parse(source.refreshAt) <= Date.now() || (source.sourceExpiresAt !== null && Date.parse(source.refreshAt) >= Date.parse(source.sourceExpiresAt)))
      throw new Error('播放资源或有效期无效')
    return source.url
  },
}
function legacyTrackID(id: string): string {
  if (!id.includes(':'))
    return id
  const typed = typedMusicID('track', id)
  return decodeURIComponent(typed.slice('netease:track:'.length))
}
export async function admitPlaybackSession() {
  const result = unwrapApiData<{ version: number; admitNewPlaybackSession: boolean; validForSeconds: number }>(
    await http.get('/user/music/rollout/capabilities', { headers: { 'Cache-Control': 'no-cache' } }))
  if (result?.version !== 1 || result.admitNewPlaybackSession !== true || !Number.isInteger(result.validForSeconds)
    || result.validForSeconds < 1 || result.validForSeconds > 30) throw new Error('当前版本暂未开放新的 v2 播放会话')
}
export async function resolveSongPlayback(song: Pick<Song, 'id'>, quality: MusicQuality, continuingCanonicalSession = false) {
  // A queue already using canonical IDs stays on v2 during rollback; it is never demoted to an integer.
  if (musicFlags.usesV2Playback || song.id.startsWith('netease:track:')) {
    if (!continuingCanonicalSession) await admitPlaybackSession()
    pinCanonicalHistory()
    return musicV2Api.playback(song.id, quality)
  }
  return resolveLegacyPlayback(await userMusicApi.getUrl(legacyTrackID(song.id), quality))
}
export async function resolveSongLyrics(id: string) {
  if (!musicFlags.usesV2Lyrics) {
    const data = unwrapApiData<LyricResponse>(await userMusicApi.getLyric(legacyTrackID(id)))
    observeMusic(data?.lrc?.lyric ? 'lyrics.line' : 'lyrics.none', false)
    const translations = new Map(parseLegacyLyrics(data?.tlyric?.lyric ?? '').map(line => [line.time, line.text]))
    return parseLegacyLyrics(data?.lrc?.lyric ?? '').map(line => ({ ...line, translation: translations.get(line.time) ?? null }))
  }
  const data = await musicV2Api.lyrics(id)
  if (data.trackId !== typedMusicID('track', id))
    throw new Error('歌词资源不匹配')
  if (!['none', 'plain', 'line', 'word'].includes(data.kind))
    throw new Error('暂不支持此歌词格式')
  if (['none', 'plain', 'line', 'word'].includes(data.kind)) observeMusic(`lyrics.${data.kind}` as 'lyrics.line', true)
  return data.lines.map(line => ({ time: (line.startMs ?? 0) / 1000, text: line.text, translation: line.translation, seekable: line.startMs !== null }))
}
