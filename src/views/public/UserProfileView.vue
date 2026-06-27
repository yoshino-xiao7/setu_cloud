<script setup lang="ts">
import type { SquareCollectionDTO } from '@/api/collections'
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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSquareCollections } from '@/api/collections'
import { IMAGE_CDN_URL } from '@/api/env'
import { unwrapApiData } from '@/api/response'
import { useUserProfileSeo } from '@/composables/useSeo'
import { safePush } from '@/utils/navigation'

const route = useRoute()
const router = useRouter()
const message = useMessage()

// =======================
// 状态
// =======================
const userId = computed(() => Number(route.params.userId))
const loading = ref(false)
const collections = ref<SquareCollectionDTO[]>([])
const userInfo = ref({
  nickname: '',
  avatar: '',
})
const pagination = ref({ page: 1, size: 12, total: 0 })

// ✅ 使用响应式 SEO：昵称加载后动态更新标题和描述
const nicknameForSeo = computed(() => userInfo.value.nickname || '用户')
useUserProfileSeo(nicknameForSeo)

// =======================
// 获取用户的收藏夹
// =======================
async function fetchUserCollections() {
  if (!userId.value)
    return

  loading.value = true
  try {
    const res = await getSquareCollections({
      page: pagination.value.page,
      size: pagination.value.size,
      keyword: undefined,
    })

    const data = unwrapApiData<{ list?: SquareCollectionDTO[], items?: SquareCollectionDTO[], records?: SquareCollectionDTO[] }>(res, {})
    const listData = data.list || data.items || data.records || []

    // 筛选出该用户的收藏夹
    collections.value = listData.filter((item: SquareCollectionDTO) => item.userId === userId.value)

    // 从第一条记录获取用户信息
    if (collections.value.length > 0 || listData.length > 0) {
      const firstItem = collections.value[0] || listData.find(item => item.userId === userId.value) || listData[0]
      if (!firstItem)
        return
      userInfo.value = {
        nickname: firstItem.ownerNickname || `用户#${userId.value}`,
        avatar: firstItem.ownerAvatarUrl || '',
      }
    }

    pagination.value.total = collections.value.length
  }
  catch {
    message.error('加载用户收藏夹失败')
  }
  finally {
    loading.value = false
  }
}

// =======================
// 导航函数
// =======================
function goBack() {
  router.back()
}

function viewDetail(item: SquareCollectionDTO) {
  void safePush(router, `/dashboard/collection/${item.id}`)
}

function getCoverUrl(item: SquareCollectionDTO) {
  if (item.coverUrl)
    return item.coverUrl

  if (item.coverPid) {
    const p = item.coverP || 0
    return `${IMAGE_CDN_URL}/c/600x600_90/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
  }

  return ''
}

// =======================
// 生命周期
// =======================
onMounted(() => {
  fetchUserCollections()
})
</script>

<template>
  <div class="user-profile-page page-container ui-page">
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

    <div v-else class="collection-grid">
      <div
        v-for="item in collections"
        :key="item.id"
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
    </div>
  </div>
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
  color: var(--ui-text);
  margin: 0 0 8px 0;
}

.user-stats {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.stat-value {
  color: #f586a9;
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
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

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
  outline: 2px solid var(--lg-accent, #f586a9);
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
  background: #fff;
}

.collection-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ui-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-desc {
  font-size: 12px;
  color: #6b7280;
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
  color: #6b7280;
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

  .collection-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
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
</style>
