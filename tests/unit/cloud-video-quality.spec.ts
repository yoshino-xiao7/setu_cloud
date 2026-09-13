import { describe, expect, it } from 'vitest'
import {
  autoLevelCappingIndex,
  capHeight,
  CLOUD_VIDEO_DEFAULT_MAX_HEIGHT,
  configureHlsAbrCap,
  optionHeights,
  qualityLabel,
  qualitySelectOptions,
  readStoredMaxHeight,
  writeStoredMaxHeight,
} from '@/utils/cloudVideoQuality'

describe('cloud video quality policy', () => {
  it('defaults stored preference to 720p', () => {
    expect(readStoredMaxHeight(null)).toBe(720)
    expect(readStoredMaxHeight({ getItem: () => null })).toBe(720)
    expect(readStoredMaxHeight({ getItem: () => 'nope' })).toBe(720)
    expect(readStoredMaxHeight({ getItem: () => '1080' })).toBe(1080)
  })

  it('caps at 720p when the ladder includes it', () => {
    expect(capHeight(720, [240, 360, 480, 720, 1080])).toBe(720)
  })

  it('uses the highest rung at or below 720p when 720p is missing', () => {
    expect(capHeight(720, [240, 480, 1080])).toBe(480)
  })

  it('stays on the lowest available rung when every rung is above the cap', () => {
    expect(capHeight(720, [1080, 1440])).toBe(1080)
    expect(capHeight(240, [240, 720])).toBe(240)
  })

  it('lists ladder heights, or standard rungs up to the source height', () => {
    expect(optionHeights([1080, 720, 720, 480])).toEqual([480, 720, 1080])
    expect(optionHeights([], 1080)).toEqual([240, 360, 480, 720, 1080])
    expect(optionHeights([], 480)).toEqual([240, 360, 480])
  })

  it('starts ABR on the 720p index so playback can only step down', () => {
    const levels = [240, 360, 480, 720, 1080].map(height => ({ height }))
    expect(autoLevelCappingIndex(levels, 720)).toBe(3)
    expect(autoLevelCappingIndex([{ height: 1080 }], 720)).toBe(0)
  })

  it('configures hls.js to auto-switch only at or below the cap', () => {
    const hls = {
      levels: [240, 360, 480, 720, 1080].map(height => ({ height })),
      autoLevelCapping: -1,
      startLevel: -1,
      nextLevel: 4,
    }
    configureHlsAbrCap(hls, CLOUD_VIDEO_DEFAULT_MAX_HEIGHT)
    expect(hls.autoLevelCapping).toBe(3)
    expect(hls.startLevel).toBe(3)
    expect(hls.nextLevel).toBe(-1)
  })

  it('labels 720p as the default option and persists the cap', () => {
    expect(qualityLabel(720)).toBe('720p（默认）')
    expect(qualityLabel(1080)).toBe('1080p')
    expect(qualitySelectOptions([1080, 720]).map(option => option.value)).toEqual([720, 1080])
    const store: Record<string, string> = {}
    writeStoredMaxHeight({
      setItem: (key, value) => {
        store[key] = value
      },
    }, 480)
    expect(store.cloud_video_max_height).toBe('480')
  })
})
