<script setup lang="ts">
import type { UserPlaylist } from '@/api/music'
import {
  ArrowBackOutline,
  CreateOutline,
  MusicalNotesOutline,
  PlayCircleOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPopconfirm,
  NRadio,
  NRadioGroup,
  NSkeleton,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userPlaylistApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useMusicStore } from '@/stores/music'
import { formatDuration } from '@/utils/dateFormat'

const message = useMessage()
const route = useRoute()
const router = useRouter()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const loading = ref(false)
const playlist = ref<UserPlaylist | null>(null)
const showEditDialog = ref(false) // ✅ 编辑对话框

const editForm = ref({
  name: '',
  description: '',
  coverUrl: '',
  isPublic: 0 as 0 | 1,
})

const playModeNames: Record<string, string> = {
  sequence: '顺序播放',
  random: '随机播放',
  loop: '列表循环',
  single: '单曲循环',
}

// =======================
// 加载歌单详情
// =======================
async function loadPlaylist() {
  const id = Number(route.params.id)
  if (!id)
    return

  loading.value = true
  try {
    const res = await userPlaylistApi.getPlaylistById(id)
    playlist.value = unwrapApiData<UserPlaylist | null>(res, null)
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '加载失败')
  }
  finally {
    loading.value = false
  }
}

// =======================
// 播放歌单
// =======================
async function handlePlayAll() {
  if (!playlist.value)
    return

  const success = await musicStore.playPlaylist(playlist.value)

  if (success) {
    message.success('开始播放')
  }
  else {
    message.error(musicStore.lastPlaybackError || '播放失败')
  }
}

// =======================
// 更新播放模式
// =======================
async function handleUpdatePlayMode(mode: 'sequence' | 'random' | 'loop' | 'single') {
  if (!playlist.value)
    return

  try {
    await userPlaylistApi.updatePlayMode(playlist.value.id, mode)
    playlist.value.playMode = mode
    message.success(`已切换到${playModeNames[mode]}`)
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '切换失败')
  }
}

// =======================
// 从歌单移除歌曲
// =======================
async function handleRemoveSong(songId: number) {
  if (!playlist.value)
    return

  try {
    await userPlaylistApi.removeSongFromPlaylist(playlist.value.id, songId)
    message.success('已移除')
    await loadPlaylist()
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '移除失败')
  }
}

// =======================
// 返回
// =======================
function handleBack() {
  router.back()
}

// =======================
// ✅ 编辑歌单
// =======================
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
    message.warning('请输入歌单名称')
    return
  }

  try {
    await userPlaylistApi.updatePlaylist(playlist.value.id, editForm.value)
    message.success('修改成功')
    showEditDialog.value = false
    await loadPlaylist()
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '修改失败')
  }
}

// =======================
// 生命周期
// =======================
onMounted(() => {
  loadPlaylist()
})
</script>

