import http from '@/api/http'

export interface AiChatDrawProviderConfig {
  id?: number | null
  providerId: string
  displayName: string
  baseUrl: string
  apiProtocol: string
  model: string
  enabled: boolean
  tokensPerPoint: number
  custom?: boolean
  active?: boolean
  apiKeyConfigured: boolean
  apiKeyMasked?: string | null
  envFallbackBaseUrl?: string | null
  envFallbackModel?: string | null
  updatedAt?: string | null
}

export interface AiChatDrawProviderPreset {
  providerId: string
  displayName: string
  baseUrl: string
  apiProtocol: string
  model: string
}

export interface AiChatDrawProviderCatalog {
  activeId?: number | null
  providers: AiChatDrawProviderConfig[]
  presets: AiChatDrawProviderPreset[]
}

export interface AiChatDrawProviderUpdateRequest {
  providerId: string
  displayName: string
  baseUrl: string
  apiProtocol: string
  apiKey?: string | null
  model: string
  enabled: boolean
  tokensPerPoint: number
  custom?: boolean
  activate?: boolean
}

export interface AiChatDrawModelOption {
  id: string
  name: string
}

export interface AiChatDrawModelCatalog {
  apiProtocol: string
  baseUrl: string
  models: AiChatDrawModelOption[]
}

export interface AiChatDrawModelProbeRequest {
  providerId?: number | null
  baseUrl?: string | null
  apiProtocol?: string | null
  apiKey?: string | null
}

export function fetchAiChatDrawProviders() {
  return http.get<AiChatDrawProviderCatalog>('/admin/ai/chat-draw/providers')
}

export function createAiChatDrawProvider(data: AiChatDrawProviderUpdateRequest) {
  return http.post<AiChatDrawProviderConfig>('/admin/ai/chat-draw/providers', data)
}

export function updateAiChatDrawProvider(id: number, data: AiChatDrawProviderUpdateRequest) {
  return http.put<AiChatDrawProviderConfig>(`/admin/ai/chat-draw/providers/${id}`, data)
}

export function activateAiChatDrawProvider(id: number) {
  return http.put<AiChatDrawProviderConfig>(`/admin/ai/chat-draw/providers/${id}/activate`)
}

export function deleteAiChatDrawProvider(id: number) {
  return http.delete<{ ok: boolean, id: number }>(`/admin/ai/chat-draw/providers/${id}`)
}

export function fetchAiChatDrawProviderModels(data?: AiChatDrawModelProbeRequest) {
  return http.post<AiChatDrawModelCatalog>('/admin/ai/chat-draw/providers/models', data || {})
}
