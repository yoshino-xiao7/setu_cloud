// @vitest-environment jsdom
import { NDialogProvider, NMessageProvider } from 'naive-ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import GalleryUpload from '@/views/dashboard/GalleryUpload.vue'

const listResponse = {
  total: 1,
  page: 1,
  pageSize: 10,
  list: [{
    batchId: 1,
    userId: 1,
    pidMode: 'MULTI_PID_P0',
    status: 'PUBLISHED',
    title: '测试投稿',
    author: '作者',
    itemCount: 1,
    uploadedCount: 1,
    approvedCount: 1,
    rejectedCount: 0,
    publishedCount: 1,
    tags: ['tag'],
    createdAt: '2026-09-18T00:00:00',
  }],
}

vi.mock('vue-router', () => ({ useRoute: () => ({ query: { batchId: '1' } }) }))
vi.mock('@/api/galleryUpload', () => ({
  fetchMyGalleryUploadBatches: vi.fn(async () => listResponse),
  fetchMyGalleryUploadBatchDetail: vi.fn(async () => null),
  cancelGalleryUploadBatch: vi.fn(async () => ''),
  createGalleryUploadBatch: vi.fn(),
  updateGalleryUploadItemStatus: vi.fn(),
  completeGalleryUploadBatch: vi.fn(),
  calculateFileSha256: vi.fn(),
  uploadGalleryFileToOss: vi.fn(),
}))

describe('gallery upload page rendering', () => {
  let app: ReturnType<typeof createApp> | undefined

  afterEach(() => {
    app?.unmount()
    app = undefined
    document.body.innerHTML = ''
    localStorage.clear()
  })

  it('renders 我的投稿 records without a Vue render error', async () => {
    const errors: unknown[] = []
    app = createApp({
      setup: () => () => h(NMessageProvider, null, {
        default: () => h(NDialogProvider, null, { default: () => h(GalleryUpload) }),
      }),
    })
    app.config.errorHandler = error => errors.push(error)
    app.mount(document.body.appendChild(document.createElement('div')))

    await nextTick()
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))
    await nextTick()

    expect(errors).toEqual([])
    expect(document.body.textContent).toContain('测试投稿')
  })
})
