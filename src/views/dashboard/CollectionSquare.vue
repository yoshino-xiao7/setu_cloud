<script setup lang="ts">
import {
  ArrowForwardOutline,
  CompassOutline,
  EyeOutline,
  Heart,
  HeartOutline,
  ImageOutline,
  ImagesOutline,
  SearchOutline,
  SparklesOutline,
  Star,
  StarOutline,
  TimeOutline,
  TrendingUpOutline,
} from '@vicons/ionicons5'
import {
  NAvatar,
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NPagination,
  NSelect,
  NSkeleton,
  NTooltip,
} from 'naive-ui'
import { UiBoard, UiMosaic } from '@/components/ui'
import { useCollectionSquarePage } from '@/composables/useCollectionSquarePage'
import {
  getCollectionStrength,
  getFirstPreviewUrl,
  getFreshnessLabel,
  getHotLabel,
  getMoodText,
  getPreviewImages,
  getPreviewUrl,
  normalizeTags,
} from '@/composables/useCollectionSquareViewHelpers'

const {
  collections,
  createRipple,
  featuredCollections,
  goMyCollections,
  goToUserProfile,
  handleFavorite,
  handleLike,
  handlePageChange,
  handleSearch,
  handleSortChange,
  heroCollection,
  keyword,
  loading,
  pagination,
  scrollProgress,
  sortType,
  sortOptions,
  totalImageCount,
  totalInteractionCount,
  viewDetail,
} = useCollectionSquarePage()
</script>

