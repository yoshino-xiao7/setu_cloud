import http from '@/api/http'

export type SetuImageItem = {
  pid: number
  p: number
  uid: number
  title: string
  author: string
  r18: number
  width: number
  height: number
  ext?: string
  aiType?: number
  uploadDate?: number
  tags?: string[]
  urls?: Record<string, string> // 如果你后端是这种结构
  url?: string                  // 或者你后端直接返回 url 字段
  urlOriginal?: string
  urlRegular?: string
  urlSmall?: string
}

export type SetuResponse = {
  code?: number
  msg?: string
  data?: SetuImageItem[]
}

export type SetuV2Params = {
  r18?: number // 0/1/2
  num?: number
  tag?: string[]        // 多标签
  keyword?: string
  size?: string[]       // ['original','regular','small']
  excludeAI?: boolean
  aspectRatio?: string  // 例如 '1:1' '3:4' '9:16'
}

export function callSetuV2(params: SetuV2Params) {
  return http.get<SetuResponse>('/setu/v2', { params })
}
