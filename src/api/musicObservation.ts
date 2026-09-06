import { getActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import http from './http'

export type MusicObservation = 'session' | 'playback.started' | 'playback.failed' | 'search.ready' | 'home.ready' | 'lyrics.line' | 'lyrics.word' | 'lyrics.plain' | 'lyrics.none' | 'lyrics.failed' | 'client.exception'
export function observeMusic(event: MusicObservation, v2: boolean, start?: number): void {
  if (!getActivePinia() || !useAuthStore().user)
    return
  const durationMs = start === undefined ? 0 : Math.max(0, Math.min(300000, performance.now() - start))
  void http.post('/user/music/rollout/events', { event, transport: v2 ? 'v2' : 'v1', durationMs, count: 1 }).catch(() => {})
}

let installed = false
export function installMusicExceptionObservation(v2: () => boolean): void {
  if (installed || typeof window === 'undefined')
    return
  installed = true
  // Error values/stacks are intentionally ignored. Browser process crashes require external evidence.
  window.addEventListener('error', () => observeMusic('client.exception', v2()))
  window.addEventListener('unhandledrejection', () => observeMusic('client.exception', v2()))
}
