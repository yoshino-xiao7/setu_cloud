import type { LyricLine } from './music'
import { getMusicPlayabilityInfo, getMusicUrlItem } from './music'
// Required compatibility path while real cutover flags remain false.
function legacyPlayableUrl(response: unknown): string | null {
  const item = getMusicUrlItem(response)
  if (item?.playability === 'FULL'
    && item.fullPlayable === true
    && typeof item.url === 'string'
    && item.url) {
    return item.url
  }
  return null
}
function legacyUnavailableMessage(response: unknown, audience: 'user' | 'admin' = 'user') {
  const info = getMusicPlayabilityInfo(response)
  const reason = info?.playabilityReason || info?.message || info?.msg
  switch (info?.playability) {
    case 'TRIAL':
      return '当前音乐源仅支持试听，无法播放完整版'
    case 'LOGIN_INVALID':
      return audience === 'admin' ? '网易云 Cookie 已失效，请更新 Cookie' : '音乐服务账号已失效，请稍后再试'
    case 'UNAVAILABLE':
      return reason || '该歌曲暂不可播放'
    default:
      return reason || '该歌曲暂不可播放'
  }
}
export function resolveLegacyPlayback(response: unknown): string {
  const url = legacyPlayableUrl(response)
  if (!url)
    throw new Error(legacyUnavailableMessage(response))
  return url
}
export function parseLegacyLyrics(text: string): LyricLine[] {
  return text.split('\n').flatMap((line) => {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (!match)
      return []
    const value = match[4]?.trim()
    return value ? [{ time: Number(match[1]) * 60 + Number(match[2]) + Number(match[3]!.padEnd(3, '0')) / 1000, text: value }] : []
  }).sort((a, b) => a.time - b.time)
}
