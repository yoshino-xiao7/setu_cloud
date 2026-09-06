<script setup lang="ts">
import {
  AddCircleOutline,
  AlbumsOutline,
  CheckmarkCircle,
  CloseOutline,
  FlameOutline,
  MusicalNotesOutline,
  SearchOutline,
  TimeOutline,
  TrashOutline,
  TrendingUpOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NSkeleton,
  NSpace,
} from 'naive-ui'
import AddToPlaylistModal from '@/components/music/AddToPlaylistModal.vue'
import CreatePlaylistModal from '@/components/music/CreatePlaylistModal.vue'
import MusicSearchResultItem from '@/components/music/MusicSearchResultItem.vue'
import MvPanel from '@/components/music/MvPanel.vue'
import { useMusicPlayerPage } from '@/composables/useMusicPlayerPage'

const {
  clearSearchHistory,
  createPlaylistForm,
  downloadSong,
  formatHotCount,
  hasMore,
  handleAddToPlayingList,
  handleAddToPlaylist,
  handleCancelCreate,
  handleCreatePlaylist,
  handleHotSearchClick,
  handleKeyEnter,
  handleLoadMore,
  handlePlay,
  handlePlayMv,
  handleShowAddToPlaylist,
  handleShowCreatePlaylist,
  handleSearch,
  handleSearchBlur,
  handleSearchFocus,
  handleSearchInput,
  hotSearchList,
  loadingHotSearch,
  loadingMore,
  loadingPlaylists,
  musicStore,
  myPlaylists,
  removeHistoryItem,
  searchHistory,
  searchError,
  searching,
  searchKeyword,
  searchResults,
  selectedSong,
  showAddToPlaylistDialog,
  showCreatePlaylistDialog,
  showHotSearch,
  totalSearched,
  goTo,
} = useMusicPlayerPage()
</script>

