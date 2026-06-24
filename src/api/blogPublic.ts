import type { SetuImageItem } from '@/api/setu'
import { API_BASE_URL, DEFAULT_AVATAR_URL, USE_API_MOCKS } from '@/api/env'

type BlogQueryValue = string | number | null | undefined

interface BlogApiEnvelope<T> {
  data?: T
  message?: string
  msg?: string
  error?: string
}

export interface PublicBlogMusicSearchParams {
  keywords: string
  limit?: number
  offset?: number
  type?: number
}

export interface PublicBlogMusicUrlParams {
  id: string
  level?: string
}

export interface PublicBlogMusicLyricParams {
  id: number | string
}

export interface PublicBlogMusicDetailParams {
  ids: string
}

export class PublicBlogApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'PublicBlogApiError'
    this.status = status
  }
}

export async function fetchPublicBlogSetu(): Promise<SetuImageItem[]> {
  if (USE_API_MOCKS)
    return createMockBlogSetu()

  const body = await requestPublicBlog<SetuImageItem[] | SetuImageItem>('/blog/setu')
  const data = unwrapPublicBlogData<SetuImageItem[] | SetuImageItem>(body)

  if (Array.isArray(data))
    return data

  return data ? [data] : []
}

export function searchPublicBlogMusic(params: PublicBlogMusicSearchParams) {
  const keywords = params.keywords.trim().slice(0, 100)
  if (!keywords)
    throw new PublicBlogApiError('请输入搜索关键词', 400)

  return requestPublicBlog('/blog/music/search', {
    keywords,
    limit: clampInteger(params.limit ?? 30, 1, 50),
    offset: clampInteger(params.offset ?? 0, 0, 1000),
    type: clampInteger(params.type ?? 1, 1, 1000),
  })
}

export function fetchPublicBlogMusicUrl(params: PublicBlogMusicUrlParams) {
  const id = params.id.trim().slice(0, 64)
  if (!id)
    throw new PublicBlogApiError('歌曲 ID 不能为空', 400)

  return requestPublicBlog('/blog/music/url', {
    id,
    level: params.level?.trim().slice(0, 32) || 'standard',
  })
}

export function fetchPublicBlogMusicLyric(params: PublicBlogMusicLyricParams) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0)
    throw new PublicBlogApiError('歌曲 ID 不合法', 400)

  return requestPublicBlog('/blog/music/lyric', { id: Math.trunc(id) })
}

export function fetchPublicBlogMusicDetail(params: PublicBlogMusicDetailParams) {
  const ids = params.ids.trim().slice(0, 512)
  if (!ids)
    throw new PublicBlogApiError('歌曲 ID 列表不能为空', 400)

  return requestPublicBlog('/blog/music/detail', { ids })
}

async function requestPublicBlog<T>(path: string, query?: Record<string, BlogQueryValue>) {
  const res = await fetch(buildPublicBlogUrl(path, query), {
    method: 'GET',
    credentials: 'omit',
  })
  const body = await readPublicBlogBody<T>(res)

  if (!res.ok) {
    throw new PublicBlogApiError(getPublicBlogMessage(body, getStatusFallback(res.status)), res.status)
  }

  return body
}

function buildPublicBlogUrl(path: string, query?: Record<string, BlogQueryValue>) {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const params = new URLSearchParams()

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '')
      params.set(key, String(value))
  })

  const search = params.toString()
  return `${base}${normalizedPath}${search ? `?${search}` : ''}`
}

async function readPublicBlogBody<T>(res: Response): Promise<BlogApiEnvelope<T> | T | null> {
  const text = await res.text()
  if (!text)
    return null

  try {
    return JSON.parse(text) as BlogApiEnvelope<T> | T
  }
  catch {
    return { message: text } as BlogApiEnvelope<T>
  }
}

function unwrapPublicBlogData<T>(body: BlogApiEnvelope<T> | T | null): T | null {
  if (!body)
    return null

  if (typeof body === 'object' && !Array.isArray(body) && 'data' in body)
    return (body as BlogApiEnvelope<T>).data ?? null

  return body as T
}

function getPublicBlogMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return fallback

  const data = body as { message?: unknown, msg?: unknown, error?: unknown }
  if (typeof data.message === 'string' && data.message.trim())
    return data.message
  if (typeof data.msg === 'string' && data.msg.trim())
    return data.msg
  if (typeof data.error === 'string' && data.error.trim())
    return data.error

  return fallback
}

function getStatusFallback(status: number) {
  if (status === 429)
    return '请求过于频繁'
  if (status === 403)
    return '访问来源不允许'
  if (status === 400)
    return '请求参数不合法'

  return '请求失败'
}

function clampInteger(value: number, min: number, max: number) {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : min
  return Math.min(max, Math.max(min, normalized))
}

function createMockBlogSetu(): SetuImageItem[] {
  return [
    {
      pid: 100000001,
      p: 0,
      uid: 1,
      title: 'Mock Blog Image',
      author: 'Setu Cloud',
      r18: 0,
      width: 1200,
      height: 800,
      uploadDate: Date.now(),
      tags: ['mock', 'blog'],
      urls: {
        regular: DEFAULT_AVATAR_URL,
        original: DEFAULT_AVATAR_URL,
      },
    },
  ]
}
