<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NButton,
  NIcon,
  NEmpty,
  NSkeleton,
  NSpace,
  NPopconfirm,
  NPagination,
  useMessage
} from 'naive-ui'
import {
  MusicalNotesOutline,
  PlayCircleOutline,
  TrashOutline,
  TimeOutline,
  ListOutline
} from '@vicons/ionicons5'
import { musicHistoryApi, type MusicHistoryRecord, type Song } from '@/api/music'
import { useMusicStore } from '@/stores/music'

const message = useMessage()
const musicStore = useMusicStore()

// =======================
// 状态
// =======================
const loading = ref(false)
const historyRecords = ref<MusicHistoryRecord[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// =======================
// 辅助函数
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 1分钟内
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  // 1小时内
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  }
  // 今天
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  // 其他
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// =======================
// 数据加载
// =======================
const loadHistory = async () => {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    const [historyRes, countRes] = await Promise.all([
      musicHistoryApi.getHistory(pageSize.value, offset),
      musicHistoryApi.getCount()
    ])
    
    historyRecords.value = unwrap(historyRes) || []
    totalCount.value = unwrap(countRes) || 0
  } catch (e: any) {
    console.error('加载播放历史失败:', e)
    message.error('加载失败')
    historyRecords.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadHistory()
}

// =======================
// 播放功能
// =======================
const handlePlay = async (record: MusicHistoryRecord) => {
  // 转换为 Song 格式
  const song: Song = {
    id: record.songId,
    name: record.songName,
    artists: record.artistName.split('/').map((name, index) => ({
      id: index,
      name: name.trim()
    })),
    album: {
      id: 0,
      name: record.albumName || '未知专辑',
      picUrl: record.coverUrl
    },
    duration: record.duration,
    picUrl: record.coverUrl
  }
  
  const success = await musicStore.playSong(song)
  if (success) {
    musicStore.addToPlaylist(song)
    message.success('开始播放')
  } else {
    message.error('播放失败')
  }
}

const handleAddToPlaylist = (record: MusicHistoryRecord) => {
  const song: Song = {
    id: record.songId,
    name: record.songName,
    artists: record.artistName.split('/').map((name, index) => ({
      id: index,
      name: name.trim()
    })),
    album: {
      id: 0,
      name: record.albumName || '未知专辑',
      picUrl: record.coverUrl
    },
    duration: record.duration,
    picUrl: record.coverUrl
  }
  
  musicStore.addToPlaylist(song)
  message.success(`已添加 "${song.name}" 到播放列表`)
}

// =======================
// 清空历史
// =======================
const handleClearHistory = async () => {
  try {
    await musicHistoryApi.clearHistory()
    message.success('已清空播放历史')
    historyRecords.value = []
    totalCount.value = 0
    currentPage.value = 1
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || '清空失败'
    message.error(errMsg)
    console.error('清空播放历史失败:', e)
  }
}

// =======================
// 计算属性
// =======================
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// =======================
// 生命周期
// =======================
onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="music-history-page">
    <!-- 标题栏 -->
    <div class="history-header glass-card">
      <div class="header-left">
        <n-icon size="28" color="#8b5cf6"><TimeOutline /></n-icon>
        <div class="header-info">
          <h2>播放历史</h2>
          <p v-if="totalCount > 0">共 {{ totalCount }} 条记录（最多保留50条）</p>
          <p v-else>暂无播放记录</p>
        </div>
      </div>
      <div class="header-right">
        <n-popconfirm
          v-if="historyRecords.length > 0"
          @positive-click="handleClearHistory"
        >
          <template #trigger>
            <n-button type="error" secondary>
              <template #icon><n-icon><TrashOutline /></n-icon></template>
              清空历史
            </n-button>
          </template>
          确定要清空所有播放历史吗？此操作不可恢复。
        </n-popconfirm>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="history-content">
      <n-space vertical size="large">
        <n-skeleton v-for="i in 10" :key="i" height="80px" />
      </n-space>
    </div>

    <!-- 历史记录列表 -->
    <div v-else-if="historyRecords.length > 0" class="history-content">
      <div class="history-list">
        <div
          v-for="(record, index) in historyRecords"
          :key="record.id"
          class="history-item glass-card"
          :class="{ active: musicStore.currentSong?.id === record.songId }"
        >
          <div class="item-index">{{ (currentPage - 1) * pageSize + index + 1 }}</div>
          
          <div class="item-cover">
            <img
              v-if="record.coverUrl"
              :src="record.coverUrl"
              :alt="record.songName"
              referrerpolicy="no-referrer"
            />
            <div v-else class="cover-placeholder">
              <n-icon size="32" color="#999"><MusicalNotesOutline /></n-icon>
            </div>
          </div>

          <div class="item-info">
            <div class="item-name">{{ record.songName }}</div>
            <div class="item-meta">
              <span class="artist">{{ record.artistName }}</span>
              <span v-if="record.albumName" class="separator">·</span>
              <span v-if="record.albumName" class="album">{{ record.albumName }}</span>
            </div>
          </div>

          <div class="item-time">
            <n-icon size="16" color="#9ca3af"><TimeOutline /></n-icon>
            <span>{{ formatTime(record.playTime) }}</span>
          </div>

          <div class="item-duration">{{ formatDuration(record.duration) }}</div>

          <div class="item-actions">
            <n-button
              circle
              secondary
              type="primary"
              @click="handlePlay(record)"
              title="播放"
            >
              <template #icon>
                <n-icon><PlayCircleOutline /></n-icon>
              </template>
            </n-button>
            
            <n-button
              circle
              secondary
              type="info"
              @click="handleAddToPlaylist(record)"
              title="添加到播放列表"
            >
              <template #icon>
                <n-icon><ListOutline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="history-pagination">
        <n-pagination
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
    <div v-else class="empty-section">
      <n-empty description="暂无播放记录" size="large">
        <template #icon>
          <n-icon size="80"><TimeOutline /></n-icon>
        </template>
        <template #extra>
          <p style="color: #6b7280; margin-top: 12px;">
            开始播放音乐后，播放记录会自动显示在这里
          </p>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<style scoped>
.music-history-page {
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

/* 标题栏 */
.history-header {
  padding: 24px 32px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.header-info p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* 历史记录列表 */
.history-content {
  margin-bottom: 24px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s;
  cursor: pointer;
}

.history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.history-item.active {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.item-index {
  width: 32px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #9ca3af;
  flex-shrink: 0;
}

.history-item.active .item-index {
  color: #8b5cf6;
}

.item-cover {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f3f4f6;
}

.item-cover img {
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

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.separator {
  color: #d1d5db;
}

.item-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  margin-right: 16px;
}

.item-duration {
  font-size: 14px;
  color: #9ca3af;
  margin-right: 16px;
  min-width: 50px;
  text-align: right;
}

.item-actions {
  display: flex;
  gap: 8px;
}

/* 分页 */
.history-pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 空状态 */
.empty-section {
  padding: 80px 20px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .music-history-page {
    padding: 16px;
  }

  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .item-time,
  .item-duration {
    display: none;
  }
}
</style>
