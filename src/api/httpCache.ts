function hasNonJsonValue(value: unknown): boolean {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
    return true

  if (!value || typeof value !== 'object')
    return false

  if (Array.isArray(value))
    return value.some(hasNonJsonValue)

  return Object.values(value).some(hasNonJsonValue)
}

export function cloneCachedResponseData(data: unknown) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(data)
    }
    catch {}
  }

  if (!hasNonJsonValue(data)) {
    try {
      return JSON.parse(JSON.stringify(data)) as unknown
    }
    catch {}
  }

  if (Array.isArray(data)) {
    return [...data]
  }
  if (data && typeof data === 'object') {
    return { ...data }
  }
  return data
}
