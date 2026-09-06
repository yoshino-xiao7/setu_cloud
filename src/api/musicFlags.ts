import { USE_API_MOCKS } from '@/api/env'

export const realMusicFlags = Object.freeze({
  usesV2Playback: false,
  usesV2Lyrics: false,
  usesV2Search: false,
  usesV2Home: false,
  usesV2PlaylistDetail: false,
  rankingsEnabled: false,
  likedTracksEnabled: false,
  favoritePlaylistsEnabled: false,
})
// The mock-only app exercises the candidate UI without enabling real traffic.
export const musicFlags: Readonly<Record<keyof typeof realMusicFlags, boolean>> = USE_API_MOCKS
  ? Object.freeze(Object.fromEntries(Object.keys(realMusicFlags).map(key => [key, true]))) as Record<keyof typeof realMusicFlags, boolean>
  : realMusicFlags
