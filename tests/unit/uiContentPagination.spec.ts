import type { MessageApi } from 'naive-ui'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import http from '@/api/http'
import { musicHistoryApi } from '@/api/music'
import { musicV2Api } from '@/api/musicV2'
import { useAdminAiDeleteRequests } from '@/composables/useAdminAiDeleteRequests'
import { useAdminAiReviews } from '@/composables/useAdminAiReviews'
import { useMusicHistory } from '@/composables/useMusicHistory'
import { usePlaylistDetail } from '@/composables/usePlaylistDetail'

vi.mock('@/api/http', () => ({ default: { get: vi.fn(), post: vi.fn() }, clearHttpCache: vi.fn() }))
vi.mock('@/api/music', () => ({ musicHistoryApi: { getPage: vi.fn() }, userPlaylistApi: {} }))
vi.mock('@/api/musicV2', () => ({ musicV2Api: { playlist: vi.fn(), memberships: vi.fn() } }))
vi.mock('@/api/musicFlags', () => ({ musicFlags: { usesV2PlaylistDetail: true } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: 1 } }) }))
vi.mock('@/composables/useApiError', () => ({ shouldIgnoreApiError: () => false, showApiError: vi.fn() }))
const message = { error: vi.fn(), info: vi.fn(), warning: vi.fn(), success: vi.fn() } as unknown as MessageApi

async function setup<T>(factory: () => T) {
  let state!: T
  await renderToString(createSSRApp({
    setup() {
      state = factory()
      return () => h('div')
    },
  }))
  return state
}
beforeEach(() => vi.clearAllMocks())

describe('content boards keep remote pagination', () => {
  it('exposes review total and page size and requests only the selected page', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { list: [{ id: 21 }], total: 25, page: 3 } } as never)
    const state = await setup(() => useAdminAiReviews({ message }))
    state.page.value = 3
    await state.loadReviews()
    expect(http.get).toHaveBeenCalledTimes(1)
    expect(http.get).toHaveBeenCalledWith('/admin/ai/reviews', expect.objectContaining({ params: { status: 'WAITING', category: undefined, page: 3, pageSize: 10 } }))
    expect(state.reviews.value).toEqual([{ id: 21 }])
    expect([state.total.value, state.pageSize, state.pageCount.value]).toEqual([25, 10, 3])
  })

  it('keeps delete-request pagination and resets to page one on filter changes', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { list: [], total: 31, page: 1 } } as never)
    const state = await setup(() => useAdminAiDeleteRequests({ message }))
    state.page.value = 4
    state.status.value = 'REJECTED'
    state.resetPageAndLoad()
    await vi.waitFor(() => expect(state.loading.value).toBe(false))
    expect(http.get).toHaveBeenCalledWith('/admin/ai/delete-requests', expect.objectContaining({ params: { status: 'REJECTED', page: 1, pageSize: 10 } }))
    expect([state.total.value, state.pageSize, state.pageCount.value]).toEqual([31, 10, 4])
  })

  it('retains music history server offsets and never fetches the entire history', async () => {
    vi.mocked(musicHistoryApi.getPage).mockResolvedValue({ records: [], total: 53 })
    const state = await setup(() => useMusicHistory({ message, musicStore: { addToPlaylist: vi.fn(), playSong: vi.fn() } }))
    await vi.waitFor(() => expect(state.loading.value).toBe(false))
    state.pageSize.value = 10
    state.handlePageChange(3)
    await vi.waitFor(() => expect(state.loading.value).toBe(false))
    expect(musicHistoryApi.getPage).toHaveBeenLastCalledWith(10, 20)
    expect(state.totalPages.value).toBe(6)
    expect(musicHistoryApi.getPage).toHaveBeenCalledTimes(2)
  })

  it('appends one requested membership page in server order and stops at nextOffset null', async () => {
    const id = 'netease:playlist:123'
    const membership = (trackId: string, position: number) => ({ playlistId: id, trackId, relationId: null, position, track: null, addedAt: null })
    vi.mocked(musicV2Api.playlist).mockResolvedValue({ playlist: { id, origin: 'provider', title: '歌单', trackCount: 3 }, memberships: { items: [membership('netease:track:2', 0), membership('netease:track:1', 1)], hasMore: true, nextOffset: 2, total: 3 } } as never)
    vi.mocked(musicV2Api.memberships).mockResolvedValue({ items: [membership('netease:track:3', 2)], hasMore: false, nextOffset: null, total: 3 } as never)
    const state = await setup(() => usePlaylistDetail({ getPlaylistId: () => id, message, musicStore: { playPlaylist: vi.fn() } }))
    await vi.waitFor(() => expect(state.loading.value).toBe(false))
    expect(state.playlist.value?.songs?.map(row => row.songId)).toEqual(['netease:track:2', 'netease:track:1'])
    expect(musicV2Api.memberships).not.toHaveBeenCalled()
    await state.loadPlaylist(true)
    expect(musicV2Api.memberships).toHaveBeenCalledExactlyOnceWith(id, 2)
    expect(state.playlist.value?.songs?.map(row => row.songId)).toEqual(['netease:track:2', 'netease:track:1', 'netease:track:3'])
    await state.loadPlaylist(true)
    expect(musicV2Api.memberships).toHaveBeenCalledTimes(1)
  })
})
