import type { SquareCollectionDTO } from '@/api/collections'
import { describe, expect, it } from 'vitest'
import { selectShowcaseTiles } from '@/composables/useLandingShowcase'

function collection(id: number, images: Array<Record<string, unknown>>): SquareCollectionDTO {
  return {
    id,
    name: `收藏夹 ${id}`,
    itemCount: images.length,
    shareViewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    previewImages: images as SquareCollectionDTO['previewImages'],
  }
}

const safeImage = { pid: 1, p: 0, title: '作品', author: '作者', url: 'https://cdn.test/a.jpg', width: 800, height: 1200, r18: 0 }

describe('selectShowcaseTiles', () => {
  it('drops r18 images so the logged-out first screen stays all-ages', () => {
    const tiles = selectShowcaseTiles([
      collection(1, [{ ...safeImage, pid: 10, r18: 1 }, { ...safeImage, pid: 11, r18: 0 }]),
    ])

    expect(tiles.map(tile => tile.key)).toEqual(['1-11-0'])
  })

  it('treats a missing r18 flag as unsafe', () => {
    const tiles = selectShowcaseTiles([
      collection(1, [{ ...safeImage, pid: 12, r18: undefined }]),
    ])

    expect(tiles).toEqual([])
  })

  it('rejects non-http urls', () => {
    const tiles = selectShowcaseTiles([
      collection(1, [{ ...safeImage, pid: 13, url: 'javascript:alert(1)', urlSmall: '', urlRegular: '', urlOriginal: '' }]),
    ])

    expect(tiles).toEqual([])
  })

  it('interleaves collections so one owner cannot fill the wall', () => {
    const tiles = selectShowcaseTiles([
      collection(1, [{ ...safeImage, pid: 1 }, { ...safeImage, pid: 2 }, { ...safeImage, pid: 3 }]),
      collection(2, [{ ...safeImage, pid: 4 }, { ...safeImage, pid: 5 }]),
    ])

    expect(tiles.map(tile => tile.collectionId)).toEqual([1, 2, 1, 2, 1])
  })

  it('marks orientation and falls back to a portrait ratio without dimensions', () => {
    const tiles = selectShowcaseTiles([
      collection(1, [
        { ...safeImage, pid: 1, width: 1600, height: 900 },
        { ...safeImage, pid: 2, width: 0, height: 0 },
      ]),
    ])

    expect(tiles[0].portrait).toBe(false)
    expect(tiles[1].portrait).toBe(true)
    expect(tiles[1].ratio).toBeCloseTo(0.75)
  })

  it('caps the tile count', () => {
    const images = Array.from({ length: 30 }, (_, index) => ({ ...safeImage, pid: index + 1 }))

    expect(selectShowcaseTiles([collection(1, images)])).toHaveLength(12)
  })

  it('returns nothing when the square is empty', () => {
    expect(selectShowcaseTiles([])).toEqual([])
  })
})
