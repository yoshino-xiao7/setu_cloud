import type { Song } from './music'
import schemas from './musicV2Schemas.json'

declare const identity: unique symbol
export type TrackID = string & {
  readonly [identity]: 'track'
}
export type PlaylistID = string & {
  readonly [identity]: 'playlist'
}
export type RelationID = string & {
  readonly [identity]: 'membership'
}
export interface Artwork {
  url: string
}
export interface ArtistBrief {
  id: string | null
  name: string
  artwork: Artwork | null
}
export interface AlbumBrief {
  id: string | null
  title: string
  artwork: Artwork | null
}
export interface Track {
  id: TrackID
  source: string
  title: string
  artists: ArtistBrief[]
  album: AlbumBrief | null
  durationMs: number | null
  artwork: Artwork | null
  mvId: string | null
  aliases: string[]
  translatedTitle: string | null
  availability: {
    status: string
    reason: string | null
    maxQuality: string | null
  }
}
export interface Album extends AlbumBrief {
  id: string
  artists: ArtistBrief[]
  trackCount: number | null
}
export interface Playlist {
  id: PlaylistID
  origin: 'local' | 'provider'
  title: string
  artwork: Artwork | null
  description: string | null
  trackCount: number | null
  playCount: number | null
  tags: string[]
  isRanking: boolean
  updatedAt: string | null
  updateFrequency: string | null
  creator: {
    id: string | null
    name: string
    avatar: Artwork | null
  } | null
  ownerId?: string
  visibility?: string
  defaultPlaybackMode?: string
  createdAt?: string
}
export interface Page<T> {
  items: T[]
  offset: number
  limit: number
  total: number | null
  hasMore: boolean
  nextOffset: number | null
}
export interface Membership {
  playlistId: PlaylistID
  trackId: TrackID
  relationId: RelationID | null
  position: number
  track: Track | null
  addedAt?: string
}
export interface PlaylistDetail {
  playlist: Playlist
  memberships: Page<Membership>
}
export interface LikedTrack {
  ownerId: string
  trackId: TrackID
  likedAt: string
  track: Track | null
}
export interface SavedPlaylist {
  ownerId: string
  playlistId: PlaylistID
  savedAt: string
  playlist: Playlist | null
}
export interface HomeAction {
  kind: string
  label: string | null
  ref?: {
    kind: string
    id: string
  }
  selection?: string
  collection?: string
  query?: string
}
export type HomeItem = {
  kind: 'track'
  track: Track
} | {
  kind: 'playlist'
  playlist: Playlist
} | {
  kind: 'album'
  album: Album
} | {
  kind: 'entry'
  key: string
  title: string
  action: HomeAction
  count: number | null
} | {
  kind: 'keyword'
  query: string
  rank: number | null
}
export interface HomeSection {
  id: string
  kind: string
  title: string
  subtitle: string | null
  items: HomeItem[]
  degraded: boolean
  source: {
    label: string | null
    personalized: boolean
  } | null
  action: HomeAction | null
}
export interface HomeFeed {
  sections: HomeSection[]
  generatedAt: string
}
export interface Lyric {
  trackId: TrackID
  kind: string
  hasTranslation: boolean
  contributors: string[]
  lines: {
    text: string
    startMs: number | null
    durationMs: number | null
    translation: string | null
    words: {
      text: string
      startMs: number
      durationMs: number
    }[]
  }[]
}
export type Playback = {
  kind: 'success'
  source: {
    trackId: TrackID
    url: string
    requestedQuality: string
    actualQuality: string | null
    refreshAt: string
    sourceExpiresAt: string | null
    bitrate: number | null
    sizeBytes: number | null
    format: string | null
    notice: string | null
  }
} | {
  kind: 'denied'
  trackId: TrackID
  availability: Track['availability']
}
interface Schema {
  $ref?: string
  type?: string
  properties?: Record<string, Schema>
  required?: string[]
  items?: Schema
  anyOf?: Schema[]
  oneOf?: Schema[]
  allOf?: Schema[]
  const?: unknown
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minLength?: number
  minItems?: number
  maxItems?: number
  pattern?: string
  format?: string
}
const definitions = schemas as unknown as Record<string, Schema>
const homeKinds = new Set(['quickEntries', 'dailyTracks', 'recommendedPlaylists', 'newTracks', 'newAlbums', 'rankings', 'hotSearch', 'continueListening', 'favoritePlaylists'])
const itemKinds = new Set(['track', 'playlist', 'album', 'entry', 'keyword'])
const actionKinds = new Set(['resource', 'discovery', 'library', 'search'])
function matches(schema: Schema, value: unknown, name = ''): boolean {
  if (schema.$ref) {
    const target = schema.$ref.split('/').pop()!
    if (target === 'HomeAction' && value && typeof value === 'object' && 'kind' in value && typeof value.kind === 'string' && !actionKinds.has(value.kind))
      return true
    return matches(definitions[target]!, value, target)
  }
  if (schema.anyOf && !schema.anyOf.some(s => matches(s, value)))
    return false
  if (schema.oneOf && !schema.oneOf.some(s => matches(s, value)))
    return false
  if (schema.allOf && !schema.allOf.every(s => matches(s, value)))
    return false
  if ('const' in schema && value !== schema.const)
    return false
  if (schema.type === 'null')
    return value === null
  if (schema.type === 'string') {
    if (typeof value !== 'string' || value.length < (schema.minLength ?? 0))
      return false
    // Unknown identity domains remain displayable; write/navigation validate domains separately.
    if (schema.pattern && !name.endsWith('Id') && !new RegExp(schema.pattern).test(value))
      return false
    if (schema.format === 'date-time' && !Number.isFinite(Date.parse(value)))
      return false
    if (schema.format === 'uri') {
      try {
        if (new URL(value).protocol !== 'https:')
          return false
      }
      catch {
        return false
      }
    }
  }
  if (schema.type === 'integer' && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (schema.minimum ?? 0) || value > (schema.maximum ?? Number.MAX_SAFE_INTEGER)))
    return false
  if (schema.type === 'boolean' && typeof value !== 'boolean')
    return false
  if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity))
      return false
    if (schema.items && !value.every(item => matches(schema.items!, item)))
      return false
  }
  if (schema.type === 'object' || schema.properties) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false
    const record = value as Record<string, unknown>
    if (schema.required?.some(key => Object.getOwnPropertyDescriptor(record, key) === undefined))
      return false
    if (Object.entries(schema.properties ?? {}).some(([key, child]) => Object.getOwnPropertyDescriptor(record, key) !== undefined && !matches(child, record[key])))
      return false
  }
  return true
}
export function decodeMusic<T>(name: string, input: unknown): T {
  if (!definitions[name] || !matches(definitions[name]!, input))
    throw new Error('音乐响应格式不受支持，请稍后重试')
  validateSemantics(input)
  return input as T
}
export function decodeHome(input: unknown): HomeFeed {
  if (!input || typeof input !== 'object' || !('sections' in input) || !Array.isArray(input.sections))
    throw new Error('音乐首页响应不完整')
  const sections = input.sections.filter((section) => {
    if (!section || typeof section.kind !== 'string')
      throw new Error('音乐栏目类型缺失')
    return homeKinds.has(section.kind)
  }).map((section) => {
    if (!Array.isArray(section.items))
      throw new Error('音乐栏目内容缺失')
    return { ...section, items: section.items.filter((item: {
      kind?: string
    }) => {
      if (!item || typeof item.kind !== 'string')
        throw new Error('音乐条目类型缺失')
      return itemKinds.has(item.kind)
    }) }
  })
  return decodeMusic<HomeFeed>('HomeFeed', { ...input, sections })
}
export function trackToSong(track: Track): Song {
  return { id: track.id, name: track.title, artists: track.artists.map(a => ({ id: a.id ?? '', name: a.name })), album: { id: track.album?.id ?? '', name: track.album?.title ?? '未知专辑', picUrl: track.album?.artwork?.url }, duration: track.durationMs ?? 0, picUrl: track.artwork?.url, mv: track.mvId ?? undefined }
}
function validateSemantics(input: unknown): void {
  if (!input || typeof input !== 'object')
    return
  if (Array.isArray(input)) {
    input.forEach(validateSemantics)
    return
  }
  const row = input as Record<string, unknown>
  if ('hasMore' in row && 'offset' in row && Array.isArray(row.items)) {
    if ((row.hasMore && (typeof row.nextOffset !== 'number' || row.nextOffset <= (row.offset as number))) || (!row.hasMore && row.nextOffset !== null))
      throw new Error('音乐分页位置无效')
  }
  if ('availability' in row && row.availability && typeof row.availability === 'object') {
    const availability = row.availability as Track['availability']
    if (availability.status !== 'playable' && !availability.reason?.trim())
      throw new Error('音乐可用性说明缺失')
    if (row.kind === 'denied' && availability.status === 'playable')
      throw new Error('播放拒绝原因无效')
  }
  Object.values(row).forEach(validateSemantics)
}