<template>
  <div class="playlist-detail-page page-container ui-page">
    <NButton text class="back-button" @click="handleBack">
      <template #icon>
        <NIcon><ArrowBackOutline /></NIcon>
      </template>
      返回
    </NButton>

    <div v-if="loading">
      <NSkeleton height="200px" style="margin-bottom: 24px;" />
      <NSkeleton height="60px" :repeat="5" />
    </div>

    <div v-else-if="playlist">
      <!-- 歌单头部 -->
      <div class="playlist-header ui-card ui-page-header">
        <div class="header-cover">
          <img
            v-if="playlist.coverUrl"
            :src="playlist.coverUrl"
            :alt="playlist.name"
            referrerpolicy="no-referrer"
          >
          <div v-else class="cover-placeholder">
            <NIcon size="64" color="#999">
              <MusicalNotesOutline />
            </NIcon>
          </div>
        </div>

        <div class="header-info">
          <div class="header-title-row">
            <h1 class="ui-page-title">
              {{ playlist.name }}
            </h1>
            <NButton circle secondary title="编辑歌单" @click="handleShowEdit">
              <template #icon>
                <NIcon><CreateOutline /></NIcon>
              </template>
            </NButton>
          </div>
          <p class="description">
            {{ playlist.description || '暂无描述' }}
          </p>

          <div class="meta-info">
            <NTag :bordered="false">
              {{ playlist.songCount }} 首歌曲
            </NTag>
            <NTag :bordered="false">
              播放 {{ playlist.playCount }} 次
            </NTag>
          </div>

          <div class="play-mode-control">
            <span>播放模式:</span>
            <NRadioGroup :value="playlist.playMode" @update:value="handleUpdatePlayMode">
              <NRadio value="sequence">
                顺序
              </NRadio>
              <NRadio value="random">
                随机
              </NRadio>
              <NRadio value="loop">
                循环
              </NRadio>
              <NRadio value="single">
                单曲
              </NRadio>
            </NRadioGroup>
          </div>

          <NButton type="primary" size="large" @click="handlePlayAll">
            <template #icon>
              <NIcon><PlayCircleOutline /></NIcon>
            </template>
            播放全部
          </NButton>
        </div>
      </div>

      <!-- 歌曲列表 -->
      <div class="songs-section ui-card">
        <h3>歌曲列表 ({{ playlist.songs?.length || 0 }})</h3>

        <div v-if="!playlist.songs || playlist.songs.length === 0" class="empty-songs">
          <NEmpty description="歌单为空" />
        </div>

        <div v-else class="song-list">
          <div
            v-for="(song, index) in playlist.songs"
            :key="song.id"
            class="song-item"
          >
            <div class="song-index">
              {{ index + 1 }}
            </div>

            <div class="song-cover">
              <img
                v-if="song.coverUrl"
                :src="song.coverUrl"
                :alt="song.songName"
                referrerpolicy="no-referrer"
              >
              <NIcon v-else size="32">
                <MusicalNotesOutline />
              </NIcon>
            </div>

            <div class="song-info">
              <div class="song-name">
                {{ song.songName }}
              </div>
              <div class="song-artist">
                {{ song.artistName }} - {{ song.albumName || '未知专辑' }}
              </div>
            </div>

            <div class="song-duration">
              {{ formatDuration(song.duration) }}
            </div>

            <div class="song-actions">
              <NPopconfirm @positive-click="handleRemoveSong(song.songId)">
                <template #trigger>
                  <NButton circle quaternary type="error" size="small">
                    <template #icon>
                      <NIcon><TrashOutline /></NIcon>
                    </template>
                  </NButton>
                </template>
                确定移除这首歌吗？
              </NPopconfirm>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state ui-card">
      <NEmpty description="歌单不存在" />
    </div>

    <!-- ✅ 编辑歌单对话框 -->
    <NModal
      v-model:show="showEditDialog"
      preset="dialog"
      title="编辑歌单"
      positive-text="保存"
      negative-text="取消"
      @positive-click="handleUpdatePlaylist"
    >
      <NForm :model="editForm" label-placement="left" label-width="80px" style="margin-top: 20px;">
        <NFormItem label="歌单名称" required>
          <NInput
            v-model:value="editForm.name"
            placeholder="输入歌单名称"
            maxlength="50"
            show-count
          />
        </NFormItem>

        <NFormItem label="描述">
          <NInput
            v-model:value="editForm.description"
            type="textarea"
            placeholder="描述一下这个歌单..."
            maxlength="200"
            show-count
            :rows="3"
          />
        </NFormItem>

        <NFormItem label="封面URL">
          <NInput
            v-model:value="editForm.coverUrl"
            placeholder="可选，留空将显示默认封面"
          />
        </NFormItem>

        <NFormItem label="公开">
          <NSwitch v-model:value="editForm.isPublic" :checked-value="1" :unchecked-value="0">
            <template #checked>
              公开
            </template>
            <template #unchecked>
              私密
            </template>
          </NSwitch>
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped>
.back-button {
  align-self: flex-start;
  margin-bottom: 16px;
}

/* 歌单头部 */
.playlist-header {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 24px;
  background:
    radial-gradient(circle at 92% 14%, rgba(96, 165, 250, 0.15), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.header-cover {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc, #edf5ff);
  flex-shrink: 0;
}

.header-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h1 {
  margin: 0;
  flex: 1;
}

.description {
  font-size: 14px;
  color: var(--ui-muted);
  margin: 0;
}

.meta-info {
  display: flex;
  gap: 12px;
}

.play-mode-control {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #6b7280;
}

/* 歌曲列表 */
.songs-section {
  padding: 22px;
}

.songs-section h3 {
  font-size: 18px;
  font-weight: 800;
  color: var(--ui-text);
  margin: 0 0 16px 0;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.song-item:hover {
  background: rgba(255, 245, 248, 0.9);
  transform: translateX(2px);
}

.song-index {
  width: 32px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.song-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: 13px;
  color: var(--ui-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-duration {
  font-size: 14px;
  color: #6b7280;
  margin-right: 16px;
}

.empty-songs {
  padding: 60px 20px;
  text-align: center;
}

.empty-state {
  min-height: 320px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 64px 20px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .playlist-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .header-cover {
    width: 160px;
    height: 160px;
  }

  .header-info {
    align-items: center;
  }

  .play-mode-control {
    flex-direction: column;
    align-items: center;
  }

  .song-index {
    display: none;
  }

  .song-duration {
    display: none;
  }
}
</style>
