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
  urls?: Record<string, string>
  url?: string
  urlOriginal?: string
  urlRegular?: string
  urlSmall?: string
}
