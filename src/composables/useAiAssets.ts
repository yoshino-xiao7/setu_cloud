import type { AiCapabilityResponse } from '@/api/aiGeneration'

export const ALL_DIRECTORY_KEY = 'all'

export interface AssetOption {
  name: string
  displayName: string
  category: string
  categoryType: string
  triggerWords: string
  recommendedStrength: number | null
  recommendedCheckpoint: string
  previewImage: string
  notes: string
  fileName: string
  metadata: Record<string, any>
}

export interface StylePromptPreset {
  label: string
  value: string
  category: string
  categoryType: string
  tags: string
  negativeTags: string
  notes: string
}

export function parseMetadata<T extends Record<string, any> = Record<string, any>>(metadataJson?: string | null): T {
  if (!metadataJson)
    return {} as T
  try {
    return JSON.parse(metadataJson) as T
  }
  catch {
    return {} as T
  }
}

export function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }
  return ''
}

export function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed))
      return parsed
  }
  return null
}

export function safePreviewImage(value: unknown) {
  if (typeof value !== 'string')
    return ''
  const url = value.trim()
  if (!url)
    return ''
  if (/^(?:https?:)?\/\//i.test(url) || /^data:image\//i.test(url) || url.startsWith('/'))
    return url
  return ''
}

export function normalizeAssetFileName(value: string) {
  return value
    .replace(/\.(safetensors|ckpt|pt)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

export function normalizeTagKey(tag: string) {
  return tag.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

export function mergeUniqueTags(...parts: string[]) {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of parts) {
    for (const rawTag of part.split(',')) {
      const tag = rawTag.trim()
      const key = normalizeTagKey(tag)
      if (!tag || seen.has(key))
        continue
      seen.add(key)
      tags.push(tag)
    }
  }
  return tags.join(', ')
}

export function toAssetOption(item: AiCapabilityResponse['loras'][number], fallbackCategory: string): AssetOption {
  const metadata = parseMetadata(item.metadataJson)
  const displayName = firstText(
    metadata.display_name,
    metadata.displayName,
    metadata.name,
    item.displayName,
    item.name,
  )
  return {
    name: item.name,
    displayName,
    category: firstText(metadata.category, metadata.category_name, metadata.categoryDisplayName, metadata.franchise, fallbackCategory),
    categoryType: firstText(metadata.category_type, metadata.categoryType, metadata.type, ''),
    triggerWords: firstText(metadata.trigger_words, metadata.triggerWords, metadata.trigger, ''),
    recommendedStrength: firstNumber(metadata.recommended_strength, metadata.recommendedStrength, metadata.lora_strength, metadata.loraStrength),
    recommendedCheckpoint: firstText(metadata.recommended_checkpoint, metadata.recommendedCheckpoint, ''),
    previewImage: safePreviewImage(firstText(metadata.preview_image, metadata.previewImage, metadata.preview_url, metadata.previewUrl)),
    notes: firstText(metadata.notes, metadata.description, metadata.summary, ''),
    fileName: firstText(metadata.file_name, metadata.fileName, metadata.lora_name, metadata.loraName, item.name),
    metadata,
  }
}

export function assetTypeLabel(asset: AssetOption) {
  return asset.categoryType || '未分组'
}

export function makeTypeDirectoryKey(type: string) {
  return `type:${encodeURIComponent(type)}`
}

export function makeCategoryDirectoryKey(type: string, category: string) {
  return `category:${encodeURIComponent(type)}:${encodeURIComponent(category)}`
}

export function parseDirectoryKey(key: string) {
  if (key === ALL_DIRECTORY_KEY)
    return { mode: 'all', type: '', category: '' }
  if (key.startsWith('type:'))
    return { mode: 'type', type: decodeURIComponent(key.slice(5)), category: '' }
  if (key.startsWith('category:')) {
    const [, encodedType = '', encodedCategory = ''] = key.split(':')
    return {
      mode: 'category',
      type: decodeURIComponent(encodedType),
      category: decodeURIComponent(encodedCategory),
    }
  }
  return { mode: 'all', type: '', category: '' }
}

export function assetDirectoryTree(items: AssetOption[]) {
  const typeMap = new Map<string, Map<string, number>>()
  for (const item of items) {
    const type = assetTypeLabel(item)
    if (!typeMap.has(type))
      typeMap.set(type, new Map())
    const categoryMap = typeMap.get(type)!
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1)
  }
  return [
    {
      label: `全部 (${items.length})`,
      key: ALL_DIRECTORY_KEY,
    },
    ...Array.from(typeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
      .map(([type, categoryMap]) => {
        const total = Array.from(categoryMap.values()).reduce((sum, count) => sum + count, 0)
        return {
          label: `${type} (${total})`,
          key: makeTypeDirectoryKey(type),
          children: Array.from(categoryMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
            .map(([category, count]) => ({
              label: `${category} (${count})`,
              key: makeCategoryDirectoryKey(type, category),
            })),
        }
      }),
  ]
}

export function filterAssets(items: AssetOption[], search: string, directoryKey: string) {
  const keyword = search.trim().toLowerCase()
  const directory = parseDirectoryKey(directoryKey)
  return items.filter((item) => {
    if (directory.mode === 'type' && assetTypeLabel(item) !== directory.type)
      return false
    if (directory.mode === 'category' && (assetTypeLabel(item) !== directory.type || item.category !== directory.category))
      return false
    if (!keyword)
      return true
    return [
      item.displayName,
      item.name,
      item.fileName,
      item.category,
      item.categoryType,
      item.triggerWords,
      item.recommendedCheckpoint,
      item.notes,
    ].some(value => value.toLowerCase().includes(keyword))
  })
}

export function assetPromptTags(asset: AssetOption | null) {
  if (!asset)
    return ''
  return firstText(asset.triggerWords, normalizeAssetFileName(asset.fileName), asset.displayName)
}

export function assetCompactSummary(asset: AssetOption | null, emptyText: string) {
  if (!asset)
    return emptyText
  const parts = [
    asset.triggerWords ? `触发词：${asset.triggerWords}` : '',
    asset.recommendedStrength !== null ? `强度：${asset.recommendedStrength}` : '',
  ].filter(Boolean)
  return parts.join(' · ') || asset.fileName
}

export function toStylePromptPreset(item: AiCapabilityResponse['promptPresets'][number]): StylePromptPreset {
  const metadata = parseMetadata(item.metadataJson)
  return {
    label: firstText(metadata.name, item.displayName, item.name),
    value: item.name,
    category: firstText(metadata.category, '风格预设'),
    categoryType: firstText(metadata.category_type, metadata.categoryType, '风格'),
    tags: mergeUniqueTags(
      firstText(metadata.trigger_words, metadata.triggerWords),
      firstText(metadata.default_positive, metadata.defaultPositive),
      firstText(metadata.style_tags, metadata.styleTags),
    ),
    negativeTags: firstText(metadata.default_negative, metadata.defaultNegative),
    notes: firstText(metadata.notes, metadata.description, ''),
  }
}
