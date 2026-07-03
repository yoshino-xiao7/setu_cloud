import type { SetuImageItem } from '@/api/setu'

export type PointsCallR18Mode = 0 | 1 | 2
export type PointsCallImageSize = 'original' | 'regular' | 'small'

export interface PointsCallForm {
  r18: PointsCallR18Mode
  num: number
  keyword: string
  tagText: string
  size: PointsCallImageSize
  excludeAI: boolean
}

export interface PointsCallDeckCard {
  item: SetuImageItem
  index: number
  key: string
  distance: number
  style: {
    opacity: string
    transform: string
    zIndex: string
  }
}

export const POINTS_CALL_COST_PER_CALL = 20
export const POINTS_CALL_MAX_VISIBLE_TAGS = 6

export const POINTS_CALL_R18_OPTIONS = [
  { label: '非 R18', value: 0 },
  { label: 'R18', value: 1 },
  { label: '混合', value: 2 },
]

export const POINTS_CALL_SIZE_OPTIONS = [
  { label: 'regular（推荐）', value: 'regular' },
  { label: 'original（原图）', value: 'original' },
  { label: 'small（小图）', value: 'small' },
]

export function createPointsCallDefaultForm(): PointsCallForm {
  return {
    r18: 0,
    num: 1,
    keyword: '',
    tagText: '',
    size: 'regular',
    excludeAI: true,
  }
}

export function parsePointsCallTags(tagText: string) {
  const text = tagText.trim()
  if (!text)
    return []

  return text
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
}

export function buildPointsCallSearchParams(form: PointsCallForm, tags: string[]) {
  const params = new URLSearchParams()
  params.set('r18', String(form.r18))
  params.set('num', String(form.num))

  if (form.keyword.trim())
    params.set('keyword', form.keyword.trim())
  if (form.excludeAI)
    params.set('excludeAI', 'true')

  tags.forEach(tag => params.append('tag', tag))
  params.append('size', form.size)
  return params
}

export function getCircularDeckOffset(index: number, current: number, total: number) {
  if (total <= 0)
    return 0

  let offset = index - current
  const half = total / 2

  if (offset > half)
    offset -= total
  if (offset < -half)
    offset += total

  return offset
}

export function getPointsCallDeckCards(
  results: SetuImageItem[],
  activeIndex: number,
  isMobile: boolean,
): PointsCallDeckCard[] {
  const total = results.length
  if (!total)
    return []

  const maxVisibleDistance = isMobile ? 2 : 3
  const xStep = isMobile ? 12 : 20
  const yStep = isMobile ? 12 : 16
  const rotateStep = isMobile ? 3 : 4

  return results
    .map((item, index) => {
      const offset = getCircularDeckOffset(index, activeIndex, total)
      const distance = Math.abs(offset)

      return {
        item,
        index,
        key: `${item.pid}-${item.p ?? 0}-${index}`,
        distance,
        style: {
          opacity: String(distance === 0 ? 1 : Math.max(0.45, 0.86 - distance * 0.12)),
          transform: `translate(calc(-50% + ${offset * xStep}px), ${distance * yStep}px) rotate(${offset * rotateStep}deg) scale(${Math.max(0.84, 1 - distance * 0.045)})`,
          zIndex: String(40 - distance),
        },
      }
    })
    .filter(card => card.distance <= maxVisibleDistance)
    .sort((a, b) => b.distance - a.distance)
}

export function pickPointsCallPreviewSrc(item: SetuImageItem) {
  return item.urls?.original || item.urls?.regular || item.urls?.small || ''
}

export function pickPointsCallCoverSrc(item: SetuImageItem) {
  return item.urls?.regular || item.urls?.small || item.urls?.original || ''
}

export function pickPointsCallOriginalSrc(item: SetuImageItem) {
  return item.urls?.original || item.urls?.regular || item.urls?.small || ''
}

export function getPointsCallDownloadFilename(item?: SetuImageItem) {
  const pid = item?.pid || 'image'
  const page = item?.p ?? 0
  return item?.title ? `${pid}_p${page}_${item.title}.jpg` : `${pid}_p${page}.jpg`
}

export function getVisiblePointsCallTags(item: SetuImageItem, maxTags = POINTS_CALL_MAX_VISIBLE_TAGS) {
  const tags = Array.isArray(item.tags) ? item.tags : []
  return tags.slice(0, maxTags)
}

export function getHiddenPointsCallTagCount(item: SetuImageItem, maxTags = POINTS_CALL_MAX_VISIBLE_TAGS) {
  const tags = Array.isArray(item.tags) ? item.tags : []
  return Math.max(0, tags.length - maxTags)
}
