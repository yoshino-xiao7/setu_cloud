import type { CollectionPreviewImageDTO, SquareCollectionDTO } from '@/api/collections'
import { IMAGE_CDN_URL } from '@/api/env'
import { formatRelative } from '@/utils/dateFormat'

export function getCoverUrl(item: SquareCollectionDTO) {
  if (item.coverUrl)
    return item.coverUrl

  if (item.coverPid) {
    const p = item.coverP || 0
    // 后端缺少 coverUrl 时只能按 Pixiv CDN 规则降级拼接，尺寸路径需与现有资源网关保持一致。
    return `${IMAGE_CDN_URL}/c/600x600_90/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
  }

  return ''
}

export function getPreviewUrl(image: CollectionPreviewImageDTO) {
  return image.url || image.urlSmall || image.urlRegular || image.urlOriginal || ''
}

export function normalizePreviewImages(item: SquareCollectionDTO): CollectionPreviewImageDTO[] {
  const images = Array.isArray(item.previewImages) ? item.previewImages : []
  const normalized = images
    .map(image => ({
      ...image,
      p: image.p ?? 0,
      url: getPreviewUrl(image),
    }))
    .filter(image => image.url)

  if (normalized.length > 0)
    return normalized.slice(0, 5)

  const coverUrl = getCoverUrl(item)
  if (!coverUrl)
    return []

  return [{
    pid: item.coverPid || item.id,
    p: item.coverP || 0,
    title: item.name,
    url: coverUrl,
  }]
}

export function getPreviewImages(item: SquareCollectionDTO) {
  const images = Array.isArray(item.previewImages) ? item.previewImages : []
  return images.length > 0 ? images : normalizePreviewImages(item)
}

export function getFirstPreviewUrl(item: SquareCollectionDTO) {
  const image = getPreviewImages(item)[0]
  return image ? getPreviewUrl(image) : ''
}

export function normalizeTags(item: SquareCollectionDTO) {
  const rawTags = [...(item.tags || []), ...(item.themeTags || [])]
  const tags = rawTags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
  return Array.from(new Set(tags)).slice(0, 4)
}

export function getMoodText(item: SquareCollectionDTO) {
  if (item.curatorNote)
    return item.curatorNote
  if (item.scoreReason)
    return item.scoreReason
  if (item.description)
    return item.description
  if (item.recentItemCount && item.recentItemCount > 0)
    return `最近新增 ${item.recentItemCount} 张作品`
  return `${item.itemCount || 0} 张作品组成的公开收藏夹`
}

export function getFreshnessLabel(item: SquareCollectionDTO) {
  if (item.recentItemCount && item.recentItemCount > 0)
    return `新增 ${item.recentItemCount}`
  if (item.updatedAt)
    return `更新 ${formatRelative(item.updatedAt)}`
  if (item.shareCreatedAt)
    return `分享 ${formatRelative(item.shareCreatedAt)}`
  return '公开分享'
}

export function getCollectionStrength(item: SquareCollectionDTO) {
  if ((item.favoriteCount || 0) >= 30)
    return '很多人在收藏'
  if ((item.likeCount || 0) >= 50)
    return '点赞很高'
  if ((item.shareViewCount || 0) >= 200)
    return '浏览热度高'
  if ((item.itemCount || 0) >= 80)
    return '内容很足'
  return '值得看看'
}

export function getHotLabel(item: SquareCollectionDTO) {
  const score = (item.likeCount || 0) + (item.shareViewCount || 0) * 0.5 + (item.favoriteCount || 0) * 1.5
  if (score > 100)
    return '热门'
  if (score > 50)
    return '精选'
  if (score > 10)
    return '好评'
  if (score > 0)
    return '新秀'
  return null
}
