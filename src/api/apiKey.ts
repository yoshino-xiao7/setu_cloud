// src/api/apiKey.ts
import http from './http'
import { unwrapApiData, unwrapApiList } from './response'

export interface ApiKeyItem {
  id: number
  name: string
  status: number          // 0 禁用, 1 启用
  dailyQuota: number
  totalQuota: number | null
  callsToday: number
  totalCalls: number
  createdAt: string
}

// ✅ 列出当前登录用户所有 API Key
export async function fetchMyApiKeys(): Promise<ApiKeyItem[]> {
  const res = await http.get('/api-key/list')
  return unwrapApiList<ApiKeyItem>(res)
}

// ✅ 新建 API Key（返回新的 Key 信息，创建时可以弹出明文 key）
export async function createApiKey(payload: {
  name: string
  dailyQuota: number
  totalQuota?: number | null
}) {
  const res = await http.post('/api-key/create', payload)
  return unwrapApiData<string>(res)
}

// ✅ 启用 / 禁用 API Key
export async function setApiKeyStatus(id: number, enabled: boolean) {
  // 我这里假设后端有 /api-key/{id}/enable 和 /api-key/{id}/disable
  const path = enabled ? `/api-key/${id}/enable` : `/api-key/${id}/disable`
  const res = await http.post(path)
  return unwrapApiData<string>(res)
}

// ✅ 重命名（修改备注）
export async function renameApiKey(id: number, name: string) {
  // 改成 POST + /api-key/{id}/rename
  const res = await http.post(`/api-key/${id}/rename`, { name })
  return unwrapApiData<string>(res)
}

// ✅ 删除 API Key
export async function deleteApiKey(id: number) {
  const res = await http.delete(`/api-key/${id}`)
  return unwrapApiData<string>(res)
}
