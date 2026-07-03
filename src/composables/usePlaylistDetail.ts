import type { MessageApi } from 'naive-ui'
import type { UserPlaylist } from '@/api/music'
import { onMounted, ref } from 'vue'
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
  getPlaylistId: () => number
  message: MessageApi
  musicStore: MusicStoreLike
}

export function usePlaylistDetail(options: UsePlaylistDetailOptions) {
  const loading = ref(false)
  const playlist = ref<UserPlaylist | null>(null)
  const showEditDialog = ref(false)
  const editForm = ref({
    name: '',
    description: '',
    coverUrl: '',
    isPublic: 0 as 0 | 1,
  })

  async function loadPlaylist() {
    const id = options.getPlaylistId()
    if (!id)
      return

    loading.value = true
    try {
      const res = await userPlaylistApi.getPlaylistById(id)
      playlist.value = unwrapApiData<UserPlaylist | null>(res, null)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载失败')
    }
    finally {
      loading.value = false
    }
  }

  async function handlePlayAll() {
    if (!playlist.value)
      return

    const success = await options.musicStore.playPlaylist(playlist.value)
    if (success)
      options.message.success('开始播放')
    else
      options.message.error(options.musicStore.lastPlaybackError || '播放失败')
  }

  async function handleUpdatePlayMode(mode: PlaylistPlayMode) {
    if (!playlist.value)
      return

    try {
      await userPlaylistApi.updatePlayMode(playlist.value.id, mode)
      playlist.value.playMode = mode
      options.message.success(`已切换到${PLAYLIST_PLAY_MODE_NAMES[mode]}`)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '切换失败')
    }
  }

  async function handleRemoveSong(songId: number) {
    if (!playlist.value)
      return

    try {
      await userPlaylistApi.removeSongFromPlaylist(playlist.value.id, songId)
      options.message.success('已移除')
      await loadPlaylist()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '移除失败')
    }
  }

  function handleShowEdit() {
    if (!playlist.value)
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
    if (!playlist.value)
      return

    if (!editForm.value.name.trim()) {
      options.message.warning('请输入歌单名称')
      return
    }

    try {
      await userPlaylistApi.updatePlaylist(playlist.value.id, editForm.value)
      options.message.success('修改成功')
      showEditDialog.value = false
      await loadPlaylist()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '修改失败')
    }
  }

  onMounted(() => {
    void loadPlaylist()
  })

  return {
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