<template>
  <UiBoard class="page-container ui-page">
    <!-- ✅ 滚动进度条 -->
    <div class="scroll-progress-bar">
      <div class="scroll-progress-fill" :style="{ width: `${scrollProgress}%` }" />
    </div>

    <div class="board-header-section ui-page-header ui-card">
      <div>
        <h2 class="title ui-page-title">
          收藏夹广场
        </h2>
        <p class="subtitle ui-page-subtitle">
          发现其他用户分享的精彩收藏 · 共 {{ pagination.total }} 个公开收藏夹
        </p>
      </div>
    </div>

    <!-- 搜索和排序 -->
    <div class="filter-section ui-card">
      <div class="search-box">
        <NInput
          v-model:value="keyword"
          placeholder="搜索收藏夹名称或描述..."
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <NIcon><SearchOutline /></NIcon>
          </template>
        </NInput>
        <NButton type="primary" color="#f586a9" size="large" @click="handleSearch">
          <template #icon>
            <NIcon><SearchOutline /></NIcon>
          </template>
          搜索
        </NButton>
      </div>

      <div class="sort-box">
        <NSelect
          v-model:value="sortType"
          :options="sortOptions"
          size="large"
          @update:value="handleSortChange"
        />
      </div>
    </div>

    <!-- 列表区域 -->
    <div v-if="loading && collections.length === 0" class="loading-grid">
      <div v-for="n in 8" :key="n" class="skeleton-card">
        <NSkeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
      </div>
    </div>

    <div v-else-if="!loading && collections.length === 0" class="empty-box ui-card">
      <NEmpty description="暂无公开收藏夹" size="large">
        <template #icon>
          <NIcon><ImageOutline /></NIcon>
        </template>
        <template #extra>
          <NButton type="primary" secondary @click="goMyCollections">
            去创建我的收藏夹
          </NButton>
        </template>
      </NEmpty>
    </div>

    <div v-else class="content-wrapper">
      <div v-if="heroCollection" class="discovery-strip">
        <div
          class="spotlight-card ui-card ripple-container"
          role="button"
          tabindex="0"
          @click="(event) => { createRipple(event); viewDetail(heroCollection); }"
          @keydown.enter="viewDetail(heroCollection)"
          @keydown.space.prevent="viewDetail(heroCollection)"
        >
          <div class="spotlight-preview">
            <div
              v-if="getPreviewImages(heroCollection).length > 0"
              class="preview-collage preview-collage-large"
            >
              <div
                v-for="(image, index) in getPreviewImages(heroCollection).slice(0, 4)"
                :key="`${image.pid}-${image.p}-${index}`"
                class="preview-tile"
                :class="`tile-${index}`"
              >
                <img
                  :src="getPreviewUrl(image)"
                  :alt="image.title || heroCollection.name"
                  referrerpolicy="no-referrer"
                  :loading="index === 0 ? 'eager' : 'lazy'"
                  decoding="async"
                >
              </div>
            </div>
            <div v-else class="cover-placeholder">
              <NIcon size="56" color="#cbd5e1">
                <ImagesOutline />
              </NIcon>
            </div>
          </div>

          <div class="spotlight-copy">
            <div class="spotlight-kicker">
              <NIcon><SparklesOutline /></NIcon>
              今日值得逛
            </div>
            <h3>{{ heroCollection.name }}</h3>
            <p>{{ getMoodText(heroCollection) }}</p>

            <div class="spotlight-meta">
              <span>
                <NIcon><ImagesOutline /></NIcon>
                {{ heroCollection.itemCount }} 张
              </span>
              <span>
                <NIcon><EyeOutline /></NIcon>
                {{ heroCollection.shareViewCount }} 次浏览
              </span>
              <span>
                <NIcon><TimeOutline /></NIcon>
                {{ getFreshnessLabel(heroCollection) }}
              </span>
            </div>

            <div class="spotlight-footer">
              <div class="tag-row">
                <span
                  v-for="tag in normalizeTags(heroCollection)"
                  :key="tag"
                  class="tag-pill"
                >
                  {{ tag }}
                </span>
                <span v-if="normalizeTags(heroCollection).length === 0" class="tag-pill">
                  公开收藏
                </span>
              </div>
              <span class="browse-cta">
                逛一下
                <NIcon><ArrowForwardOutline /></NIcon>
              </span>
            </div>
          </div>
        </div>

        <div class="discovery-side">
          <div class="metric-cell ui-card">
            <NIcon><CompassOutline /></NIcon>
            <div>
              <strong>{{ pagination.total }}</strong>
              <span>公开收藏夹</span>
            </div>
          </div>
          <div class="metric-cell ui-card">
            <NIcon><ImagesOutline /></NIcon>
            <div>
              <strong>{{ totalImageCount }}</strong>
              <span>可浏览作品</span>
            </div>
          </div>
          <div class="metric-cell ui-card">
            <NIcon><TrendingUpOutline /></NIcon>
            <div>
              <strong>{{ totalInteractionCount }}</strong>
              <span>互动热度</span>
            </div>
          </div>

          <button
            v-for="item in featuredCollections.slice(1, 3)"
            :key="item.id"
            class="mini-pick"
            type="button"
            @click="viewDetail(item)"
          >
            <img
              v-if="getFirstPreviewUrl(item)"
              :src="getFirstPreviewUrl(item)"
              :alt="item.name"
              referrerpolicy="no-referrer"
              loading="lazy"
              decoding="async"
            >
            <span class="mini-pick-text">
              <strong>{{ item.name }}</strong>
              <span>{{ getCollectionStrength(item) }}</span>
            </span>
            <NIcon><ArrowForwardOutline /></NIcon>
          </button>
        </div>
      </div>

      <div class="section-heading">
        <div>
          <span class="section-kicker">探索收藏夹</span>
          <h3>从一组图开始逛</h3>
        </div>
        <div class="result-count">
          {{ collections.length }} / {{ pagination.total }}
        </div>
      </div>

      <UiMosaic :items="collections" :item-key="item => item.id">
        <template #item="{ item: item }">
          <div

            class="collection-card ui-card ripple-container"
            role="button"
            tabindex="0"
            @click="(event) => { createRipple(event); viewDetail(item); }"
            @keydown.enter="viewDetail(item)"
            @keydown.space.prevent="viewDetail(item)"
          >
            <div class="cover-box">
              <div
                v-if="getPreviewImages(item).length > 0"
                class="preview-collage"
              >
                <div
                  v-for="(image, index) in getPreviewImages(item).slice(0, 4)"
                  :key="`${image.pid}-${image.p}-${index}`"
                  class="preview-tile"
                  :class="`tile-${index}`"
                >
                  <img
                    :src="getPreviewUrl(image)"
                    :alt="image.title || item.name"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                  >
                </div>
              </div>
              <div v-else class="cover-placeholder">
                <NIcon size="56" color="#cbd5e1">
                  <ImagesOutline />
                </NIcon>
              </div>

              <div class="cover-stats">
                <div class="stat-item">
                  <NIcon size="14">
                    <ImageOutline />
                  </NIcon>
                  <span>{{ item.itemCount }}</span>
                </div>
                <div class="stat-item">
                  <NIcon size="14">
                    <EyeOutline />
                  </NIcon>
                  <span>{{ item.shareViewCount }}</span>
                </div>
              </div>

              <div v-if="getHotLabel(item)" class="hot-badge">
                <NIcon size="13">
                  <TrendingUpOutline />
                </NIcon>
                {{ getHotLabel(item) }}
              </div>
            </div>

            <div class="info-box">
              <div class="info-header">
                <div class="collection-name" :title="item.name">
                  {{ item.name }}
                </div>
                <div class="freshness">
                  <NIcon><TimeOutline /></NIcon>
                  {{ getFreshnessLabel(item) }}
                </div>
              </div>

              <div v-if="normalizeTags(item).length > 0" class="tag-row">
                <span
                  v-for="tag in normalizeTags(item)"
                  :key="tag"
                  class="tag-pill"
                >
                  {{ tag }}
                </span>
              </div>

              <div class="collection-desc" :title="getMoodText(item)">
                {{ getMoodText(item) }}
              </div>

              <div class="owner-line">
                <div class="owner-box" @click.stop="goToUserProfile(item.userId || 0)">
                  <NAvatar
                    :src="item.ownerAvatarUrl"
                    round
                    size="small"
                    :fallback-src="`https://api.dicebear.com/7.x/identicon/svg?seed=${item.ownerNickname}`"
                  />
                  <span class="owner-name">{{ item.ownerNickname }}</span>
                </div>
                <span class="strength-pill">{{ getCollectionStrength(item) }}</span>
              </div>

              <div class="action-box">
                <div class="reaction-group">
                  <NTooltip trigger="hover">
                    <template #trigger>
                      <NButton
                        circle
                        size="small"
                        :type="item.isLiked ? 'error' : 'default'"
                        :secondary="!item.isLiked"
                        @click.stop="handleLike(item)"
                      >
                        <template #icon>
                          <NIcon><Heart v-if="item.isLiked" /><HeartOutline v-else /></NIcon>
                        </template>
                      </NButton>
                    </template>
                    {{ item.isLiked ? '取消点赞' : '点赞' }}
                  </NTooltip>
                  <span class="action-count">{{ item.likeCount }}</span>

                  <NTooltip trigger="hover">
                    <template #trigger>
                      <NButton
                        circle
                        size="small"
                        :type="item.isFavorited ? 'warning' : 'default'"
                        :secondary="!item.isFavorited"
                        @click.stop="handleFavorite(item)"
                      >
                        <template #icon>
                          <NIcon><Star v-if="item.isFavorited" /><StarOutline v-else /></NIcon>
                        </template>
                      </NButton>
                    </template>
                    {{ item.isFavorited ? '取消收藏' : '收藏' }}
                  </NTooltip>
                  <span class="action-count">{{ item.favoriteCount }}</span>
                </div>

                <span class="browse-link">
                  逛一下
                  <NIcon><ArrowForwardOutline /></NIcon>
                </span>
              </div>
            </div>
          </div>
        </template>
      </UiMosaic>

      <div v-if="pagination.total > 0" class="pagination-box">
        <NPagination
          v-model:page="pagination.page"
          :item-count="pagination.total"
          :page-size="pagination.size"
          :on-update:page="handlePageChange"
          size="large"
        />
      </div>
    </div>
  </UiBoard>
