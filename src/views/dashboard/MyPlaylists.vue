<script setup lang="ts">
import type { CreatePlaylistDto, UserPlaylist } from '@/api/music'
import {
  AddOutline,
  MusicalNotesOutline,
  PlayCircleOutline,
  PlayOutline,
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
  NSkeleton,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userPlaylistApi } from '@/api/music'
import { unwrapApiList } from '@/api/response'
import { getApiErrorMessage } from '@/composables/useApiError'
import { useMusicStore } from '@/stores/music'
import { safePush } from '@/utils/navigation'

const message = useMessage()
const router = useRouter()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const loading = ref(false)
const playlists = ref<UserPlaylist[]>([])
const showCreateDialog = ref(false)
const formData = ref<CreatePlaylistDto>({
  name: '',
  description: '',
  coverUrl: '',
  isPublic: 0,
})

const playModeNames: Record<string, string> = {
  sequence: '顺序播放',
  random: '随机播放',
  loop: '列表循环',
  single: '单曲循环',
}

const playlistStats = computed(() => ({
  total: playlists.value.length,
  songs: playlists.value.reduce((sum, item) => sum + Number(item.songCount || 0), 0),
  plays: playlists.value.reduce((sum, item) => sum + Number(item.playCount || 0), 0),
}))

// =======================
// 加载歌单列表
// =======================
async function loadPlaylists() {
  loading.value = true
  try {
    const res = await userPlaylistApi.getMyPlaylists()
    playlists.value = unwrapApiList<UserPlaylist>(res)
  }
  catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '加载失败')
    message.error(errMsg)
  }
  finally {
    loading.value = false
  }
}

// =======================
// 创建歌单
// =======================
async function handleCreate() {
  if (!formData.value.name.trim()) {
    message.warning('请输入歌单名称')
    return
  }

  try {
    await userPlaylistApi.createPlaylist(formData.value)
    message.success('创建成功')
    showCreateDialog.value = false

    // 重置表单
    formData.value = {
      name: '',
      description: '',
      coverUrl: '',
      isPublic: 0,
    }

    // 重新加载列表
    await loadPlaylists()
  }
  catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '创建失败')
    message.error(errMsg)
  }
}

// =======================
// 播放歌单
// =======================
async function handlePlay(playlist: UserPlaylist) {
  // 加载完整歌单详情
  const detail = await musicStore.loadPlaylistDetail(playlist.id)

  if (!detail || !detail.songs || detail.songs.length === 0) {
    message.warning('歌单为空')
    return
  }

  const success = await musicStore.playPlaylist(detail)

  if (success) {
    message.success(`开始播放《${detail.name}》`)
  }
  else {
    message.error('播放失败')
  }
}

// =======================
// 查看歌单详情
// =======================
function handleViewDetail(id: number) {
  void safePush(router, `/dashboard/playlist/${id}`)
}

// =======================
// 删除歌单
// =======================
async function handleDelete(id: number) {
  try {
    await userPlaylistApi.deletePlaylist(id)
    message.success('删除成功')
    await loadPlaylists()
  }
  catch (e: unknown) {
    const errMsg = getApiErrorMessage(e, '删除失败')
    message.error(errMsg)
  }
}

// =======================
// 生命周期
// =======================
onMounted(() => {
  loadPlaylists()
})
</script>

