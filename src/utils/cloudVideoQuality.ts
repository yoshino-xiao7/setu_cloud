export const CLOUD_VIDEO_DEFAULT_MAX_HEIGHT = 720
export const CLOUD_VIDEO_QUALITY_STORAGE_KEY = 'cloud_video_max_height'

export interface HlsAbrCapTarget {
  levels: Array<{ height: number }>
  autoLevelCapping: number
  startLevel: number
  nextLevel: number
}

export function readStoredMaxHeight(storage: Pick<Storage, 'getItem'> | null | undefined): number {
  const raw = storage?.getItem(CLOUD_VIDEO_QUALITY_STORAGE_KEY)
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return CLOUD_VIDEO_DEFAULT_MAX_HEIGHT
  return Math.round(parsed)
}

export function writeStoredMaxHeight(storage: Pick<Storage, 'setItem'> | null | undefined, height: number) {
  if (!storage || !Number.isFinite(height) || height <= 0)
    return
  storage.setItem(CLOUD_VIDEO_QUALITY_STORAGE_KEY, String(Math.round(height)))
}

export function uniqueSortedHeights(heights: Iterable<number>): number[] {
  return [...new Set(Array.from(heights, value => Math.round(value)).filter(value => value > 0))].sort((a, b) => a - b)
}

/** Highest ladder rung that does not exceed the user's cap. If every rung is higher, keep the lowest. */
export function capHeight(requested: number, available: Iterable<number>): number {
  const heights = uniqueSortedHeights(available)
  const want = Number.isFinite(requested) && requested > 0 ? Math.round(requested) : CLOUD_VIDEO_DEFAULT_MAX_HEIGHT
  if (!heights.length)
    return want
  const eligible = heights.filter(height => height <= want)
  return eligible.length ? eligible[eligible.length - 1] : heights[0]
}

export function optionHeights(available: Iterable<number> = []): number[] {
  return uniqueSortedHeights(available)
}

export function qualityLabel(height: number): string {
  return height === CLOUD_VIDEO_DEFAULT_MAX_HEIGHT ? `${height}p（默认）` : `${height}p`
}

export function qualitySelectOptions(heights: Iterable<number>) {
  return uniqueSortedHeights(heights).map(height => ({
    label: qualityLabel(height),
    value: height,
  }))
}

/**
 * hls.js treats `autoLevelCapping` as a max level index on a bitrate-sorted ladder.
 * Start at that index so playback opens on the cap, then ABR may step down — never below index 0.
 */
export function autoLevelCappingIndex(levels: Array<{ height: number }>, maxHeight: number): number {
  if (!levels.length)
    return -1
  const cap = capHeight(maxHeight, levels.map(level => level.height || 0))
  let maxIndex = -1
  for (let index = 0; index < levels.length; index++) {
    if ((levels[index].height || 0) <= cap)
      maxIndex = index
  }
  if (maxIndex >= 0)
    return maxIndex
  let lowest = 0
  for (let index = 1; index < levels.length; index++) {
    if ((levels[index].height || Infinity) < (levels[lowest].height || Infinity))
      lowest = index
  }
  return lowest
}

export function configureHlsAbrCap(hls: HlsAbrCapTarget, maxHeight: number) {
  const index = autoLevelCappingIndex(hls.levels, maxHeight)
  if (index < 0)
    return
  hls.autoLevelCapping = index
  hls.startLevel = index
  hls.nextLevel = -1
}
