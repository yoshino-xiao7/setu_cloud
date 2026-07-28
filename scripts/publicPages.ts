/**
 * 拉取公开动态页面（/c/:id、/user/:userId）的 ID 列表。
 * 供 vite-ssg 预渲染枚举（vite.config.ts ssgOptions.includedRoutes）
 * 与 sitemap 生成（scripts/generate-sitemap.ts）共用同一数据源。
 * 拉取失败一律降级为空列表，不阻塞构建。
 */

import process from 'node:process'

const DEFAULT_API_BASE_URL = 'https://api.yukiryou.icu'

interface SquareCollectionRecord {
  id?: unknown
  userId?: unknown
}

export interface PublicDynamicPages {
  collectionIds: number[]
  userIds: number[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toPositiveInteger(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null
}

function readCollectionList(json: unknown): SquareCollectionRecord[] {
  if (!isRecord(json)) {
    return []
  }

  const data = isRecord(json.data) ? json.data : json
  for (const key of ['list', 'items', 'records']) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

export async function fetchPublicDynamicPages(options?: {
  apiBaseUrl?: string
  size?: number
  timeoutMs?: number
}): Promise<PublicDynamicPages> {
  const apiBaseUrl = options?.apiBaseUrl || process.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
  const size = options?.size ?? 200
  const timeoutMs = options?.timeoutMs ?? 5000
  const empty: PublicDynamicPages = { collectionIds: [], userIds: [] }

  try {
    const res = await fetch(
      `${apiBaseUrl}/square/collections?page=1&size=${size}`,
      { signal: AbortSignal.timeout(timeoutMs) },
    )

    if (!res.ok) {
      console.warn(`Public dynamic pages skipped: API returned ${res.status}`)
      return empty
    }

    const list = readCollectionList(await res.json())
    const collectionIds: number[] = []
    const userIds = new Set<number>()

    for (const item of list) {
      const collectionId = toPositiveInteger(item.id)
      if (collectionId) {
        collectionIds.push(collectionId)
      }

      const userId = toPositiveInteger(item.userId)
      if (userId) {
        userIds.add(userId)
      }
    }

    console.warn(`Public dynamic pages fetched: ${collectionIds.length} collections, ${userIds.size} users`)
    return { collectionIds, userIds: Array.from(userIds) }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Public dynamic pages skipped: ${message}`)
    return empty
  }
}

/** 展开为待预渲染的路由路径列表 */
export function toPrerenderPaths(pages: PublicDynamicPages): string[] {
  return [
    ...pages.collectionIds.map(id => `/c/${id}`),
    ...pages.userIds.map(id => `/user/${id}`),
  ]
}
