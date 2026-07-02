import { describe, expect, it } from 'vitest'
import {
  getFileDraftKey,
  getPersistedFileFromRecord,
} from '@/composables/useGalleryUploadFileDrafts'

describe('gallery upload file draft helpers', () => {
  it('creates stable file draft keys from file identity fields', () => {
    const file = new File(['image-bytes'], 'sample.png', {
      type: 'image/png',
      lastModified: 123,
    })

    expect(getFileDraftKey(file)).toBe('sample.png::11::123')
  })

  it('returns stored File records without wrapping them again', () => {
    const file = new File(['image-bytes'], 'sample.png', {
      type: 'image/png',
      lastModified: 123,
    })

    expect(getPersistedFileFromRecord({
      fileKey: getFileDraftKey(file),
      filename: file.name,
      contentType: file.type,
      lastModified: file.lastModified,
      file,
      savedAt: 456,
    })).toBe(file)
  })

  it('restores Blob records as Files for browsers that serialize files loosely', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/png' })
    const file = getPersistedFileFromRecord({
      fileKey: 'sample.png::11::123',
      filename: 'sample.png',
      contentType: 'image/png',
      lastModified: 123,
      file: blob,
      savedAt: 456,
    })

    expect(file).toBeInstanceOf(File)
    expect(file?.name).toBe('sample.png')
    expect(file?.type).toBe('image/png')
    expect(file?.lastModified).toBe(123)
    await expect(file?.text()).resolves.toBe('image-bytes')
  })
})
