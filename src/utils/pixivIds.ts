export function parsePixivIds(input: string): number[] {
  const parts = input.trim().split(/[,，\s]+/).filter(Boolean)
  if (!parts.length)
    throw new Error('请输入至少一个 PID')
  const invalid = parts.filter(part => !/^[1-9]\d*$/.test(part) || !Number.isSafeInteger(Number(part)) || Number(part) > 2147483647)
  if (invalid.length)
    throw new Error(`PID 无效：${invalid.slice(0, 5).join('、')}`)
  const ids = [...new Set(parts.map(Number))]
  if (ids.length > 100)
    throw new Error('每次最多提交 100 个 PID')
  return ids
}
