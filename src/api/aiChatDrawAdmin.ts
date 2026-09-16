import http from '@/api/http'

export interface AiChatDrawProviderConfig {
  providerId: string
  displayName: string
  baseUrl: string
  apiProtocol: string
  model: string
  enabled: boolean
  tokensPerPoint: number
  apiKeyConfigured: boolean
  apiKeyMasked?: string | null
  envFallbackBaseUrl?: string | null
  envFallbackModel?: string | null
  updatedAt?: string | null
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
  baseUrl?: string | null
  apiProtocol?: string | null
  apiKey?: string | null
}

export function fetchAiChatDrawProviderConfig() {
  return http.get<AiChatDrawProviderConfig>('/admin/ai/chat-draw/provider')
}

export function updateAiChatDrawProviderConfig(data: AiChatDrawProviderUpdateRequest) {
  return http.put<AiChatDrawProviderConfig>('/admin/ai/chat-draw/provider', data)
}

export function fetchAiChatDrawProviderModels(data?: AiChatDrawModelProbeRequest) {
  return http.post<AiChatDrawModelCatalog>('/admin/ai/chat-draw/provider/models', data || {})
}
