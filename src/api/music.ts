import http from '@/api/http'

// =======================
// 类型定义
// =======================

/** 网易云 Token */
export interface NeteaseToken {
  id: number
  cookie: string
  nickname: string
  status: 0 | 1  // 0=禁用 1=启用
  createdAt: string
  updatedAt: string
}

/** 歌曲信息 */
export interface Song {
  id: number
  name: string
  artists: Artist[]
  album: Album
  duration: number
  url?: string
  picUrl?: string
}

export interface Artist {
  id: number
  name: string
}

export interface Album {
  id: number
  name: string
  picUrl?: string
}

/** 歌词行 */
export interface LyricLine {
  time: number
  text: string
}

/** 搜索结果 */
export interface SearchResult {
  result: {
    songs: Song[]
    songCount: number
  }
}

/** 音乐URL响应 */
export interface MusicUrlResponse {
  data: Array<{
    id: number
    url: string
    level: string
    size: number
  }>
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

/** 推荐歌单 */
export interface Playlist {
  id: number
  name: string
  picUrl: string
  playCount: number
  description?: string
}

// =======================
// 管理员接口
// =======================

export const adminMusicApi = {
  /** 获取所有 Token */
  getTokens: () => 
    http.get<NeteaseToken[]>('/admin/netease/tokens'),

  /** 添加 Token */
  addToken: (data: { cookie: string; nickname: string }) =>
    http.post<number>('/admin/netease/tokens', data),

  /** 更新 Token */
  updateToken: (id: number, data: { cookie?: string; nickname?: string; status?: 0 | 1 }) =>
    http.put<string>(`/admin/netease/tokens/${id}`, data),

  /** 删除 Token */
  deleteToken: (id: number) =>
    http.delete<string>(`/admin/netease/tokens/${id}`),
}

// =======================
// 用户接口
// =======================

export const userMusicApi = {
  /** 搜索音乐 */
  search: (keywords: string, limit = 10) =>  // ✅ 默认从30改为10
    http.get<SearchResult>('/user/music/search', { params: { keywords, limit } }),

  /** 获取播放地址 */
  getUrl: (id: number, level: 'standard' | 'higher' | 'exhigh' | 'lossless' = 'standard') =>
    http.get<MusicUrlResponse>('/user/music/url', { params: { id, level } }),

  /** 获取歌词 */
  getLyric: (id: number) =>
    http.get<LyricResponse>('/user/music/lyric', { params: { id } }),

  /** 获取热门搜索 */
  getHotSearch: () =>
    http.get<{ data: Array<{ searchWord: string; score: number }> }>('/user/music/search/hot'),

  /** 获取推荐歌单 */
  getPersonalized: (limit = 10) =>
    http.get<{ result: Playlist[] }>('/user/music/personalized', { params: { limit } }),

  /** 获取推荐新音乐 */
  getNewSong: () =>
    http.get<{ result: Song[] }>('/user/music/personalized/newsong'),

  /** 获取每日推荐歌曲 */
  getRecommendSongs: () =>
    http.get<{ data: { dailySongs: Song[] } }>('/user/music/recommend/songs'),

  /** 获取歌单详情 */
  getPlaylistDetail: (id: number, limit = 100) =>
    http.get<{ songs: Song[] }>('/user/music/playlist/track/all', { params: { id, limit } }),
}