<template>
  <div class="my-playlists-page page-container ui-page">
    <!-- 头部 -->
    <div class="page-header ui-card ui-page-header">
      <div class="header-content">
        <div class="header-left">
          <NIcon size="32" color="#f586a9">
            <MusicalNotesOutline />
          </NIcon>
          <div>
            <h2 class="ui-page-title">
              我的歌单
            </h2>
            <p class="ui-page-subtitle">
              管理你的音乐收藏与播放偏好
            </p>
          </div>
        </div>
        <NButton type="primary" @click="showCreateDialog = true">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          创建歌单
        </NButton>
      </div>
    </div>

    <div class="playlist-overview">
      <div class="overview-card ui-card">
        <div class="overview-label">
          歌单数量
        </div>
        <div class="overview-value">
          {{ playlistStats.total }}
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-label">
          歌曲总数
        </div>
        <div class="overview-value">
          {{ playlistStats.songs }}
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-label">
          播放总量
        </div>
        <div class="overview-value">
          {{ playlistStats.plays }}
        </div>
      </div>
    </div>

    <!-- 歌单列表 -->
    <div v-if="loading" class="playlists-grid">
      <NSkeleton v-for="i in 6" :key="i" height="200px" />
    </div>

    <div v-else-if="playlists.length > 0" class="playlists-grid">
      <div
        v-for="playlist in playlists"
        :key="playlist.id"
        class="playlist-card ui-card ui-card-hover"
        @click="handleViewDetail(playlist.id)"
      >
        <div class="playlist-cover">
          <img
            v-if="playlist.coverUrl"
            :src="playlist.coverUrl"
            :alt="playlist.name"
            referrerpolicy="no-referrer"
          >
          <div v-else class="cover-placeholder">
            <NIcon size="48" color="#999">
              <MusicalNotesOutline />
            </NIcon>
          </div>

          <!-- 播放按钮覆盖层 -->
          <div class="play-overlay" @click.stop="handlePlay(playlist)">
            <NIcon size="48" color="#fff">
              <PlayCircleOutline />
            </NIcon>
          </div>
        </div>

        <div class="playlist-info">
          <h3 class="playlist-name">
            {{ playlist.name }}
          </h3>
          <p class="playlist-description">
            {{ playlist.description || '暂无描述' }}
          </p>

          <div class="playlist-meta">
            <NTag size="small" :bordered="false">
              {{ playModeNames[playlist.playMode] || '顺序播放' }}
            </NTag>
            <span class="song-count">{{ playlist.songCount }} 首</span>
            <span class="play-count">
              <NIcon size="14"><PlayOutline /></NIcon>
              {{ playlist.playCount }}
            </span>
          </div>
        </div>

        <div class="playlist-actions" @click.stop>
          <NPopconfirm @positive-click="handleDelete(playlist.id)">
            <template #trigger>
              <NButton circle quaternary type="error" size="small">
                <template #icon>
                  <NIcon><TrashOutline /></NIcon>
                </template>
              </NButton>
            </template>
            确定删除歌单《{{ playlist.name }}》吗？
          </NPopconfirm>
        </div>
      </div>
    </div>

    <div v-else class="empty-state ui-card">
      <NEmpty description="还没有歌单，创建一个吧！" size="large">
        <template #icon>
          <NIcon size="80">
            <MusicalNotesOutline />
          </NIcon>
        </template>
        <template #extra>
          <NButton type="primary" @click="showCreateDialog = true">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            创建歌单
          </NButton>
        </template>
      </NEmpty>
    </div>

    <!-- 创建歌单对话框 -->
    <NModal
      v-model:show="showCreateDialog"
      preset="dialog"
      title="创建歌单"
      positive-text="创建"
      negative-text="取消"
      @positive-click="handleCreate"
    >
      <NForm :model="formData" label-placement="left" label-width="80px" style="margin-top: 20px;">
        <NFormItem label="歌单名称" required>
          <NInput
            v-model:value="formData.name"
            placeholder="输入歌单名称"
            maxlength="50"
            show-count
          />
        </NFormItem>

        <NFormItem label="描述">
          <NInput
            v-model:value="formData.description"
            type="textarea"
            placeholder="描述一下这个歌单..."
            maxlength="200"
            show-count
            :rows="3"
          />
        </NFormItem>

        <NFormItem label="封面URL">
          <NInput
            v-model:value="formData.coverUrl"
            placeholder="可选，留空将显示默认封面"
          />
        </NFormItem>

        <NFormItem label="公开">
          <NSwitch v-model:value="formData.isPublic" :checked-value="1" :unchecked-value="0">
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
/* 头部 */
.page-header {
  padding: 24px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0 0 4px 0;
}

.header-left p {
  margin: 0;
}

.playlist-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  min-height: 96px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.overview-label {
  color: var(--ui-text-muted);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.overview-value {
  color: var(--ui-text);
  font-size: 26px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

/* 歌单网格 */
.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.playlist-card {
  padding: 16px;
  cursor: pointer;
  position: relative;
}

.playlist-card:hover {
  transform: translateY(-4px);
}

.playlist-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc, #edf5ff);
  margin-bottom: 12px;
  position: relative;
}

.playlist-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .35s ease;
}

.playlist-card:hover .playlist-cover img {
  transform: scale(1.035);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.playlist-card:hover .play-overlay {
  opacity: 1;
}

.playlist-info {
  margin-bottom: 12px;
}

.playlist-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-description {
  font-size: 13px;
  color: var(--ui-muted);
  margin: 0 0 12px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
  min-height: 39px;
}

.playlist-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.song-count {
  font-weight: 500;
}

.play-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.playlist-actions {
  position: absolute;
  top: 20px;
  right: 20px;
}

/* 空状态 */
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
  .header-content {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }

  .playlist-overview {
    grid-template-columns: 1fr;
  }

  .playlists-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .playlist-card {
    padding: 12px;
  }

  .playlist-name {
    font-size: 14px;
  }

  .playlist-description {
    font-size: 12px;
  }
}
</style>
