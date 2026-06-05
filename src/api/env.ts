export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:9898' : 'https://api.yukiryou.icu')

export const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  (import.meta.env.DEV ? window.location.origin : 'https://cloud.yukiryou.icu')

export const USE_API_MOCKS = import.meta.env.VITE_USE_API_MOCKS === 'true'