</template>

<style scoped>
/* ======================
   ✅ 滚动进度条
   ====================== */
.scroll-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(245, 134, 169, 0.1);
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.scroll-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ui-primary) 0%, #fca5c8 50%, #ff9a9e 100%);
  transition: width 0.1s ease;
  box-shadow: 0 0 10px rgba(245, 134, 169, 0.5);
}

/* ======================
   ✅ 涟漪效果
   ====================== */
.ripple-container {
  position: relative;
  overflow: hidden;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.page-container {
  padding-bottom: 100px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.board-header-section {
  text-align: left;
  padding: 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.title {
  margin: 0;
}

.subtitle {
  margin-top: 8px;
}

.filter-section {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 20px 24px;
  border-radius: var(--ui-radius-xl);
}

.search-box {
  flex: 1;
  display: flex;
  gap: 12px;
  min-width: 300px;
}

.sort-box {
  width: 140px;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.skeleton-card {
  /* ✅ 与实际卡片比例一致 */
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
}

.empty-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.discovery-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(240px, 0.8fr);
  gap: 18px;
  align-items: stretch;
}

.spotlight-card {
  display: grid;
  grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1fr);
  gap: 20px;
  padding: 18px;
  cursor: pointer;
  overflow: hidden;
  min-height: 286px;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
  background:
    radial-gradient(circle at 96% 10%, rgba(96, 165, 250, 0.15), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.97));
}

.spotlight-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 24px 54px rgba(31, 41, 55, 0.12), 0 16px 30px rgba(245, 134, 169, 0.1);
  border-color: rgba(245, 134, 169, 0.24);
}

