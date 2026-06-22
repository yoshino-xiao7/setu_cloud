import type {
  CredentialCreationOptionsJSON,
  CredentialRequestOptionsJSON,
  PublicKeyCredentialWithAssertionJSON,
  PublicKeyCredentialWithAttestationJSON,
} from '@github/webauthn-json'
import http from '@/api/http'
import { unwrapApiData, unwrapApiList } from '@/api/response'

type CreationPublicKey = CredentialCreationOptionsJSON | NonNullable<CredentialCreationOptionsJSON['publicKey']>
type RequestPublicKey = CredentialRequestOptionsJSON | NonNullable<CredentialRequestOptionsJSON['publicKey']>

export interface PasskeyItem {
  id: number
  nickname?: string | null
  credentialId?: string | null
  createdAt?: string | null
  lastUsedAt?: string | null
  transports?: string[] | null
}

export interface PasskeyRegistrationOptionsResponse {
  challengeId: string
  publicKey: CreationPublicKey
}

export interface PasskeyAuthenticationOptionsResponse {
  challengeId: string
  publicKey: RequestPublicKey
}

export interface PasskeyLoginResponse {
  token?: string
  userId?: number
  role?: number
  email?: string
  avatarUrl?: string | null
  signSecret: string
  expireAt?: number
  lastLoginIp?: string | null
}

export function isPasskeySupported() {
  return typeof window !== 'undefined'
    && !!window.PublicKeyCredential
    && window.isSecureContext
}

export function normalizePasskeyCreationOptions(publicKey: CreationPublicKey): CredentialCreationOptionsJSON {
  if (publicKey && typeof publicKey === 'object' && 'publicKey' in publicKey)
    return publicKey

  return { publicKey }
}

export function normalizePasskeyRequestOptions(publicKey: RequestPublicKey): CredentialRequestOptionsJSON {
  if (publicKey && typeof publicKey === 'object' && 'publicKey' in publicKey)
    return publicKey

  return { publicKey }
}

export function isPasskeyCancelError(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

export function beginPasskeyRegistration(nickname: string) {
  return http.post<PasskeyRegistrationOptionsResponse>('/user/passkeys/registration/options', {
    nickname,
  })
}

export function finishPasskeyRegistration(data: {
  challengeId: string
  nickname: string
  credential: PublicKeyCredentialWithAttestationJSON
}) {
  return http.post<PasskeyItem>('/user/passkeys/registration/finish', data)
}

export async function fetchPasskeys() {
  const res = await http.get<PasskeyItem[]>('/user/passkeys')
  return unwrapApiList<PasskeyItem>(res, [])
}

export function renamePasskey(id: number, nickname: string) {
  return http.patch<PasskeyItem>(`/user/passkeys/${id}`, {
    nickname,
  })
}

export function deletePasskey(id: number) {
  return http.delete<string>(`/user/passkeys/${id}`)
}

export async function beginPasskeyAuthentication() {
  const res = await http.post<PasskeyAuthenticationOptionsResponse>('/auth/passkeys/authentication/options', {})
  return unwrapApiData<PasskeyAuthenticationOptionsResponse>(res)
}

export async function finishPasskeyAuthentication(data: {
  challengeId: string
  credential: PublicKeyCredentialWithAssertionJSON
}) {
  const res = await http.post<PasskeyLoginResponse>('/auth/passkeys/authentication/finish', data)
  return unwrapApiData<PasskeyLoginResponse>(res)
}
