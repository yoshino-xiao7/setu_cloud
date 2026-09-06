import type { AxiosResponse } from 'axios'
import http, { clearHttpCache } from '@/api/http'
import { usesCanonicalHistory, pinCanonicalHistory } from './musicCohort'
import { musicFlags } from './musicFlags'
import { decodeMusic } from './musicV2Models'
import type { Track } from './musicV2Models'
import { unwrapApiData } from './response'
import { typedMusicID } from './musicIdentity'
import { parseMusicJSON, providerMusicID, legacyMusicID } from './musicIdentity'

function legacyMusicResponse(data: unknown): unknown {
  return typeof data === 'string' && !/^[\s]*(?:[\[{]|-?\d|true\b|false\b|null\b)/.test(data) ? data : parseMusicJSON(data)
}

const musicHttp = {
  get: <T>(url: string, config: Parameters<typeof http.get>[1] = {}) => http.get<T>(url, { ...config, transformResponse: [legacyMusicResponse] }),
  post: <T>(url: string, data?: unknown) => http.post<T>(url, data, { transformResponse: [legacyMusicResponse] }).finally(clearHttpCache),
  put: <T>(url: string, data?: unknown) => http.put<T>(url, data, { transformResponse: [legacyMusicResponse] }).finally(clearHttpCache),
  delete: <T>(url: string) => http.delete<T>(url, { transformResponse: [legacyMusicResponse] }).finally(clearHttpCache),
}

// =======================
// 类型定义
// =======================

/** 网易云 Token */
export interface NeteaseToken {
  id: string
  cookie: string
  nickname: string
  status: 0 | 1 // 0=禁用 1=启用
  createdAt: string
  updatedAt: string
}

export type MusicQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires'
export type Playability = 'FULL' | 'TRIAL' | 'UNAVAILABLE' | 'LOGIN_INVALID'

interface MusicPlayabilityInfo {
  playability?: Playability
  fullPlayable?: boolean
  trial?: boolean
  playabilityReason?: string
  message?: string
  msg?: string
}

export interface MusicUrlItem extends MusicPlayabilityInfo {
  id: string
  url: string | null
  trialUrl?: string | null
  level?: string
  size?: number
}

/** 歌曲信息 */
export interface Song {
  id: string
  name: string
  artists: Artist[]
  album: Album
  duration: number
  url?: string
  originalUrl?: string // ✅ 原始 HTTP URL，用于 HTTPS 失败时降级
  picUrl?: string
  mv?: string // ✅ MV ID，0 表示没有 MV
}

export interface Artist {
  id: string
  name: string
}

export interface Album {
  id: string
  name: string
  picUrl?: string
}

/** 歌词行 */
export interface LyricLine {
  time: number
  text: string
  translation?: string | null
  seekable?: boolean
}

/** 搜索结果 */
export interface SearchResult {
  result: {
    songs: Song[]
    songCount: number
  }
}

/** 音乐URL响应 */
export interface MusicUrlResponse extends MusicPlayabilityInfo {
  code?: number
  data?: MusicUrlItem[]
}

export interface NeteasePlaybackProbe {
  skipped?: boolean
  songId?: string
  level?: string
  playability?: Playability
  fullPlayable?: boolean
  trial?: boolean
  reason?: string
  neteaseCode?: number
  fee?: number
  payed?: number
  requestedLevel?: string
  effectiveLevel?: string
  urlAvailable?: boolean
  trialUrlAvailable?: boolean
}

export interface NeteaseTokenCheckResult {
  tokenId: string
  nickname?: string
  status?: 0 | 1
  cookieValid: boolean
  account?: {
    code?: number
    userId?: string
    nickname?: string
    avatarUrl?: string
    profileVipType?: number
    accountId?: string
    accountVipType?: number
  }
  vip?: boolean
  vipType?: number
  accountVipType?: number
  profileVipType?: number
  playbackProbe?: NeteasePlaybackProbe
}

/** 歌词响应 */
export interface LyricResponse {
  lrc: {
    lyric: string
  }
  tlyric?: {
    lyric: string
  }
}

/** 推荐歌单（网易云） */
export interface Playlist {
  id: string
  name: string
  picUrl: string
  playCount: number
  description?: string
}

/** ✅ 热门搜索项 */
export interface HotSearchItem {
  first: string // 搜索词
  second: number // 热度/搜索次数
  third: null
  iconType: number
}

/** ✅ 热门搜索响应 */
export interface HotSearchResponse {
  code: number
  result: {
    hots: HotSearchItem[]
  }
}

/** ✅ MV 详情 */
export interface MvDetail {
  id: string
  name: string
  artistId: string
  artistName: string
  briefDesc?: string
  desc?: string
  cover: string
  coverId: string
  playCount: number
  subCount: number
  shareCount: number
  commentCount: number
  duration: number
  publishTime: string
  brs: Array<{
    size: number
    br: number
    point: number
  }>
  artists: Array<{
    id: string
    name: string
    img1v1Url?: string
  }>
}

/** ✅ MV 播放地址 */
export interface MvUrl {
  id: string
  url: string
  r: number
  size: number
  md5?: string
  duration?: number
  br: number
  depth?: number
  encodeType?: string
  type?: string
  expi?: number
  fee?: number
}

/** ✅ MV 详情响应 */
export interface MvDetailResponse {
  code: number
  data: MvDetail
}

/** ✅ MV URL 响应 */
export interface MvUrlResponse {
  code: number
  data: MvUrl | MvUrl[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function getResponseBody(response: unknown): unknown {
  if (!isRecord(response))
    return response

  if ('response' in response && isRecord(response.response)) {
    return getResponseBody(response.response)
  }

  const maybeAxiosResponse = response as Partial<AxiosResponse<unknown>>
  if ('data' in response && ('status' in response || 'headers' in response || 'config' in response)) {
    return maybeAxiosResponse.data
  }

  return response
}

export function getMusicUrlItem(response: unknown): MusicUrlItem | null {
  const body = getResponseBody(response)
  if (!isRecord(body))
    return null

  if (Array.isArray(body.data)) {
    const item = body.data[0]
    return isRecord(item) ? item as unknown as MusicUrlItem : null
  }

  if ('url' in body || 'playability' in body || 'fullPlayable' in body) {
    return body as unknown as MusicUrlItem
  }

  return null
}

export function getMusicPlayabilityInfo(response: unknown): MusicPlayabilityInfo | null {
  const item = getMusicUrlItem(response)
  if (item)
    return item

  const body = getResponseBody(response)
  if (!isRecord(body))
    return null

  if ('playability' in body || 'fullPlayable' in body || 'playabilityReason' in body) {
    return body as MusicPlayabilityInfo
  }

  return null
}

// =====================
// ✅ 用户自定义歌单类型
// =====================

/** 用户歌单 */
export interface UserPlaylist {
  id: string
  userId: string
  name: string
  description?: string
  coverUrl?: string
  isPublic: 0 | 1
  playMode: 'sequence' | 'random' | 'loop' | 'single'
  songCount: number
  playCount: number
  createdAt: string
  updatedAt: string
  songs?: PlaylistSong[]
}

/** 歌单中的歌曲 */
export interface PlaylistSong {
  id: string
  songId: string
  songName: string
  artistName: string
  albumName?: string
  coverUrl?: string
  duration: number
  sortOrder: number
  createdAt: string
}

/** 创建歌单 DTO */
export interface CreatePlaylistDto {
  name: string
  description?: string
  coverUrl?: string
  isPublic?: 0 | 1
}

/** 添加歌曲到歌单 DTO */
export interface AddSongToPlaylistDto {
  songId: string
  songName: string
  artistName: string
  albumName?: string
  coverUrl?: string
  duration: number
}

// =======================
// 管理员接口
// =======================

export const adminMusicApi = {
  /** 获取所有 Token */
  getTokens: () =>
    musicHttp.get<NeteaseToken[]>('/admin/netease/tokens'),

  /** 添加 Token */
  addToken: (data: { cookie: string, nickname: string }) =>
    musicHttp.post<string>('/admin/netease/tokens', data),

  /** 更新 Token */
  updateToken: (id: string, data: { cookie?: string, nickname?: string, status?: 0 | 1 }) =>
    musicHttp.put<string>(`/admin/netease/tokens/${id}`, data),

  /** 删除 Token */
  deleteToken: (id: string) =>
    musicHttp.delete<string>(`/admin/netease/tokens/${id}`),

  /** 检查 Token 登录态和指定 VIP 歌曲完整可播性 */
  checkToken: (id: string, params?: { probeSongId?: string, level?: MusicQuality }) =>
    musicHttp.get<NeteaseTokenCheckResult>(`/admin/netease/tokens/${id}/check`, { params }),
}

// =======================
// 用户接口
// =======================

export const userMusicApi = {
  /** 搜索音乐 */
  search: (keywords: string, limit = 10, offset = 0) => // ✅ 添加 offset 参数
    musicHttp.get<SearchResult>('/user/music/search', { params: { keywords, limit, offset } }),

  /** 获取播放地址 */
  getUrl: (id: string, level: MusicQuality = 'standard') => // ✅ 添加 hires
    musicHttp.get<MusicUrlResponse>('/user/music/url', { params: { id, level } }),

  /** 获取歌词 */
  getLyric: (id: string) =>
    musicHttp.get<LyricResponse>('/user/music/lyric', { params: { id } }),

  /** ✅ 获取热门搜索 */
  getHotSearch: () =>
    musicHttp.get<HotSearchResponse>('/user/music/search/hot'),

  /** ✅ 获取 MV 详情 */
  getMvDetail: (mvid: string) =>
    musicHttp.get<MvDetailResponse>('/user/music/mv/detail', { params: { mvid: providerMusicID(mvid, 'mv') } }),

  /** ✅ 获取 MV 播放地址 */
  getMvUrl: (id: string, r?: number) =>
    musicHttp.get<MvUrlResponse>('/user/music/mv/url', { params: { id: providerMusicID(id, 'mv'), r } }),

  /** 获取推荐歌单 */
  getPersonalized: (limit = 10) =>
    musicHttp.get<{ result: Playlist[] }>('/user/music/personalized', { params: { limit } }),

  /** 获取推荐新音乐 */
  getNewSong: () =>
    musicHttp.get<{ result: Song[] }>('/user/music/personalized/newsong'),

  /** 获取每日推荐歌曲 */
  getRecommendSongs: () =>
    musicHttp.get<{ data: { dailySongs: Song[] } }>('/user/music/recommend/songs'),

  /** 获取歌单详情 */
  getPlaylistDetail: (id: string, limit = 100) =>
    musicHttp.get<{ songs: Song[] }>('/user/music/playlist/track/all', { params: { id, limit } }),
}

// =====================
// ✅ 用户歌单管理接口
// =====================

export const userPlaylistApi = {
  /** 获取我的所有歌单 */
  getMyPlaylists: () =>
    musicHttp.get<UserPlaylist[]>('/user/playlists'),

  /** 获取歌单详情 */
  getPlaylistById: (id: string) =>
    musicHttp.get<UserPlaylist>(`/user/playlists/${id}`),

  /** 创建歌单 */
  createPlaylist: (data: CreatePlaylistDto) =>
    musicHttp.post<UserPlaylist>('/user/playlists', data),

  /** 修改歌单 ✨ */
  updatePlaylist: (id: string, data: Partial<CreatePlaylistDto>) =>
    musicHttp.put<UserPlaylist>(`/user/playlists/${id}`, data),

  /** 添加歌曲到歌单 */
  addSongToPlaylist: (playlistId: string, data: AddSongToPlaylistDto) =>
    musicHttp.post<string>(`/user/playlists/${playlistId}/songs`, { ...data, songId: providerMusicID(data.songId, 'track') }),

  /** 从歌单移除歌曲 */
  removeSongFromPlaylist: (playlistId: string, relationId: string) =>
    musicHttp.delete<string>(`/user/playlists/${legacyMusicID(playlistId, 'playlist')}/songs/${legacyMusicID(relationId, 'playlistMembership')}`),

  /** 更新播放模式 */
  updatePlayMode: (playlistId: string, playMode: 'sequence' | 'random' | 'loop' | 'single') =>
    musicHttp.put<string>(`/user/playlists/${playlistId}/play-mode`, { playMode }),

  /** 删除歌单 */
  deletePlaylist: (id: string) =>
    musicHttp.delete<string>(`/user/playlists/${id}`),

  /** 记录播放 */
  recordPlay: (id: string) =>
    musicHttp.post<string>(`/user/playlists/${legacyMusicID(id, 'playlist')}/play`),
}

// =====================
// ✅ 播放历史相关类型
// =====================

/** 播放历史记录 */
export interface MusicHistoryRecord {
  id: string
  userId: string
  songId: string
  songName: string
  artistName: string
  albumName?: string
  coverUrl?: string
  duration: number
  playTime: string // ✅ 后端返回的是 playTime 不是 playedAt
}

/** 添加播放历史 DTO */
export interface AddMusicHistoryDto {
  songId: string
  songName: string
  artistName: string
  albumName?: string
  coverUrl?: string
  duration: number
}

// =====================
// ✅ 播放历史 API
// =====================

interface CanonicalHistoryEntry { ownerId: string; trackId: string; lastPlayedAt: string; track: Track | null }
async function canonicalHistoryPage(limit = 20, offset = 0) {
  const response = await http.get('/user/music/v2/library/history', { params: { limit, offset } })
  const data = unwrapApiData<{ items: unknown[]; total: number; offset: number; limit: number; hasMore: boolean; nextOffset: number | null }>(response)
  if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0 || data.total > 50
    || data.offset !== offset || data.limit !== limit || typeof data.hasMore !== 'boolean'
    || (data.hasMore ? data.nextOffset !== offset + limit : data.nextOffset !== null)) throw new Error('历史分页响应无效')
  const items = data.items.map(row => decodeMusic<CanonicalHistoryEntry>('PlaybackHistoryEntry', row))
  const records: MusicHistoryRecord[] = items.map(row => ({
    id: row.trackId, userId: row.ownerId, songId: row.trackId,
    songName: row.track?.title ?? '歌曲信息暂不可用', artistName: row.track?.artists.map(a => a.name).join('/') ?? '',
    albumName: row.track?.album?.title, coverUrl: row.track?.artwork?.url,
    duration: row.track?.durationMs ?? 0, playTime: row.lastPlayedAt,
  }))
  return { response, records, total: data.total }
}
async function historyMutation(method: 'post' | 'delete', data?: unknown) {
  try {
    const response = await http.request({ method, url: '/user/music/v2/library/history', ...(data ? { data } : {}) })
    if (response.status !== 204 || (response.data !== '' && response.data !== undefined)) throw new Error('历史写入响应不完整，请刷新确认')
    return response
  } finally { clearHttpCache() }
}
export const musicHistoryApi = {
  getPage: async (limit = 20, offset = 0) => {
    if (usesCanonicalHistory()) { const page = await canonicalHistoryPage(limit, offset); return { records: page.records, total: page.total } }
    const [rows, count] = await Promise.all([musicHttp.get<MusicHistoryRecord[]>(`/user/music/history?limit=${limit}&offset=${offset}`), musicHttp.get<number>('/user/music/history/count')])
    return { records: unwrapApiData<MusicHistoryRecord[]>(rows), total: unwrapApiData<number>(count) }
  },
  addHistory: async (data: AddMusicHistoryDto) => {
    if (usesCanonicalHistory() || musicFlags.usesV2Playback || data.songId.startsWith('netease:track:')) {
      pinCanonicalHistory()
      return historyMutation('post', { trackId: typedMusicID('track', data.songId), snapshot: null })
    }
    return musicHttp.post<string>('/user/music/history', { ...data, songId: providerMusicID(data.songId, 'track') })
  },
  getHistory: async (limit = 20, offset = 0) => {
    if (!usesCanonicalHistory()) return musicHttp.get<MusicHistoryRecord[]>(`/user/music/history?limit=${limit}&offset=${offset}`)
    const page = await canonicalHistoryPage(limit, offset)
    return { ...page.response, data: page.records }
  },
  getCount: async () => {
    if (!usesCanonicalHistory()) return musicHttp.get<number>('/user/music/history/count')
    const page = await canonicalHistoryPage(1, 0)
    return { ...page.response, data: page.total }
  },
  clearHistory: () => usesCanonicalHistory() ? historyMutation('delete') : musicHttp.delete<string>('/user/music/history'),
}