<template>
  <div class="music-player-page page-container ui-page">
    <div class="music-workspace">
      <main class="results-column">
        <!-- 搜索区域 -->
        <div class="search-section ui-card">
          <div class="search-title">
            <div class="search-title-main">
              <NIcon size="30" color="#f586a9">
                <MusicalNotesOutline />
              </NIcon>
              <div>
                <h2 class="ui-page-title">
                  网易云音乐
                </h2>
                <p class="ui-page-subtitle">
                  搜索歌曲、播放音乐、收藏到你的歌单
                </p>
              </div>
            </div>
            <div class="search-title-actions">
              <NButton secondary @click="goTo('/dashboard/my-playlists')">
                <template #icon>
                  <NIcon><AlbumsOutline /></NIcon>
                </template>
                我的歌单
              </NButton>
              <NButton secondary @click="goTo('/dashboard/music-history')">
                <template #icon>
                  <NIcon><TimeOutline /></NIcon>
                </template>
                播放历史
              </NButton>
            </div>
          </div>
          <div class="search-box">
            <div class="search-input-wrapper">
              <NInput
                v-model:value="searchKeyword"
                size="large"
                placeholder="搜索歌曲、歌手、专辑..."
                clearable
                @keydown="handleKeyEnter"
                @focus="handleSearchFocus"
                @blur="handleSearchBlur"
                @input="handleSearchInput"
              >
                <template #prefix>
                  <NIcon><SearchOutline /></NIcon>
                </template>
              </NInput>

              <!-- ✅ 热门搜索下拉框 -->
              <transition name="hot-search">
                <div v-if="showHotSearch" class="hot-search-dropdown">
                  <!-- ✅ 历史搜索 -->
                  <div v-if="searchHistory.length > 0" class="search-history-section">
                    <div class="search-history-header">
                      <div class="history-title">
                        <NIcon size="18" color="#6b7280">
                          <TimeOutline />
                        </NIcon>
                        <span>搜索历史</span>
                      </div>
                      <NButton text size="small" @click="clearSearchHistory">
                        <template #icon>
                          <NIcon size="16">
                            <TrashOutline />
                          </NIcon>
                        </template>
                        清空
                      </NButton>
                    </div>
                    <div class="search-history-list">
                      <div
                        v-for="keyword in searchHistory"
                        :key="keyword"
                        class="search-history-item"
                      >
                        <div class="history-keyword" @click="handleHotSearchClick(keyword)">
                          <NIcon size="16" color="#6b7280">
                            <SearchOutline />
                          </NIcon>
                          <span>{{ keyword }}</span>
                        </div>
                        <NButton
                          text
                          circle
                          size="small"
                          class="history-remove"
                          @click.stop="removeHistoryItem(keyword)"
                        >
                          <template #icon>
                            <NIcon size="14">
                              <CloseOutline />
                            </NIcon>
                          </template>
                        </NButton>
                      </div>
                    </div>
                  </div>

                  <!-- ✅ 热门搜索 -->
                  <div class="hot-search-header">
                    <NIcon size="18" color="#f586a9">
                      <FlameOutline />
                    </NIcon>
                    <span>热门搜索</span>
                  </div>

                  <div v-if="loadingHotSearch" class="hot-search-loading">
                    <NSkeleton text :repeat="5" />
                  </div>

                  <div v-else-if="hotSearchList.length > 0" class="hot-search-list">
                    <div
                      v-for="(item, index) in hotSearchList.slice(0, 10)"
                      :key="item.first"
                      class="hot-search-item"
                      @click="handleHotSearchClick(item.first)"
                    >
                      <div class="hot-search-rank" :class="{ top: index < 3 }">
                        {{ index + 1 }}
                      </div>
                      <div class="hot-search-keyword">
                        {{ item.first }}
                      </div>
                      <div class="hot-search-count">
                        <NIcon size="14" color="#f586a9">
                          <TrendingUpOutline />
                        </NIcon>
                        <span>{{ formatHotCount(item.second) }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-else class="hot-search-empty">
                    <NEmpty description="暂无热门搜索" size="small" />
                  </div>
                </div>
              </transition>
            </div>

            <NButton
              type="primary"
              size="large"
              :loading="searching"
              @click="handleSearch"
            >
              <template #icon>
                <NIcon><SearchOutline /></NIcon>
              </template>
              搜索
            </NButton>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searching" class="results-section">
          <NSpace vertical size="large">
            <NSkeleton v-for="i in 8" :key="i" height="80px" />
          </NSpace>
        </div>

        <div v-else-if="searchResults.length > 0" class="results-section">
          <h3 class="section-title">
            搜索结果 ({{ searchResults.length }}/{{ totalSearched }})
          </h3>
          <div class="song-list">
            <MusicSearchResultItem
              v-for="(song, index) in searchResults"
              :key="`${song.id}-${index}`"
              v-memo="[song.id, song.name, song.duration, song.mv, musicStore.currentSong?.id === song.id]"
              :active="musicStore.currentSong?.id === song.id"
              :song="song"
              @add-to-playlist="handleShowAddToPlaylist"
              @add-to-queue="handleAddToPlayingList"
              @download="downloadSong"
              @play="handlePlay"
              @play-mv="handlePlayMv"
            />
          </div>

          <!-- ✅ 加载更多按钮 -->
          <div v-if="hasMore" class="load-more-section">
            <NButton
              size="large"
              :loading="loadingMore"
              block
              secondary
              @click="handleLoadMore"
            >
              <template #icon>
                <NIcon><AddCircleOutline /></NIcon>
              </template>
              加载更多 ({{ searchResults.length }}/{{ totalSearched }})
            </NButton>
          </div>

          <!-- ✅ 已加载全部提示 -->
          <div v-else class="no-more-section">
            <div class="no-more-text">
              <NIcon size="20" color="#6b7280">
                <CheckmarkCircle />
              </NIcon>
              <span>已加载全部 {{ totalSearched }} 首歌曲</span>
            </div>
          </div>
        </div>

        <div v-else-if="searchError" role="alert" class="ui-card">
          {{ searchError }} <NButton @click="handleSearch">
            重试
          </NButton>
        </div>
        <div v-else-if="!searching && searchKeyword" class="empty-section ui-card">
          <NEmpty description="暂无搜索结果" size="large">
            <template #icon>
              <NIcon><SearchOutline /></NIcon>
            </template>
          </NEmpty>
        </div>

        <div v-else class="welcome-section ui-card">
          <NEmpty description="搜索你喜欢的音乐" size="large">
            <template #icon>
              <NIcon size="80">
                <MusicalNotesOutline />
              </NIcon>
            </template>
          </NEmpty>
        </div>
      </main>
    </div>

    <AddToPlaylistModal
      v-model:show="showAddToPlaylistDialog"
      :loading="loadingPlaylists"
      :playlists="myPlaylists"
      :selected-song="selectedSong"
      @create="handleShowCreatePlaylist"
      @select-playlist="handleAddToPlaylist"
    />

    <CreatePlaylistModal
      v-model:form="createPlaylistForm"
      v-model:show="showCreatePlaylistDialog"
      @cancel="handleCancelCreate"
      @submit="handleCreatePlaylist"
    />

    <MvPanel />
  </div>
</template>

<style scoped>
/* 搜索区域 */
.search-section {
  position: sticky;
  top: 14px;
  z-index: 20;
  padding: 24px;
  margin-bottom: 18px;
  background:
    radial-gradient(circle at 92% 12%, rgba(96, 165, 250, 0.15), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.search-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-title-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.search-title-main h2,
.search-title-main p {
  margin: 0;
}

.search-title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  gap: 12px;
}

/* ✅ 搜索输入框包装器 */
.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-box :deep(.n-input) {
  flex: 1;
}

.music-workspace {
  display: block;
}

.results-column {
  min-width: 0;
}

/* ✅ 热门搜索下拉框 */
.hot-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--ui-border);
  box-shadow: var(--ui-shadow-lg);
  border-radius: 12px;
  z-index: 1500;  /* ✅ 提高 z-index 确保在搜索结果上方 */
  max-height: 500px;
  overflow-y: auto;
}

