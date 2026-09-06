<script setup lang="ts">
import {
  AddOutline,
  MusicalNotesOutline,
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
  useMessage,
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { UiBoard, UiRecordCard, UiShelf } from '@/components/ui'
import { useMyPlaylists } from '@/composables/useMyPlaylists'
import { useMusicStore } from '@/stores/music'
import { safePush } from '@/utils/navigation'

const message = useMessage()
const router = useRouter()
const musicStore = useMusicStore()

const {
  formData,
  handleCreate,
  handleDelete,
  handlePlay,
  loading,
  playlistStats,
  playlists,
  playModeNames,
  showCreateDialog,
} = useMyPlaylists({
  message,
  musicStore,
})

function handleViewDetail(id: string) {
  void safePush(router, `/dashboard/playlist/${id}`)
}
</script>

<template>
  <UiBoard class="my-playlists-page page-container ui-page">
    <!-- 头部 -->
    <div class="board-page-header ui-card ui-page-header">
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

    <UiShelf v-else-if="playlists.length > 0" title="我的歌单" width="feature">
      <UiRecordCard v-for="playlist in playlists" :key="playlist.id" :headline="playlist.name" :supporting="playlist.description || '暂无描述'" :on-activate="() => handleViewDetail(playlist.id)" :fields="[{ name: '歌曲', value: String(playlist.songCount) }, { name: '播放', value: String(playlist.playCount) }, { name: '播放模式', value: playModeNames[playlist.playMode] || '顺序播放', numeric: false }]">
        <img v-if="playlist.coverUrl" class="board-playlist-cover" :src="playlist.coverUrl" :alt="playlist.name" referrerpolicy="no-referrer" loading="lazy" decoding="async"><template #actions>
          <NButton secondary type="primary" @click="handlePlay(playlist)">
            播放
          </NButton><NButton secondary @click="handleViewDetail(playlist.id)">
            详情
          </NButton><NPopconfirm @positive-click="handleDelete(playlist.id)">
            <template #trigger>
              <NButton tertiary type="error" size="small">
                删除
              </NButton>
            </template>确定删除歌单《{{ playlist.name }}》吗？
          </NPopconfirm>
        </template>
      </UiRecordCard>
    </UiShelf>

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
  </UiBoard>
</template>

<style scoped>
/* 头部 */
.board-page-header {
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
  color: var(--board-text);
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
}

.board-page-header { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }
.board-playlist-cover { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--ui-radius-lg); }

.ui-card, .header, .overview-card { background: var(--board-surface); color: var(--board-text); }
</style>
