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

/** 推荐歌单（网易云） */
export interface Playlist {
  id: number
  name: string
  picUrl: string
  playCount: number
  description?: string
}

// =====================
// ✅ 用户自定义歌单类型
// =====================

/** 用户歌单 */
export interface UserPlaylist {
  id: number
  userId: number
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
  id: number
  songId: number
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
  songId: number
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
  search: (keywords: string, limit = 10, offset = 0) =>  // ✅ 添加 offset 参数
    http.get<SearchResult>('/user/music/search', { params: { keywords, limit, offset } }),

  /** 获取播放地址 */
  getUrl: (id: number, level: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' = 'standard') =>  // ✅ 添加 hires
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

// =====================
// ✅ 用户歌单管理接口
// =====================

export const userPlaylistApi = {
  /** 获取我的所有歌单 */
  getMyPlaylists: () =>
    http.get<UserPlaylist[]>('/user/playlists'),

  /** 获取歌单详情 */
  getPlaylistById: (id: number) =>
    http.get<UserPlaylist>(`/user/playlists/${id}`),

  /** 创建歌单 */
  createPlaylist: (data: CreatePlaylistDto) =>
    http.post<UserPlaylist>('/user/playlists', data),

  /** 修改歌单 ✨ */
  updatePlaylist: (id: number, data: Partial<CreatePlaylistDto>) =>
    http.put<UserPlaylist>(`/user/playlists/${id}`, data),

  /** 添加歌曲到歌单 */
  addSongToPlaylist: (playlistId: number, data: AddSongToPlaylistDto) =>
    http.post<string>(`/user/playlists/${playlistId}/songs`, data),

  /** 从歌单移除歌曲 */
  removeSongFromPlaylist: (playlistId: number, songId: number) =>
    http.delete<string>(`/user/playlists/${playlistId}/songs/${songId}`),

  /** 更新播放模式 */
  updatePlayMode: (playlistId: number, playMode: 'sequence' | 'random' | 'loop' | 'single') =>
    http.put<string>(`/user/playlists/${playlistId}/play-mode`, { playMode }),

  /** 删除歌单 */
  deletePlaylist: (id: number) =>
    http.delete<string>(`/user/playlists/${id}`),

  /** 记录播放 */
  recordPlay: (id: number) =>
    http.post<string>(`/user/playlists/${id}/play`),
}

// =====================
// ✅ 播放历史相关类型
// =====================

/** 播放历史记录 */
export interface MusicHistoryRecord {
  id: number
  userId: number
  songId: number
  songName: string
  artistName: string
  albumName?: string
  coverUrl?: string
  duration: number
  playTime: string  // ✅ 后端返回的是 playTime 不是 playedAt
}

/** 添加播放历史 DTO */
export interface AddMusicHistoryDto {
  songId: number
  songName: string
  artistName: string
  albumName?: string
  coverUrl?: string
  duration: number
}

// =====================
// ✅ 播放历史 API
// =====================

export const musicHistoryApi = {
  /** 添加播放记录 */
  addHistory: (data: AddMusicHistoryDto) =>
    http.post<string>('/user/music/history', data),

  /** 获取播放历史 */
  getHistory: (limit = 20, offset = 0) =>
    http.get<MusicHistoryRecord[]>(`/user/music/history?limit=${limit}&offset=${offset}`),

  /** 获取历史总数 */
  getCount: () =>
    http.get<number>('/user/music/history/count'),

  /** 清空播放历史 */
  clearHistory: () =>
    http.delete<string>('/user/music/history'),
}
