import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCloudVideoUploadSession, syncAdminCloudVideo } from '@/api/admin'
import { useCloudVideoUploadStore } from '@/stores/cloudVideoUpload'

type MockUpload = {
  start: ReturnType<typeof vi.fn>
  succeed: () => void
  fail: (error: Error) => void
}

const uploads: MockUpload[] = []

vi.mock('tus-js-client', () => ({
  Upload: class {
    start: ReturnType<typeof vi.fn>

    constructor(
      _file: File,
      options: { onSuccess: () => void, onError: (error: Error) => void },
    ) {
      const item: MockUpload = {
        start: vi.fn(),
        succeed: () => options.onSuccess(),
        fail: error => options.onError(error),
      }
      uploads.push(item)
      this.start = item.start
    }
  },
}))

vi.mock('@/api/admin', () => ({
  createCloudVideoUploadSession: vi.fn(),
  syncAdminCloudVideo: vi.fn(),
}))

function videoFile(name: string) {
  return new File(['video-bytes'], name, { type: 'video/mp4' })
}

function sessionResponse(id: number) {
  return {
    data: {
      id,
      bunnyVideoId: `bunny-${id}`,
      libraryId: 1,
      tusEndpoint: 'https://example.test/tus',
      authorizationSignature: 'sig',
      authorizationExpire: 1,
      title: `video-${id}`,
      status: 'uploading',
    },
  }
}

describe('cloud video upload queue', () => {
  beforeEach(() => {
    uploads.length = 0
    setActivePinia(createPinia())
    vi.mocked(createCloudVideoUploadSession).mockReset()
    vi.mocked(syncAdminCloudVideo).mockReset()
    vi.mocked(createCloudVideoUploadSession).mockImplementation(async () => sessionResponse(
      vi.mocked(createCloudVideoUploadSession).mock.calls.length,
    ) as never)
    vi.mocked(syncAdminCloudVideo).mockResolvedValue({} as never)
  })

  it('uploads one file at a time and keeps later files queued', async () => {
    const store = useCloudVideoUploadStore()

    store.enqueue([videoFile('first.mp4'), videoFile('second.mp4')])
    await Promise.resolve()

    expect(store.running).toBe(true)
    expect(store.queuedCount).toBe(1)
    expect(store.summary).toContain('排队 1 个')
    expect(createCloudVideoUploadSession).toHaveBeenCalledTimes(1)
    expect(uploads).toHaveLength(1)

    store.enqueue([videoFile('third.mp4')])
    expect(store.queuedCount).toBe(2)
    expect(createCloudVideoUploadSession).toHaveBeenCalledTimes(1)

    uploads[0]?.succeed()
    await vi.waitFor(() => expect(uploads).toHaveLength(2))
    expect(createCloudVideoUploadSession).toHaveBeenCalledTimes(2)
    expect(store.queuedCount).toBe(1)

    uploads[1]?.succeed()
    await vi.waitFor(() => expect(uploads).toHaveLength(3))
    uploads[2]?.succeed()
    await vi.waitFor(() => expect(store.running).toBe(false))

    expect(store.queuedCount).toBe(0)
    expect(syncAdminCloudVideo).toHaveBeenCalledTimes(3)
    expect(store.completedTick).toBe(3)
  })

  it('continues the queue when one file fails', async () => {
    const store = useCloudVideoUploadStore()

    store.enqueue([videoFile('bad.mp4'), videoFile('ok.mp4')])
    await Promise.resolve()
    uploads[0]?.fail(new Error('tus failed'))
    await vi.waitFor(() => expect(uploads).toHaveLength(2))

    uploads[1]?.succeed()
    await vi.waitFor(() => expect(store.running).toBe(false))

    expect(store.completedTick).toBe(1)
    expect(store.notice).toMatchObject({ type: 'success' })
  })
})
