import { useAuthStore } from '@/stores/auth'

function readSignSecret() {
  try {
    return sessionStorage.getItem('signSecret')
  }
  catch {
    return null
  }
}

export async function buildSignedFetchHeaders(path: string, method: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const signSecret = readSignSecret()
  if (!signSecret)
    return headers

  const HmacSHA256 = (await import('crypto-js/hmac-sha256')).default
  const timestamp = Date.now().toString()
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  const signature = HmacSHA256(`${timestamp}:${nonce}:${method.toUpperCase()}:${path}`, signSecret).toString()
  headers['X-Timestamp'] = timestamp
  headers['X-Nonce'] = nonce
  headers['X-Signature'] = signature
  return headers
}

export async function ensureSignedFetchReady() {
  const signSecret = readSignSecret()
  if (signSecret)
    return true
  const authStore = useAuthStore()
  if (!authStore.user || !authStore.canRefreshLocalSession())
    return false
  return authStore.refreshSignature()
}
