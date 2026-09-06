import type { MessageApi } from 'naive-ui'
import type { UserPlaylist } from '@/api/music'
import { computed, ref, watch } from 'vue'
import type { Membership, Page, Playlist as V2Playlist } from '@/api/musicV2Models'
import { musicV2Api } from '@/api/musicV2'
import { musicFlags } from '@/api/musicFlags'
import { legacyMusicID } from '@/api/musicIdentity'
import { useAuthStore } from '@/stores/auth'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { clearHttpCache } from '@/api/http'
import { userPlaylistApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

export type PlaylistPlayMode = UserPlaylist['playMode']

export const PLAYLIST_PLAY_MODE_NAMES: Record<PlaylistPlayMode, string> = {
  sequence: '顺序播放',
  random: '随机播放',
  loop: '列表循环',
  single: '单曲循环',
}

interface MusicStoreLike {
  lastPlaybackError?: string
  playPlaylist: (playlist: UserPlaylist) => Promise<boolean>
}

export interface UsePlaylistDetailOptions {
  getPlaylistId: () => string
  message: MessageApi
  musicStore: MusicStoreLike
}

export function usePlaylistDetail(options: UsePlaylistDetailOptions) {
  const auth = useAuthStore()
  const guard = useRequestGuard()
  const error = ref('')
  const v2Playlist = ref<V2Playlist | null>(null)
  const memberships = ref<Page<Membership> | null>(null)
  const editable = computed(() => !!auth.user && (v2Playlist.value ? v2Playlist.value.origin === 'local' && v2Playlist.value.ownerId === `setu:user:${auth.user.id}` : playlist.value?.userId === String(auth.user.id)))
  const loading = ref(false)
  const playlist = ref<UserPlaylist | null>(null)
  const showEditDialog = ref(false)
  const editForm = ref({
    name: '',
    description: '',
    coverUrl: '',
    isPublic: 0 as 0 | 1,
  })

  function applyRows() {
    const entity = v2Playlist.value
    if (!entity || !memberships.value) return
    playlist.value = {
      id: entity.origin === 'local' ? legacyMusicID(entity.id, 'playlist') : entity.id,
      userId: entity.ownerId?.replace('setu:user:', '') ?? '',
      name: entity.title, description: entity.description ?? '', coverUrl: entity.artwork?.url,
      isPublic: entity.visibility === 'private' ? 0 : 1,
      playMode: ['sequence', 'random', 'loop', 'single'].includes(entity.defaultPlaybackMode ?? '') ? entity.defaultPlaybackMode as PlaylistPlayMode : 'sequence',
      songCount: entity.trackCount ?? memberships.value.items.length, playCount: entity.playCount ?? 0,
      createdAt: entity.createdAt ?? '', updatedAt: entity.updatedAt ?? '',
      songs: memberships.value.items.map(row => ({ id: row.relationId ?? row.trackId, songId: row.trackId,
        songName: row.track?.title ?? '歌曲暂不可用', artistName: row.track?.artists.map(a => a.name).join(' / ') ?? '',
        albumName: row.track?.album?.title, coverUrl: row.track?.artwork?.url, duration: row.track?.durationMs ?? 0,
        sortOrder: row.position, createdAt: row.addedAt ?? '',
      })),
    }
  }
  async function loadPlaylist(append = false) {
    const id = options.getPlaylistId()
    const token = guard.next()
    if (!id || !auth.user) { playlist.value = null; loading.value = false; error.value = '请先登录'; return }
    loading.value = true
    error.value = ''
    try {
      // Bare IDs belong to the permanently retained /user/playlists/** surface.
      // Explicit canonical detail links keep their v2 identity.
      if (musicFlags.usesV2PlaylistDetail && id.includes(':')) {
        const typed = id
        if (append) {
          const offset = memberships.value?.nextOffset
          if (offset === null || offset === undefined) return
          const page = await musicV2Api.memberships(typed, offset)
          if (!guard.isCurrent(token)) return
          if (page.items.some(row => row.playlistId !== typed)) throw new Error('歌单成员归属不匹配')
          memberships.value = { ...page, items: [...(memberships.value?.items ?? []), ...page.items] }
        }
        else {
          const detail = await musicV2Api.playlist(typed)
          if (!guard.isCurrent(token)) return
          if (detail.playlist.id !== typed || detail.memberships.items.some(row => row.playlistId !== typed)) throw new Error('歌单资源不匹配')
          v2Playlist.value = detail.playlist
          memberships.value = detail.memberships
        }
        applyRows()
      }
      else {
        v2Playlist.value = null
        memberships.value = null
        const res = await userPlaylistApi.getPlaylistById(legacyMusicID(id, 'playlist'))
        if (guard.isCurrent(token)) playlist.value = unwrapApiData<UserPlaylist | null>(res, null)
      }
    }
    catch (e) {
      if (guard.isCurrent(token) && !shouldIgnoreApiError(e)) error.value = e instanceof Error ? e.message : '加载失败'
    }
    finally { if (guard.isCurrent(token)) loading.value = false }
  }

  async function handlePlayAll() {
    if (!playlist.value)
      return

    const playable = memberships.value ? new Set(memberships.value.items.filter(row => row.track && ['unknown', 'playable'].includes(row.track.availability.status)).map(row => row.trackId)) : null
    const selected = { ...playlist.value, songs: playlist.value.songs?.filter(row => !playable || playable.has(row.songId as Membership['trackId'])) }
    if (!selected.songs?.length) { options.message.info('暂无可播放歌曲'); return }
    const success = await options.musicStore.playPlaylist(selected)
    if (success)
      options.message.success('开始播放')
    else
      options.message.error(options.musicStore.lastPlaybackError || '播放失败')
  }

  async function handleUpdatePlayMode(mode: PlaylistPlayMode) {
    if (!playlist.value || !editable.value)
      return

    const target = playlist.value
    const owner = auth.user?.id
    try {
      await userPlaylistApi.updatePlayMode(target.id, mode)
      if (playlist.value !== target || auth.user?.id !== owner) return
      target.playMode = mode
      options.message.success(`已切换到${PLAYLIST_PLAY_MODE_NAMES[mode]}`)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '切换失败')
    }
  }

  async function handleRemoveSong(songId: string) {
    if (!playlist.value || !editable.value)
      return

    try {
      await userPlaylistApi.removeSongFromPlaylist(playlist.value.id, songId)
      clearHttpCache()
      options.message.success('已移除')
      await loadPlaylist()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '移除失败')
    }
  }

  function handleShowEdit() {
    if (!playlist.value || !editable.value)
      return

    editForm.value = {
      name: playlist.value.name,
      description: playlist.value.description || '',
      coverUrl: playlist.value.coverUrl || '',
      isPublic: playlist.value.isPublic,
    }
    showEditDialog.value = true
  }

  async function handleUpdatePlaylist() {
    if (!playlist.value || !editable.value)
      return

    if (!editForm.value.name.trim()) {
      options.message.warning('请输入歌单名称')
      return
    }

    try {
      await userPlaylistApi.updatePlaylist(playlist.value.id, editForm.value)
      clearHttpCache()
      options.message.success('修改成功')
      showEditDialog.value = false
      await loadPlaylist()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '修改失败')
    }
  }

  watch([options.getPlaylistId, () => auth.user?.id], () => {
    playlist.value = null; v2Playlist.value = null; memberships.value = null; showEditDialog.value = false
    void loadPlaylist()
  }, { immediate: true, flush: 'sync' })

  return {
    error,
    editable,
    v2Playlist,
    memberships,
    loadPlaylist,
    editForm,
    handlePlayAll,
    handleRemoveSong,
    handleShowEdit,
    handleUpdatePlaylist,
    handleUpdatePlayMode,
    loading,
    playlist,
    playModeNames: PLAYLIST_PLAY_MODE_NAMES,
    showEditDialog,
  }
}
