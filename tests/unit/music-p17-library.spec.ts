import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { musicV2Api } from '@/api/musicV2'
import { createMusicLibraryState } from '@/composables/useMusicLibrary'

vi.mock('@/api/http', () => ({ clearHttpCache: vi.fn() }))
vi.mock('@/api/musicFlags', () => ({ musicFlags: { likedTracksEnabled: true, favoritePlaylistsEnabled: true } }))
vi.mock('@/api/musicV2', () => ({ musicV2Api: { liked: vi.fn(), saved: vi.fn(), like: vi.fn(), save: vi.fn() } }))
const page = (items: unknown[] = []) => ({ items, offset: 0, limit: 20, total: items.length, hasMore: false, nextOffset: null })
const id = 'netease:track:9007199254740993'
const row = { ownerId: 'setu:user:1', trackId: id, track: null, likedAt: '2026-09-06T00:00:00Z' }
function deferred() {
  let resolve!: () => void
  let reject!: (e: Error) => void
  const promise = new Promise<void>((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject,
  }
}
let scope = effectScope()
beforeEach(() => {
  vi.resetAllMocks()
  scope = effectScope()
  vi.mocked(musicV2Api.liked).mockResolvedValue(page() as never)
  vi.mocked(musicV2Api.saved).mockResolvedValue(page() as never)
})
afterEach(() => scope.stop())
function setup() {
  const owner = ref<string | null>('1')
  const state = scope.run(() => createMusicLibraryState(() => owner.value))!
  return { owner, state,
  }
}
describe('p17 library lifecycle', () => {
  it('optimistically selects and rolls back failed writes without replay', async () => {
    const { state } = setup()
    await state.ensureMemberships()
    const write = deferred()
    vi.mocked(musicV2Api.like).mockReturnValue(write.promise)
    const result = state.toggle('liked', id)
    await Promise.resolve()
    expect(state.likedIDs.value?.has(id)).toBe(true)
    write.reject(new Error('offline'))
    await expect(result).rejects.toThrow('offline')
    expect(state.likedIDs.value?.has(id)).toBe(false)
    expect(musicV2Api.like).toHaveBeenCalledTimes(1)
  })
  it('preserves a nullable resource relation and reconciles after write', async () => {
    vi.mocked(musicV2Api.liked).mockResolvedValue(page([row]) as never)
    const { state } = setup()
    await state.ensureMemberships()
    await state.load('liked')
    expect(state.liked.value.items[0]?.track).toBeNull()
    vi.mocked(musicV2Api.like).mockImplementation(async () => {
      vi.mocked(musicV2Api.liked).mockResolvedValue(page() as never)
    })
    await state.toggle('liked', id)
    await state.ensureMemberships()
    expect(state.likedIDs.value?.has(id)).toBe(false)
    expect(musicV2Api.liked).toHaveBeenCalledTimes(4)
  })
  it('suppresses duplicate writes after shared initial hydration', async () => {
    const { state } = setup()
    const write = deferred()
    vi.mocked(musicV2Api.like).mockReturnValue(write.promise)
    const first = state.toggle('liked', id)
    const second = state.toggle('liked', id)
    for (let i = 0; i < 8; i++)
      await Promise.resolve()
    expect(musicV2Api.like).toHaveBeenCalledTimes(1)
    write.resolve()
    await Promise.all([first, second])
  })
  it('revokes old user results and rollback on account switch', async () => {
    const { state, owner } = setup()
    await state.ensureMemberships()
    const write = deferred()
    vi.mocked(musicV2Api.like).mockReturnValue(write.promise)
    const result = state.toggle('liked', id)
    await Promise.resolve()
    owner.value = '2'
    write.reject(new Error('offline'))
    await expect(result).rejects.toThrow()
    expect(state.likedIDs.value).toBeNull()
    expect(state.pending.value.size).toBe(0)
  })
  it('rejects data from another user', async () => {
    vi.mocked(musicV2Api.liked).mockResolvedValue(page([{ ...row, ownerId: 'setu:user:2' }]) as never)
    const { state } = setup()
    await expect(state.ensureMemberships()).rejects.toThrow('用户不匹配')
    expect(state.likedIDs.value).toBeNull()
  })
  it('follows server nextOffset when the resource collection is sparse', async () => {
    vi.mocked(musicV2Api.liked).mockResolvedValueOnce({ ...page([]), hasMore: true, nextOffset: 12 } as never).mockResolvedValueOnce({ ...page([row]), offset: 12 } as never)
    const { state } = setup()
    await state.ensureMemberships()
    expect(musicV2Api.liked).toHaveBeenNthCalledWith(2, 12)
    expect(state.likedIDs.value?.has(id)).toBe(true)
  })
})
