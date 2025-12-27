<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NButton,
  NIcon,
  NSpace,
  NEmpty,
  NSkeleton,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NPopconfirm,
  NTag,
  useMessage
} from 'naive-ui'
import {
  AddOutline,
  PlayCircleOutline,
  TrashOutline,
  MusicalNotesOutline,
  TimeOutline,
  PlayOutline
} from '@vicons/ionicons5'
import { userPlaylistApi, type CreatePlaylistDto, type UserPlaylist } from '@/api/music'
import { useMusicStore } from '@/stores/music'

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
  isPublic: 0
})

// =======================
// 辅助函数
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

const playModeNames: Record<string, string> = {
  sequence: '顺序播放',
  random: '随机播放',
  loop: '列表循环',
  single: '单曲循环'
}

// =======================
// 加载歌单列表
// =======================
const loadPlaylists = async () => {
  loading.value = true
  try {
    const res = await userPlaylistApi.getMyPlaylists()
    playlists.value = unwrap(res) || []
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || '加载失败'
    message.error(errMsg)
    console.error(e)
  } finally {
    loading.value = false
  }
}

// =======================
// 创建歌单
// =======================
const handleCreate = async () => {
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
      isPublic: 0
    }
    
    // 重新加载列表
    await loadPlaylists()
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || '创建失败'
    message.error(errMsg)
    console.error(e)
  }
}

// =======================
// 播放歌单
// =======================
const handlePlay = async (playlist: UserPlaylist) => {
  // 加载完整歌单详情
  const detail = await musicStore.loadPlaylistDetail(playlist.id)
  
  if (!detail || !detail.songs || detail.songs.length === 0) {
    message.warning('歌单为空')
    return
  }
  
  const success = await musicStore.playPlaylist(detail)
  
  if (success) {
    message.success(`开始播放《${detail.name}》`)
  } else {
    message.error('播放失败')
  }
}

// =======================
// 查看歌单详情
// =======================
const handleViewDetail = (id: number) => {
  router.push(`/dashboard/playlist/${id}`)
}

// =======================
// 删除歌单
// =======================
const handleDelete = async (id: number) => {
  try {
    await userPlaylistApi.deletePlaylist(id)
    message.success('删除成功')
    await loadPlaylists()
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || '删除失败'
    message.error(errMsg)
    console.error(e)
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
  <div class="my-playlists-page">
    <!-- 头部 -->
    <div class="page-header glass-card">
      <div class="header-content">
        <div class="header-left">
          <n-icon size="32" color="#8b5cf6"><MusicalNotesOutline /></n-icon>
          <div>
            <h2>我的歌单</h2>
            <p>管理你的音乐收藏</p>
          </div>
        </div>
        <n-button type="primary" @click="showCreateDialog = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          创建歌单
        </n-button>
      </div>
    </div>

    <!-- 歌单列表 -->
    <div v-if="loading" class="playlists-grid">
      <n-skeleton v-for="i in 6" :key="i" height="200px" />
    </div>

    <div v-else-if="playlists.length > 0" class="playlists-grid">
      <div
        v-for="playlist in playlists"
        :key="playlist.id"
        class="playlist-card glass-card"
        @click="handleViewDetail(playlist.id)"
      >
        <div class="playlist-cover">
          <img
            v-if="playlist.coverUrl"
            :src="playlist.coverUrl"
            :alt="playlist.name"
            referrerpolicy="no-referrer"
          />
          <div v-else class="cover-placeholder">
            <n-icon size="48" color="#999"><MusicalNotesOutline /></n-icon>
          </div>
          
          <!-- 播放按钮覆盖层 -->
          <div class="play-overlay" @click.stop="handlePlay(playlist)">
            <n-icon size="48" color="#fff"><PlayCircleOutline /></n-icon>
          </div>
        </div>

        <div class="playlist-info">
          <h3 class="playlist-name">{{ playlist.name }}</h3>
          <p class="playlist-description">{{ playlist.description || '暂无描述' }}</p>
          
          <div class="playlist-meta">
            <n-tag size="small" :bordered="false">
              {{ playModeNames[playlist.playMode] || '顺序播放' }}
            </n-tag>
            <span class="song-count">{{ playlist.songCount }} 首</span>
            <span class="play-count">
              <n-icon size="14"><PlayOutline /></n-icon>
              {{ playlist.playCount }}
            </span>
          </div>
        </div>

        <div class="playlist-actions" @click.stop>
          <n-popconfirm @positive-click="handleDelete(playlist.id)">
            <template #trigger>
              <n-button circle quaternary type="error" size="small">
                <template #icon><n-icon><TrashOutline /></n-icon></template>
              </n-button>
            </template>
            确定删除歌单《{{ playlist.name }}》吗？
          </n-popconfirm>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <n-empty description="还没有歌单，创建一个吧！" size="large">
        <template #icon><n-icon size="80"><MusicalNotesOutline /></n-icon></template>
        <template #extra>
          <n-button type="primary" @click="showCreateDialog = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            创建歌单
          </n-button>
        </template>
      </n-empty>
    </div>

    <!-- 创建歌单对话框 -->
    <n-modal
      v-model:show="showCreateDialog"
      preset="dialog"
      title="创建歌单"
      positive-text="创建"
      negative-text="取消"
      @positive-click="handleCreate"
    >
      <n-form :model="formData" label-placement="left" label-width="80px" style="margin-top: 20px;">
        <n-form-item label="歌单名称" required>
          <n-input
            v-model:value="formData.name"
            placeholder="输入歌单名称"
            maxlength="50"
            show-count
          />
        </n-form-item>
        
        <n-form-item label="描述">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            placeholder="描述一下这个歌单..."
            maxlength="200"
            show-count
            :rows="3"
          />
        </n-form-item>
        
        <n-form-item label="封面URL">
          <n-input
            v-model:value="formData.coverUrl"
            placeholder="可选，留空将显示默认封面"
          />
        </n-form-item>
        
        <n-form-item label="公开">
          <n-switch v-model:value="formData.isPublic" :checked-value="1" :unchecked-value="0">
            <template #checked>公开</template>
            <template #unchecked>私密</template>
          </n-switch>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.my-playlists-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.glass-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
}

/* 头部 */
.page-header {
  padding: 24px;
  margin-bottom: 24px;
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
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.header-left p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
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
  transition: all 0.3s;
  position: relative;
}

.playlist-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.playlist-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
  margin-bottom: 12px;
  position: relative;
}

.playlist-cover img {
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

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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
  color: #1f2937;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-description {
  font-size: 13px;
  color: #6b7280;
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
  color: #9ca3af;
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
  padding: 80px 20px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .my-playlists-page {
    padding: 16px;
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
