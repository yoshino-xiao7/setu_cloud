import type { LikedTrack, Page, SavedPlaylist } from '@/api/musicV2Models'
import { ref, shallowRef, watch } from 'vue'
import { clearHttpCache } from '@/api/http'
import { musicFlags } from '@/api/musicFlags'
import { typedMusicID } from '@/api/musicIdentity'
import { musicV2Api } from '@/api/musicV2'

const emptyPage = <T>(): Page<T> => ({ items: [], offset: 0, limit: 20, total: 0, hasMore: false, nextOffset: null })
/** Owned by the existing music Pinia store. Mirrors P15's optimistic/rollback/reconcile lifecycle. */
export function createMusicLibraryState(owner: () => string | null) {
  const liked = shallowRef(emptyPage<LikedTrack>())
  const saved = shallowRef(emptyPage<SavedPlaylist>())
  const likedIDs = shallowRef<Set<string> | null>(null)
  const savedIDs = shallowRef<Set<string> | null>(null)
  const pending = shallowRef(new Set<string>())
  const loading = ref(false)
  const error = ref('')
  let loadRequest = 0
  let generation = 0
  let revision = 0
  let hydration: Promise<void> | null = null
  let loadedAt = 0
  watch(owner, () => {
    loadRequest++
    generation++
    revision++
    liked.value = emptyPage()
    saved.value = emptyPage()
    likedIDs.value = null
    savedIDs.value = null
    pending.value = new Set()
    hydration = null
    loading.value = false
    error.value = ''
    loadedAt = 0
    clearHttpCache()
  }, { flush: 'sync' })
  function verifyOwner(rows: {
    ownerId: string
  }[]) {
    if (rows.some(row => row.ownerId !== `setu:user:${owner()}`))
      throw new Error('音乐库用户不匹配')
  }
  async function complete<T extends {
    ownerId: string
  }>(fetch: (offset: number) => Promise<Page<T>>) {
    const rows: T[] = []
    let offset = 0
    while (true) {
      const page = await fetch(offset)
      verifyOwner(page.items)
      rows.push(...page.items)
      if (!page.hasMore)
        return rows
      if (page.nextOffset === null || page.nextOffset <= offset)
        throw new Error('音乐库分页位置无效')
      offset = page.nextOffset
    }
  }
  async function ensureMemberships(force = false): Promise<void> {
    if (!owner())
      throw new Error('请先登录')
    if (!force && likedIDs.value && savedIDs.value && Date.now() - loadedAt < 60000)
      return
    if (hydration)
      return hydration
    const epoch = generation
    const version = revision
    const task = (async () => {
      const [likes, saves] = await Promise.all([
        musicFlags.likedTracksEnabled ? complete(musicV2Api.liked) : Promise.resolve([]),
        musicFlags.favoritePlaylistsEnabled ? complete(musicV2Api.saved) : Promise.resolve([]),
      ])
      if (epoch !== generation || version !== revision || pending.value.size)
        return
      likedIDs.value = new Set(likes.map(item => item.trackId))
      savedIDs.value = new Set(saves.map(item => item.playlistId))
      loadedAt = Date.now()
    })()
    hydration = task
    try {
      await task
    }
    finally {
      if (hydration === task)
        hydration = null
    }
  }
  async function load(kind: 'liked' | 'saved', append = false) {
    if (!owner()) {
      error.value = '请先登录'
      return
    }
    if (!(kind === 'liked' ? musicFlags.likedTracksEnabled : musicFlags.favoritePlaylistsEnabled))
      return
    const state = kind === 'liked' ? liked : saved
    const offset = append ? state.value.nextOffset : 0
    if (offset === null || (append && loading.value))
      return
    const request = ++loadRequest
    const epoch = generation
    const version = revision
    loading.value = true
    error.value = ''
    try {
      if (kind === 'liked') {
        const page = await musicV2Api.liked(offset)
        if (epoch !== generation || version !== revision || request !== loadRequest)
          return
        verifyOwner(page.items)
        liked.value = { ...page, items: append ? [...liked.value.items, ...page.items] : page.items }
      }
      else {
        const page = await musicV2Api.saved(offset)
        if (epoch !== generation || version !== revision || request !== loadRequest)
          return
        verifyOwner(page.items)
        saved.value = { ...page, items: append ? [...saved.value.items, ...page.items] : page.items }
      }
    }
    catch (e) {
      if (epoch === generation && request === loadRequest)
        error.value = e instanceof Error ? e.message : '音乐库加载失败'
    }
    finally {
      if (epoch === generation && request === loadRequest)
        loading.value = false
    }
  }
  async function toggle(kind: 'liked' | 'saved', resource: string) {
    if (!(kind === 'liked' ? musicFlags.likedTracksEnabled : musicFlags.favoritePlaylistsEnabled))
      throw new Error('此音乐功能尚未开放')
    const id = typedMusicID(kind === 'liked' ? 'track' : 'playlist', resource)
    const key = `${kind}:${id}`
    if (pending.value.has(key))
      return
    const epoch = generation
    await ensureMemberships()
    if (epoch !== generation || pending.value.has(key))
      return
    const state = kind === 'liked' ? likedIDs : savedIDs
    if (!state.value)
      throw new Error('请刷新后确认收藏状态')
    const selected = state.value.has(id)
    const oldLiked = liked.value
    const oldSaved = saved.value
    const next = new Set(state.value)
    selected ? next.delete(id) : next.add(id)
    state.value = next
    pending.value = new Set([...pending.value, key])
    revision++
    if (selected && kind === 'liked')
      liked.value = { ...liked.value, items: liked.value.items.filter(item => item.trackId !== id) }
    if (selected && kind === 'saved')
      saved.value = { ...saved.value, items: saved.value.items.filter(item => item.playlistId !== id) }
    try {
      await (kind === 'liked' ? musicV2Api.like(id, !selected) : musicV2Api.save(id, !selected))
    }
    catch (e) {
      if (epoch === generation) {
        const rollback = new Set(state.value)
        selected ? rollback.add(id) : rollback.delete(id)
        state.value = rollback
        // Only restore this relation; another concurrent write may already have removed others.
        if (kind === 'liked' && selected)
          liked.value = { ...liked.value, items: oldLiked.items.filter(item => item.trackId === id || liked.value.items.some(row => row.trackId === item.trackId)) }
        if (kind === 'saved' && selected)
          saved.value = { ...saved.value, items: oldSaved.items.filter(item => item.playlistId === id || saved.value.items.some(row => row.playlistId === item.playlistId)) }
      }
      throw e
    }
    finally {
      if (epoch === generation) {
        const keys = new Set(pending.value)
        keys.delete(key)
        pending.value = keys
        clearHttpCache()
        // Unknown write outcomes reconcile via GET; never replay a mutation or switch to v1.
        if (!keys.size) {
          loadedAt = 0
          void ensureMemberships(true).catch(() => {
            if (epoch === generation)
              error.value = '后台对账暂未完成，请刷新确认状态'
          })
          void load(kind)
        }
      }
    }
  }
  return { liked, saved, likedIDs, savedIDs, pending, loading, error, load, toggle, ensureMemberships }
}
