<script setup lang="ts">
import {
  ArrowBackOutline,
  EyeOutline,
  HeartOutline,
  ImageOutline,
  StarOutline,
} from '@vicons/ionicons5'
import {
  NAvatar,
  NButton,
  NEmpty,
  NIcon,
  NSkeleton,
  useMessage,
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { UiBoard, UiMosaic } from '@/components/ui'
import { useUserProfileView } from '@/composables/useUserProfileView'

const router = useRouter()
const message = useMessage()

const {
  collections,
  getCoverUrl,
  goBack,
  loading,
  userInfo,
  viewDetail,
} = useUserProfileView({
  message,
  router,
})
</script>

<template>
  <UiBoard class="user-profile-page page-container ui-page">
    <!-- 返回按钮 -->
    <NButton text style="margin-bottom: 20px;" @click="goBack">
      <template #icon>
        <NIcon><ArrowBackOutline /></NIcon>
      </template>
      返回
    </NButton>

    <!-- 用户信息卡 -->
    <div v-if="!loading" class="user-header ui-card ui-page-header">
      <NAvatar
        :src="userInfo.avatar"
        round
        :size="80"
        :fallback-src="`https://api.dicebear.com/7.x/identicon/svg?seed=${userInfo.nickname}`"
      />
      <div class="user-info">
        <h1 class="user-name">
          {{ userInfo.nickname }}
        </h1>
        <p class="user-stats">
          共 <span class="stat-value">{{ collections.length }}</span> 个公开收藏夹
        </p>
      </div>
    </div>

    <!-- 收藏夹列表 -->
    <div v-if="loading" class="loading-grid">
      <div v-for="n in 6" :key="n" class="skeleton-card">
        <NSkeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
      </div>
    </div>

    <div v-else-if="collections.length === 0" class="empty-box ui-card">
      <NEmpty description="该用户还没有公开收藏夹" size="large">
        <template #icon>
          <NIcon><ImageOutline /></NIcon>
        </template>
      </NEmpty>
    </div>

    <UiMosaic v-else :items="collections" :item-key="item => item.id">
      <template #item="{ item: item }">
        <div

          class="collection-card ui-card ui-card-hover"
          role="button"
          tabindex="0"
          @click="viewDetail(item)"
          @keydown.enter="viewDetail(item)"
          @keydown.space.prevent="viewDetail(item)"
        >
          <!-- 封面图 -->
          <div class="cover-box">
            <img
              v-if="item.coverPid"
              :src="getCoverUrl(item)"
              :alt="item.name"
              class="cover-img"
              referrerpolicy="no-referrer"
              loading="lazy"
              decoding="async"
            >
            <div v-else class="cover-placeholder">
              <NIcon size="40" color="#cbd5e1">
                <ImageOutline />
              </NIcon>
            </div>

            <!-- 统计角标 -->
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
          </div>

          <!-- 信息区 -->
          <div class="info-box" @click.stop>
            <div class="collection-name" :title="item.name">
              {{ item.name }}
            </div>

            <div v-if="item.description" class="collection-desc" :title="item.description">
              {{ item.description }}
            </div>

            <!-- 交互按钮 -->
            <div class="action-box">
              <span class="action-count">
                <NIcon size="14"><HeartOutline /></NIcon>
                {{ item.likeCount }}
              </span>
              <span class="action-count">
                <NIcon size="14"><StarOutline /></NIcon>
                {{ item.favoriteCount }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </UiMosaic>
  </UiBoard>
</template>

<style scoped>
.user-profile-page {
  min-height: 80vh;
}

/* 用户信息卡 */
.user-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  margin-bottom: 40px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 28px;
  font-weight: 800;
  color: var(--board-text);
  margin: 0 0 8px 0;
}

.user-stats {
  font-size: 14px;
  color: var(--board-text-muted);
  margin: 0;
}

.stat-value {
  color: var(--ui-primary);
  font-weight: 700;
  font-size: 16px;
}

/* 加载骨架屏 */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.skeleton-card {
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
}

.empty-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* 收藏夹网格 */

.collection-card {
  padding: 0;
  border-radius: var(--ui-radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.collection-card:hover {
  z-index: 2;
}

.collection-card:focus-visible {
  outline: 2px solid var(--lg-accent, var(--ui-primary));
  outline-offset: 2px;
  z-index: 2;
}

.cover-box {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: linear-gradient(135deg, #f8fafc 0%, #edf5ff 100%);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transition: transform 0.5s;
}

.collection-card:hover .cover-img {
  transform: scale(1.035);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.1;
}

.cover-stats {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  flex-direction: column;
  align-items: flex-end;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
}

.info-box {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  background: var(--board-surface);
}

.collection-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--board-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-desc {
  font-size: 12px;
  color: var(--board-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  font-size: 12px;
  color: var(--board-text-muted);
}

.action-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    text-align: center;
    padding: 24px;
    gap: 16px;
  }

  .user-name {
    font-size: 20px;
  }

  .collection-card {
    border-radius: 12px;
  }

  .cover-box {
    aspect-ratio: 1 / 1;
  }

  .info-box {
    padding: 8px;
    gap: 6px;
  }

  .collection-name {
    font-size: 12px;
  }

  .collection-desc {
    font-size: 11px;
    -webkit-line-clamp: 1;
  }
}

.ui-card, .user-header, .header, .collection-card { background: var(--board-surface); color: var(--board-text); }
</style>
