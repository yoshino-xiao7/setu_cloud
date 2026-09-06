import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { musicV2Api } from '@/api/musicV2'
import { useAuthStore } from '@/stores/auth'
import { useMusicSearchResults } from '@/composables/useMusicSearchResults'

vi.mock('@/api/musicV2', () => ({ musicV2Api: { search: vi.fn() } }))
vi.mock('@/api/music', () => ({ userMusicApi: { search: vi.fn() } }))
vi.mock('@/api/musicFlags', () => ({ musicFlags: { usesV2Search: true } }))
vi.mock('@/api/musicObservation', () => ({ observeMusic: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.resetAllMocks() })

describe('music search session reset', () => {
  it.each([false, true])('clears pending loading state on owner change (append=%s)', async (append) => {
    const auth = reactive({ user: { id: 1 } })
    vi.mocked(useAuthStore).mockReturnValue(auth as ReturnType<typeof useAuthStore>)
    const scope = effectScope()
    scopes.push(scope)
    const message = { info: vi.fn(), success: vi.fn() }
    const search = scope.run(() => useMusicSearchResults({ message, onError: vi.fn() }))!
    search.searchKeyword.value = 'music'
    let finish!: (page: Awaited<ReturnType<typeof musicV2Api.search>>) => void
    vi.mocked(musicV2Api.search).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const pending = append ? search.loadMoreSearchResults() : search.searchFirstPage()
    expect(append ? search.loadingMore.value : search.searching.value).toBe(true)

    auth.user = { id: 2 }
    await nextTick()
    expect(search.searching.value).toBe(false)
    expect(search.loadingMore.value).toBe(false)

    finish({ items: [], offset: 0, limit: 10, total: 0, hasMore: false, nextOffset: null })
    await pending
    expect(search.searchResults.value).toEqual([])
    expect(message.info).not.toHaveBeenCalled()
    expect(message.success).not.toHaveBeenCalled()
  })
})
