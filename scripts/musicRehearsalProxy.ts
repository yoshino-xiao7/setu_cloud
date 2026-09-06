import type { ProxyOptions } from 'vite'

/** Local Web transport only; upstream auth, cookies and payloads are unchanged. */
export function musicRehearsalProxy(mode: string): Record<string, ProxyOptions> | undefined {
  if (mode !== 'rehearsal')
    return undefined
  return {
    '^/__music-rehearsal-api(?:/|$)': {
      target: 'https://api.yukiryou.icu',
      changeOrigin: true,
      secure: true,
      rewrite: path => path.replace(/^\/__music-rehearsal-api(?=\/|$)/, '') || '/',
    },
  }
}
