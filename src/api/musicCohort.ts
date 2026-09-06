import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from './env'
import { musicFlags } from './musicFlags'

function key(): string | undefined {
  const owner = useAuthStore().user?.id
  return owner === undefined || owner === null ? undefined : `music.history.v2.${API_BASE_URL}.${owner}`
}
const volatilePins = new Set<string>()
export function usesCanonicalHistory(): boolean {
  const owner = key()
  if (!owner)
    return false
  try {
    return musicFlags.usesV2History || volatilePins.has(owner) || localStorage.getItem(owner) === 'true'
  }
  catch {
    return musicFlags.usesV2History || volatilePins.has(owner)
  }
}
export function pinCanonicalHistory(): void {
  const owner = key()
  if (!owner)
    throw new Error('请先登录')
  // Durable rollback compatibility is required before admitting canonical playback.
  localStorage.setItem(owner, 'true')
  if (localStorage.getItem(owner) !== 'true')
    throw new Error('无法保存播放会话，请检查浏览器存储权限')
  volatilePins.add(owner)
}
