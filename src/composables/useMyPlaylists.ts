import type { MessageApi } from 'naive-ui'
import type { CreatePlaylistDto, UserPlaylist } from '@/api/music'
import { computed, onMounted, ref } from 'vue'
import { userPlaylistApi } from '@/api/music'
import { unwrapApiList } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { PLAYLIST_PLAY_MODE_NAMES } from '@/composables/usePlaylistDetail'

interface MusicStoreLike {
  lastPlaybackError?: string
  loadPlaylistDetail: (playlistId: number) => Promise<UserPlaylist | null | undefined>
  playPlaylist: (playlist: UserPlaylist) => Promise<boolean>
}

export interface UseMyPlaylistsOptions {
  message: MessageApi
  musicStore: MusicStoreLike
}

function createEmptyPlaylistForm(): CreatePlaylistDto {
  return {
    name: '',
    description: '',
    coverUrl: '',
    isPublic: 0,
  }
}

export function useMyPlaylists(options: UseMyPlaylistsOptions) {
  const loading = ref(false)
  const playlists = ref<UserPlaylist[]>([])
  const showCreateDialog = ref(false)
  const formData = ref<CreatePlaylistDto>(createEmptyPlaylistForm())

  const playlistStats = computed(() => ({
    total: playlists.value.length,
    songs: playlists.value.reduce((sum, item) => sum + Number(item.songCount || 0), 0),
    plays: playlists.value.reduce((sum, item) => sum + Number(item.playCount || 0), 0),
  }))

  async function loadPlaylists() {
    loading.value = true
    try {
      const res = await userPlaylistApi.getMyPlaylists()
      playlists.value = unwrapApiList<UserPlaylist>(res)
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载失败')
    }
    finally {
      loading.value = false
    }
  }

  async function handleCreate() {
    if (!formData.value.name.trim()) {
      options.message.warning('请输入歌单名称')
      return
    }

    try {
      await userPlaylistApi.createPlaylist(formData.value)
      options.message.success('创建成功')
      showCreateDialog.value = false
      formData.value = createEmptyPlaylistForm()
      await loadPlaylists()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '创建失败')
    }
  }

  async function handlePlay(playlist: UserPlaylist) {
    const detail = await options.musicStore.loadPlaylistDetail(playlist.id)
    if (!detail?.songs?.length) {
      options.message.warning('歌单为空')
      return
    }

    const success = await options.musicStore.playPlaylist(detail)
    if (success)
      options.message.success(`开始播放《${detail.name}》`)
    else
      options.message.error(options.musicStore.lastPlaybackError || '播放失败')
  }

  async function handleDelete(id: number) {
    try {
      await userPlaylistApi.deletePlaylist(id)
      options.message.success('删除成功')
      await loadPlaylists()
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '删除失败')
    }
  }

  onMounted(() => {
    void loadPlaylists()
  })

  return {
    formData,
    handleCreate,
    handleDelete,
    handlePlay,
    loading,
    playlistStats,
    playlists,
    playModeNames: PLAYLIST_PLAY_MODE_NAMES,
    showCreateDialog,
  }
}
