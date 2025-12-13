// src/api/apiKey.ts
import http from './http'

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
  // 如果你后端返回的是 { data: [...] }，这里改成 return res.data.data
  return res.data
}

// ✅ 新建 API Key（返回新的 Key 信息，创建时可以弹出明文 key）
export async function createApiKey(payload: {
  name: string
  dailyQuota: number
  totalQuota?: number | null
}) {
  const res = await http.post('/api-key/create', payload)
  return res.data   // 看你后端返回什么结构
}

// ✅ 启用 / 禁用 API Key
export async function setApiKeyStatus(id: number, enabled: boolean) {
  // 我这里假设后端有 /api-key/{id}/enable 和 /api-key/{id}/disable
  const path = enabled ? `/api-key/${id}/enable` : `/api-key/${id}/disable`
  const res = await http.post(path)
  return res.data
}

// ✅ 重命名（修改备注）
export async function renameApiKey(id: number, name: string) {
  // 改成 POST + /api-key/{id}/rename
  const res = await http.post(`/api-key/${id}/rename`, { name })
  return res.data
}

// ✅ 删除 API Key
export async function deleteApiKey(id: number) {
  const res = await http.delete(`/api-key/${id}`)
  return res.data
}
