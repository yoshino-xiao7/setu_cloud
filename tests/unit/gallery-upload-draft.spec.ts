import { describe, expect, it } from 'vitest'
import {
  createGalleryUploadDraft,
  createGalleryUploadDraftWatchSource,
  hasMeaningfulGalleryUploadDraft,
  parseGalleryUploadDraft,
} from '@/composables/useGalleryUploadDraft'

function createDraft() {
  return createGalleryUploadDraft({
    uploadIntentKey: 'intent-1',
    batchId: null,
    createBatchAttempted: false,
    includeSha256: true,
    form: {
      pidMode: 'MULTI_PID_P0',
      title: '',
      author: '',
      r18: false,
      aiType: 0,
      tagsText: '',
    },
    items: [],
  })
}

describe('gallery upload draft helpers', () => {
  it('keeps empty default drafts from being persisted', () => {
    expect(hasMeaningfulGalleryUploadDraft(createDraft())).toBe(false)
  })

  it('treats files and edited metadata as meaningful draft content', () => {
    const titledDraft = createDraft()
    titledDraft.form.title = '投稿标题'
    expect(hasMeaningfulGalleryUploadDraft(titledDraft)).toBe(true)

    const fileDraft = createGalleryUploadDraft({
      ...createDraft(),
      form: createDraft().form,
      items: [{
        fileKey: 'file:a.png:1:1',
        filename: 'a.png',
        contentType: 'image/png',
        sizeBytes: 1,
        lastModified: 1,
        pageIndex: 0,
        title: '',
        author: '',
        tagsText: '',
      }],
    })
    expect(hasMeaningfulGalleryUploadDraft(fileDraft)).toBe(true)
  })

  it('parses supported draft versions and rejects invalid payloads', () => {
    const draft = createDraft()

    expect(parseGalleryUploadDraft(JSON.stringify(draft))?.uploadIntentKey).toBe('intent-1')
    expect(parseGalleryUploadDraft(JSON.stringify({ version: 9, form: {} }))).toBeNull()
  })

  it('creates stable watch source entries for draft edits', () => {
    const source = createGalleryUploadDraftWatchSource(createDraft().form, true, [{
      fileKey: 'file:a.png:1:1',
      filename: 'a.png',
      contentType: 'image/png',
      sizeBytes: 1,
      lastModified: 1,
      pageIndex: 0,
      title: '',
      author: '',
      tagsText: '',
      sha256: 'abc',
    }])

    expect(source).toContain(true)
    expect(source.at(-1)).toBe('file:a.png:1:1:a.png:image/png:1:1:0::::abc')
  })
})
