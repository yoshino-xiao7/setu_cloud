/** Legacy JSON IDs must be converted before JSON.parse rounds numeric tokens. */
const identityKeys = /^(?:id|.*Id|mvid|mv)$/
export function parseMusicJSON(input: unknown): unknown {
  if (typeof input !== 'string')
    return normalizeMusicIDs(input)
  const source = input
  let offset = 0
  const whitespace = () => {
    while (/\s/.test(source[offset] || '') && offset < source.length)
      offset++
  }
  function text(): string {
    const start = offset++
    while (offset < source.length) {
      if (source[offset++] === '"')
        return JSON.parse(source.slice(start, offset))
      if (source[offset - 1] === '\\')
        offset++
    }
    throw new Error('音乐 JSON 字符串不完整')
  }
  function value(key = ''): unknown {
    whitespace()
    if (source[offset] === '"')
      return text()
    if (source[offset] === '{') {
      offset++
      const result: Record<string, unknown> = Object.create(null)
      whitespace()
      if (source[offset] !== '}') {
        while (true) {
          whitespace()
          if (source[offset] !== '"')
            throw new Error('音乐 JSON 属性无效')
          const name = text()
          whitespace()
          if (source[offset++] !== ':')
            throw new Error('音乐 JSON 属性无效')
          result[name] = value(name)
          whitespace()
          if (source[offset] !== ',')
            break
          offset++
        }
      }
      if (source[offset++] !== '}')
        throw new Error('音乐 JSON 对象不完整')
      return result
    }
    if (source[offset] === '[') {
      offset++
      const result: unknown[] = []
      whitespace()
      if (source[offset] !== ']') {
        while (true) {
          result.push(value())
          whitespace()
          if (source[offset] !== ',')
            break
          offset++
        }
      }
      if (source[offset++] !== ']')
        throw new Error('音乐 JSON 数组不完整')
      return result
    }
    const token = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(source.slice(offset))?.[0]
    if (!token)
      throw new Error('音乐 JSON 值无效')
    offset += token.length
    if (identityKeys.test(key) && /^-?\d+$/.test(token))
      return token
    return JSON.parse(token)
  }
  const result = value()
  whitespace()
  if (offset !== source.length)
    throw new Error('音乐 JSON 尾部无效')
  return result
}
export function normalizeMusicIDs(value: unknown, key = ''): unknown {
  if (typeof value === 'number' && identityKeys.test(key)) {
    if (!Number.isSafeInteger(value))
      throw new Error('旧音乐 ID 已丢失精度，请重新加载')
    return String(value)
  }
  if (Array.isArray(value))
    return value.map(item => normalizeMusicIDs(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, normalizeMusicIDs(child, name)]))
  }
  return value
}
export function typedMusicID(kind: 'track' | 'artist' | 'album' | 'playlist' | 'mv', value: string): string {
  if (value.includes(':')) {
    if (!value.startsWith(`netease:${kind}:`))
      throw new Error('音乐资源 ID 类型不匹配')
    return value
  }
  if (!value.trim())
    throw new Error('音乐资源 ID 为空')
  return `netease:${kind}:${encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`
}
export function legacyMusicID(value: string, kind: string): string {
  const prefix = `setu:${kind}:`
  const raw = value.startsWith(prefix) ? decodeURIComponent(value.slice(prefix.length)) : value
  if (!/^\d+$/.test(raw))
    throw new Error('不支持此本地资源 ID')
  return raw
}
export function providerMusicID(value: string, kind: 'track' | 'mv'): string {
  const typed = typedMusicID(kind, value)
  return decodeURIComponent(typed.slice(`netease:${kind}:`.length))
}