.spotlight-card:focus-visible {
  outline: 2px solid var(--lg-accent, var(--ui-primary));
  outline-offset: 2px;
}

.spotlight-preview {
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--board-surface);
}

.spotlight-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}

.spotlight-kicker,
.section-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  color: #e86f9c;
  font-size: 12px;
  font-weight: 800;
}

.spotlight-copy h3,
.section-heading h3 {
  margin: 0;
  color: var(--board-text);
  letter-spacing: 0;
}

.spotlight-copy h3 {
  font-size: 26px;
  line-height: 1.25;
}

.spotlight-copy p {
  margin: 0;
  color: #5f6f85;
  font-size: 14px;
  line-height: 1.8;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.spotlight-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spotlight-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: 10px;
  background: var(--board-surface);
  border: 1px solid rgba(226, 232, 240, 0.86);
  color: var(--board-text);
  font-size: 12px;
  font-weight: 700;
}

.spotlight-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.browse-cta,
.browse-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #e86f9c;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.discovery-side {
  display: grid;
  gap: 10px;
}

.metric-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
}

.metric-cell > .n-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #2f6fb4;
  background: rgba(96, 165, 250, 0.13);
}

.metric-cell strong,
.metric-cell span {
  display: block;
}

.metric-cell strong {
  color: var(--board-text);
  font-size: 18px;
  line-height: 1.1;
}

.metric-cell span {
  margin-top: 3px;
  color: var(--board-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.mini-pick {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 66px;
  padding: 10px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 12px;
  background: var(--board-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.mini-pick:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 134, 169, 0.26);
  background: var(--board-surface);
}

.mini-pick img {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  object-fit: cover;
}

.mini-pick-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-pick-text strong,
.mini-pick-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-pick-text strong {
  color: var(--board-text);
  font-size: 13px;
}

.mini-pick-text span {
  color: var(--board-text-muted);
  font-size: 12px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
}

.section-heading h3 {
  margin-top: 4px;
  font-size: 20px;
}

.result-count {
  color: var(--board-text-muted);
  font-size: 13px;
  font-weight: 800;
}

.collection-card {
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.26s ease, box-shadow 0.26s ease, border-color 0.26s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;

  /* ✅ 入场动画 */
  animation: fadeInUp 0.6s ease-out both;
}

/* 入场动画延迟 */
.collection-card:nth-child(1) { animation-delay: 0.05s; }
.collection-card:nth-child(2) { animation-delay: 0.1s; }
.collection-card:nth-child(3) { animation-delay: 0.15s; }
.collection-card:nth-child(4) { animation-delay: 0.2s; }
.collection-card:nth-child(5) { animation-delay: 0.25s; }
.collection-card:nth-child(6) { animation-delay: 0.3s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.collection-card::before {
  content: none;
}

.collection-card:hover::before {
  opacity: 0;
}

.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 50px rgba(31, 41, 55, 0.12), 0 16px 34px rgba(245, 134, 169, 0.1);
  border-color: rgba(245, 134, 169, 0.22);
  z-index: 10;
}

.collection-card:focus-visible {
  outline: 2px solid var(--lg-accent, var(--ui-primary));
  outline-offset: 2px;
  z-index: 10;
}

.cover-box {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #f7f9fd 0%, #edf5ff 100%);
  overflow: hidden;
}

.preview-collage {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  background: #e2e8f0;
}

.preview-collage-large {
  min-height: 250px;
}

.preview-tile {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--board-surface);
}

.preview-tile:first-child {
  grid-row: span 2;
}

.preview-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transition: transform 0.5s ease;
}

