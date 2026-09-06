<script setup lang="ts">
import { MusicalNotesOutline, TimeOutline, TrashOutline } from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NIcon,
  NPagination,
  NPopconfirm,
  NSkeleton,
  NSpace,
  useMessage,
} from 'naive-ui'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useMusicHistory } from '@/composables/useMusicHistory'
import { useMusicStore } from '@/stores/music'
import { formatDuration, formatRelative } from '@/utils/dateFormat'

const message = useMessage()
const musicStore = useMusicStore()

const {
  currentPage,
  handleAddToPlaylist,
  handleClearHistory,
  handlePageChange,
  handlePlay,
  historyRecords,
  loading,
  writing,
  errorMessage,
  loadHistory,
  pageSize,
  totalCount,
  totalPages,
} = useMusicHistory({
  message,
  musicStore,
})
</script>

<template>
  <UiBoard class="music-history-page page-container ui-page">
    <!-- 标题栏 -->
    <div class="history-header ui-card ui-page-header">
      <div class="header-left">
        <NIcon size="28" color="#f586a9">
          <TimeOutline />
        </NIcon>
        <div class="header-info">
          <h2 class="ui-page-title">
            播放历史
          </h2>
          <p v-if="totalCount > 0" class="ui-page-subtitle">
            共 {{ totalCount }} 条记录（最多保留50条）
          </p>
          <p v-else class="ui-page-subtitle">
            暂无播放记录
          </p>
        </div>
      </div>
      <div class="header-right">
        <NPopconfirm
          v-if="historyRecords.length > 0"
          @positive-click="handleClearHistory"
        >
          <template #trigger>
            <NButton type="error" secondary :disabled="writing">
              <template #icon>
                <NIcon><TrashOutline /></NIcon>
              </template>
              清空历史
            </NButton>
          </template>
          确定要清空所有播放历史吗？此操作不可恢复。
        </NPopconfirm>
      </div>
    </div>

    <div v-if="errorMessage" role="alert">
      {{ errorMessage }} <NButton @click="loadHistory">
        重试
      </NButton>
    </div>
    <!-- 加载状态 -->
    <div v-if="loading && !historyRecords.length" class="history-content">
      <NSpace vertical size="large">
        <NSkeleton v-for="i in 10" :key="i" height="80px" />
      </NSpace>
    </div>

    <!-- 历史记录列表 -->
    <div v-else-if="historyRecords.length > 0" class="history-content ui-card">
      <UiRecordBoard :items="historyRecords" :item-key="record => record.id">
        <template #default="{ item: record, index }">
          <UiRecordCard :headline="record.songName" :supporting="record.artistName + (record.albumName ? ` · ${record.albumName}` : '')" :status="musicStore.currentSong?.id === record.songId ? { tone: 'brand', text: '当前歌曲' } : undefined" :fields="[{ name: '序号', value: String((currentPage - 1) * pageSize + index + 1) }, { name: '最近播放', value: formatRelative(record.playTime), numeric: false }, { name: '时长', value: formatDuration(record.duration) }]">
            <img v-if="record.coverUrl" :src="record.coverUrl" :alt="record.songName" class="board-track-cover" referrerpolicy="no-referrer" loading="lazy" decoding="async"><NIcon v-else class="board-track-cover" aria-label="暂无封面">
              <MusicalNotesOutline />
            </NIcon><template #actions>
              <NButton secondary type="primary" title="播放" @click="handlePlay(record)">
                播放
              </NButton><NButton secondary type="info" title="添加到播放列表" @click="handleAddToPlaylist(record)">
                加入队列
              </NButton>
            </template>
          </UiRecordCard>
        </template>
      </UiRecordBoard>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="history-pagination">
        <NPagination
          v-model:page="currentPage"
          :page-count="totalPages"
          :page-size="pageSize"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="handlePageChange"
          @update:page-size="(size) => { pageSize = size; currentPage = 1; loadHistory() }"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-section ui-card">
      <NEmpty description="暂无播放记录" size="large">
        <template #icon>
          <NIcon size="80">
            <TimeOutline />
          </NIcon>
        </template>
        <template #extra>
          <p style="color: #6b7280; margin-top: 12px;">
            开始播放音乐后，播放记录会自动显示在这里
          </p>
        </template>
      </NEmpty>
    </div>
  </UiBoard>
</template>

<style scoped>
/* 标题栏 */
.history-header {
  padding: 24px 32px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  margin: 0 0 4px 0;
}

.header-info p {
  margin: 0;
}

/* 历史记录列表 */
.history-content {
  margin-bottom: 24px;
  padding: 16px;
}

/* 分页 */
.history-pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 空状态 */
.empty-section {
  min-height: 320px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 64px 20px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  /* ✅ 标题栏移动端优化 */
  .history-header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-info h2 {
    font-size: 20px;
  }

  .header-info p {
    font-size: 13px;
  }

  /* ✅ 列表项移动端优化 */

  /* ✅ 移动端隐藏时间和时长，避免拥挤 */

  /* ✅ 操作按钮移动端优化 */

  /* ✅ 分页移动端优化 */
  .history-pagination {
    margin-top: 16px;
  }

  .history-pagination :deep(.n-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}

.board-track-cover { width: 48px; height: 48px; object-fit: cover; border-radius: var(--ui-radius-md); }

.ui-card, .header, .history-header { background: var(--board-surface); color: var(--board-text); }
</style>
