import type { MessageApi } from 'naive-ui'
import type {
  AddSongToPlaylistDto,
  CreatePlaylistDto,
  Song,
  UserPlaylist,
} from '@/api/music'
import { ref } from 'vue'
import { userPlaylistApi } from '@/api/music'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface MusicPlaylistsOptions {
  message: MessageApi
}

interface ApiError {
  response?: { status?: number }
}

const emptyCreatePlaylistForm: CreatePlaylistDto = {
  name: '',
  description: '',
  coverUrl: '',
  isPublic: 0,
}

export function useMusicPlaylists(options: MusicPlaylistsOptions) {
  const showAddToPlaylistDialog = ref(false)
  const selectedSong = ref<Song | null>(null)
  const myPlaylists = ref<UserPlaylist[]>([])
  const loadingPlaylists = ref(false)
  const showCreatePlaylistDialog = ref(false)
  const createPlaylistForm = ref<CreatePlaylistDto>(createEmptyCreatePlaylistForm())

  async function loadMyPlaylists() {
    loadingPlaylists.value = true
    try {
      const res = await userPlaylistApi.getMyPlaylists()
      myPlaylists.value = unwrapApiList<UserPlaylist>(res)
    }
    catch {
      myPlaylists.value = []
    }
    finally {
      loadingPlaylists.value = false
    }
  }

  async function handleShowAddToPlaylist(song: Song) {
    selectedSong.value = song
    showAddToPlaylistDialog.value = true
    await loadMyPlaylists()
  }

  async function handleAddToPlaylist(playlistId: number) {
    if (!selectedSong.value)
      return

    try {
      await userPlaylistApi.addSongToPlaylist(playlistId, toPlaylistSong(selectedSong.value))
      options.message.success('已添加到歌单')
      showAddToPlaylistDialog.value = false
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return

      const err = error as ApiError
      if (err.response?.status === 409) {
        showApiError(options.message, error, '添加失败', { messageOverride: '歌曲已存在于歌单中' })
        return
      }

      showApiError(options.message, error, '添加失败')
    }
  }

  function handleShowCreatePlaylist() {
    showAddToPlaylistDialog.value = false
    showCreatePlaylistDialog.value = true
  }

  async function handleCreatePlaylist() {
    if (!createPlaylistForm.value.name.trim()) {
      options.message.warning('请输入歌单名称')
      return
    }

    try {
      const newPlaylist = await userPlaylistApi.createPlaylist(createPlaylistForm.value)
      options.message.success('创建成功')
      createPlaylistForm.value = createEmptyCreatePlaylistForm()
      showCreatePlaylistDialog.value = false

      if (selectedSong.value && newPlaylist) {
        const playlistData = unwrapApiData<UserPlaylist | null>(newPlaylist, null)
        if (playlistData?.id)
          await handleAddToPlaylist(playlistData.id)
        return
      }

      await loadMyPlaylists()
      showAddToPlaylistDialog.value = true
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '创建失败')
    }
  }

  function handleCancelCreate() {
    showCreatePlaylistDialog.value = false
    showAddToPlaylistDialog.value = true
  }

  return {
    createPlaylistForm,
    handleAddToPlaylist,
    handleCancelCreate,
    handleCreatePlaylist,
    handleShowAddToPlaylist,
    handleShowCreatePlaylist,
    loadingPlaylists,
    myPlaylists,
    selectedSong,
    showAddToPlaylistDialog,
    showCreatePlaylistDialog,
  }
}

function createEmptyCreatePlaylistForm(): CreatePlaylistDto {
  return { ...emptyCreatePlaylistForm }
}

function toPlaylistSong(song: Song): AddSongToPlaylistDto {
  return {
    songId: song.id,
    songName: song.name,
    artistName: song.artists.map(artist => artist.name).join('/'),
    albumName: song.album.name,
    coverUrl: song.album.picUrl,
    duration: song.duration,
  }
}