.collection-card:hover .preview-tile img,
.spotlight-card:hover .preview-tile img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #edf5ff 100%);
}

.cover-stats {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
  z-index: 2;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(15, 23, 42, 0.58);
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

/* ✅ 热力值徽章样式 */
.hot-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, var(--ui-primary) 0%, #ff9cc0 100%);
  color: white;
  font-size: 11px;
  font-weight: 800;
  padding: 7px 11px;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(245, 134, 169, 0.28);
  letter-spacing: 0;
  z-index: 2;
}

@keyframes badge-glow {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 6px 20px rgba(255, 107, 157, 0.5);
  }
  50% {
    transform: scale(1.08);
    box-shadow: 0 8px 32px rgba(255, 107, 157, 0.7);
  }
}

.info-box {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  flex: 1;
  background: var(--board-surface);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.collection-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--board-text);
  flex: 1;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s;
}

.collection-card:hover .collection-name {
  color: var(--ui-primary-hover);
}

.collection-desc {
  font-size: 13px;
  color: var(--board-text-muted);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.freshness {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  color: #8b9aae;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  margin-top: 3px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 9px;
  background: rgba(96, 165, 250, 0.11);
  color: #2f6fb4;
  font-size: 11px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.owner-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}

.owner-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin: -10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.owner-box:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  transform: translateX(4px);
}

.owner-box:hover .owner-name {
  color: #667eea;
  font-weight: 700;
}

.owner-name {
  font-size: 13px;
  color: var(--board-text);
  font-weight: 600;
  transition: all 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strength-pill {
  flex: 0 0 auto;
  color: var(--board-text-muted);
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 9px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.action-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.reaction-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.action-count {
  font-size: 13px;
  color: var(--board-text-muted);
  font-weight: 700;
}

.pagination-box {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

@media (max-width: 768px) {
  .page-container {
    gap: 24px;
  }

  .board-header-section {
    padding: 20px;
  }

  .filter-section {
    flex-direction: column;
    padding: 16px;
    border-radius: 16px;
  }

  .search-box,
  .sort-box {
    width: 100%;
    min-width: unset;
  }

  .discovery-strip,
  .spotlight-card {
    grid-template-columns: 1fr;
  }

  .spotlight-card {
    min-height: 0;
    padding: 14px;
    gap: 14px;
  }

  .spotlight-copy h3 {
    font-size: 20px;
  }

  .spotlight-copy p {
    -webkit-line-clamp: 2;
  }

  .spotlight-meta span {
    padding: 6px 8px;
  }

  .discovery-side {
    grid-template-columns: repeat(3, 1fr);
  }

  .metric-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
  }

  .mini-pick {
    grid-column: span 3;
  }

  .section-heading {
    align-items: flex-start;
  }

  .collection-card {
    border-radius: 12px;
  }

  .collection-card:hover {
    transform: translateY(-3px);
  }

  .cover-box {
    aspect-ratio: 1 / 1;
  }

  .info-box {
    padding: 12px;
    gap: 8px;
  }

  .collection-name {
    font-size: 14px;
  }

  .freshness,
  .strength-pill {
    display: none;
  }

  .collection-desc {
    font-size: 12px;
    -webkit-line-clamp: 1;
  }

  .owner-name {
    font-size: 12px;
  }

  .action-box {
    gap: 10px;
    padding-top: 8px;
    align-items: center;
  }

  .reaction-group {
    gap: 6px;
  }

  .action-count {
    font-size: 12px;
  }

  .browse-link {
    display: none;
  }

  .stat-item {
    font-size: 11px;
    padding: 4px 8px;
  }

  .hot-badge {
    font-size: 10px;
    padding: 6px 10px;
  }
}

@media (max-width: 420px) {

  .discovery-side {
    grid-template-columns: 1fr;
  }

  .mini-pick {
    grid-column: auto;
  }
}

.board-header-section { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.ui-card, .header, .collection-card { background: var(--board-surface); color: var(--board-text); }
</style>