/* ✅ 历史搜索区域 */
.search-history-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.search-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px 8px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #6b7280;
}

.search-history-list {
  padding: 4px 0;
}

.search-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
}

.search-history-item:hover {
  background: rgba(107, 114, 128, 0.05);
}

.history-keyword {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #4b5563;
}

.history-keyword span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-remove {
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.search-history-item:hover .history-remove {
  opacity: 1;
}

.hot-search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ui-primary);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.hot-search-loading {
  padding: 16px 20px;
}

.hot-search-list {
  padding: 8px 0;
}

.hot-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hot-search-item:hover {
  background: rgba(245, 134, 169, 0.08);
}

.hot-search-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 6px;
  flex-shrink: 0;
}

.hot-search-rank.top {
  background: linear-gradient(135deg, var(--ui-primary), #fca5c8);
  color: white;
}

.hot-search-keyword {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-search-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.hot-search-empty {
  padding: 32px 20px;
}

/* 热门搜索动画 */
.hot-search-enter-active,
.hot-search-leave-active {
  transition: all 0.25s ease;
}

.hot-search-enter-from,
.hot-search-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 结果区域 */
.results-section {
  margin-bottom: 0;
}

.section-title {
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

/* 空状态 */
.empty-section,
.welcome-section {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  text-align: center;
}

/* ✅ 加载更多区域 */
.load-more-section {
  margin-top: 24px;
  padding: 0 16px;
}

.load-more-section .n-button {
  height: 56px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s;
}

.load-more-section .n-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* ✅ 已加载全部提示 */
.no-more-section {
  margin-top: 32px;
  padding: 24px;
  text-align: center;
}

.no-more-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  padding: 12px 24px;
  background: rgba(156, 163, 175, 0.1);
  border-radius: 24px;
}

@media (max-width: 768px) {
  .search-section {
    position: relative;
    top: auto;
    padding: 20px;
  }

  .search-title {
    align-items: stretch;
  }

  .search-title-actions {
    width: 100%;
  }

  .search-title-actions :deep(.n-button) {
    flex: 1;
  }

  .search-box {
    flex-direction: column;
  }

}

@media (prefers-reduced-motion: reduce) {
  .hot-search-enter-active,
  .hot-search-leave-active {
    animation: none;
    transition: none;
  }
}

/* ✅ MV 播放器样式 */
.mv-player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.mv-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mv-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mv-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mv-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.mv-artist {
  font-size: 14px;
  color: #6b7280;
}

.mv-player-content {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.mv-video {
  width: 100%;
  height: auto;
  max-height: 70vh;
  display: block;
  cursor: pointer;
}

.mv-player-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quality-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

/* ✅ 画中画浮动卡片 */
.mini-mv-player {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-width: calc(100vw - 40px);
  z-index: 2500;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-mv-player:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.4);
}

.mini-mv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.mini-mv-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.mini-mv-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.mini-mv-name {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-mv-artist {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-mv-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mini-mv-video-wrapper {
  width: 100%;
  background: #000;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.mini-mv-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  cursor: pointer;
}

/* ✅ 浮动卡片动画 */
.mini-player-enter-active,
.mini-player-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-player-enter-from {
  opacity: 0;
  transform: translateY(100px) scale(0.8);
}

.mini-player-leave-to {
  opacity: 0;
  transform: translateY(100px) scale(0.8);
}

/* ✅ 移动端适配 */
@media (max-width: 768px) {
  .mini-mv-player {
    width: 300px;
    bottom: 80px;
    right: 16px;
  }
}
</style>
