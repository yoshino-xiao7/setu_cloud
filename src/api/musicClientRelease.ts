// Public release metadata only. Never derives a cohort from a user, cookie or device ID.
export function musicClientHeader(version: string, build: string): string | undefined {
  const value = `web:${version}:${build}`
  return value.length <= 96 && !/[\r\n]/.test(value) && /^web:\d{1,4}(?:\.\d{1,4}){1,3}:[A-Z\d][\w.-]{0,39}$/i.test(value) ? value : undefined
}
export const musicReleaseHeader = musicClientHeader(import.meta.env.VITE_APP_VERSION || '2.6.1', import.meta.env.VITE_WEB_BUILD_ID || 'unknown')
