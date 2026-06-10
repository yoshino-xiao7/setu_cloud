<script setup lang="ts">
import type { CollectionPreviewImageDTO, SquareCollectionDTO, SquarePageResult } from '@/api/collections'
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
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import {
  favoriteSquareCollection,
  getSquareCollections,
  likeSquareCollection,
  unfavoriteSquareCollection,
  unlikeSquareCollection,
} from '@/api/collections'
import { IMAGE_CDN_URL } from '@/api/env'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatRelative } from '@/utils/dateFormat'
import { safePush } from '@/utils/navigation'

const router = useRouter()
const message = useMessage()
const collectionsGuard = useRequestGuard()
const { isMobile } = useBreakpoint()

// =======================
// 滚动进度条
// =======================
const scrollProgress = ref(0)

let scrollRaf = 0
function updateScrollProgress() {
  cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
    scrollProgress.value = (scrollTop / scrollHeight) * 100
  })
}

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress)
  fetchCollections()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})

// =======================
// 涟漪效果
// =======================
function createRipple(event: MouseEvent) {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion || isMobile.value)
    return

  const button = event.currentTarget as HTMLElement
  const ripple = document.createElement('span')
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2

  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  ripple.classList.add('ripple-effect')

  button.appendChild(ripple)

  setTimeout(() => {
    ripple.remove()
  }, 600)
}

// =======================
// 搜索和排序
// =======================
const keyword = ref('')
const sortType = ref<'hot' | 'new' | 'like'>('hot')

const sortOptions = [
  { label: '热门', value: 'hot' },
  { label: '最新', value: 'new' },
  { label: '点赞', value: 'like' },
]

// =======================
// 列表数据
// =======================
const loading = ref(false)
const collections = shallowRef<SquareCollectionDTO[]>([])
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0,
})

async function fetchCollections() {
  const requestId = collectionsGuard.next()
  loading.value = true
  try {
    const res = await getSquareCollections({
      page: pagination.page,
      size: pagination.size,
      sort: sortType.value,
      keyword: keyword.value.trim() || undefined,
    })
    if (!collectionsGuard.isCurrent(requestId))
      return

    const data = unwrapApiData<SquarePageResult>(res, { page: 1, size: 24, total: 0, items: [] })
    // ✅ 后端返回的是 list 而不是 items
    const listData = data.list || data.items || data.records || []

    collections.value = listData.map((item: SquareCollectionDTO) => {
      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        coverPid: item.coverPid,
        coverP: item.coverP || 0,
        coverUrl: item.coverUrl, // ✅ 后端直接返回完整URL
        userId: item.userId || item.ownerId, // ✅ 添加 userId 映射
        ownerNickname: item.ownerNickname || '匿名用户',
        ownerAvatarUrl: item.ownerAvatarUrl || null,
        itemCount: item.itemCount ?? 0,
        shareViewCount: item.shareViewCount ?? 0,
        likeCount: item.shareLikeCount ?? item.likeCount ?? 0,
        favoriteCount: item.shareFavCount ?? item.favoriteCount ?? 0,
        // ✅ 注意：后端返回的是 likedByMe 和 favoritedByMe
        isLiked: !!item.likedByMe,
        isFavorited: !!item.favoritedByMe,
        previewImages: normalizePreviewImages(item),
        tags: normalizeTags(item),
        themeTags: item.themeTags,
        curatorNote: item.curatorNote,
        scoreReason: item.scoreReason,
        recentItemCount: item.recentItemCount,
        ownerCollectionCount: item.ownerCollectionCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        shareCreatedAt: item.shareCreatedAt,
      }
    })

    pagination.total = data.total || 0
  }
  catch (e: unknown) {
    if (!collectionsGuard.isCurrent(requestId) || shouldIgnoreApiError(e))
      return
    message.error(getApiErrorMessage(e, '加载广场失败'))
  }
  finally {
    if (collectionsGuard.isCurrent(requestId))
      loading.value = false
  }
}

const featuredCollections = computed(() => collections.value.slice(0, 3))
const heroCollection = computed(() => featuredCollections.value[0] || null)
const totalImageCount = computed(() => collections.value.reduce((sum, item) => sum + (item.itemCount || 0), 0))
const totalInteractionCount = computed(() => collections.value.reduce(
  (sum, item) => sum + (item.likeCount || 0) + (item.favoriteCount || 0),
  0,
))

function patchCollection(id: number, patch: Partial<SquareCollectionDTO>) {
  collections.value = collections.value.map(item => (
    item.id === id ? { ...item, ...patch } : item
  ))
}

function handleSearch() {
  pagination.page = 1
  fetchCollections()
}

function handleSortChange() {
  pagination.page = 1
  fetchCollections()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchCollections()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// =======================
// 点赞/收藏操作
// =======================
async function handleLike(item: SquareCollectionDTO) {
  try {
    if (item.isLiked) {
      await unlikeSquareCollection(item.id)
      patchCollection(item.id, {
        isLiked: false,
        likeCount: Math.max(0, item.likeCount - 1),
      })
      message.success('已取消点赞')
    }
    else {
      await likeSquareCollection(item.id)
      patchCollection(item.id, {
        isLiked: true,
        likeCount: item.likeCount + 1,
      })
      message.success('点赞成功')
    }
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    const errMsg = getApiErrorMessage(e, '操作失败')
    message.error(`点赞失败: ${errMsg}`)
  }
}

async function handleFavorite(item: SquareCollectionDTO) {
  try {
    if (item.isFavorited) {
      await unfavoriteSquareCollection(item.id)
      patchCollection(item.id, {
        isFavorited: false,
        favoriteCount: Math.max(0, item.favoriteCount - 1),
      })
      message.success('已取消收藏')
    }
    else {
      await favoriteSquareCollection(item.id)
      patchCollection(item.id, {
        isFavorited: true,
        favoriteCount: item.favoriteCount + 1,
      })
      message.success('收藏成功')
    }
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    const errMsg = getApiErrorMessage(e, '操作失败')
    message.error(`收藏失败: ${errMsg}`)
  }
}

// =======================
// 跳转详情
// =======================
function viewDetail(item: SquareCollectionDTO) {
  // ✅ 登录用户跳转到框架内的路由
  void safePush(router, `/dashboard/collection/${item.id}`)
}

// =======================
// 跳转用户主页
// =======================
function goToUserProfile(userId: number) {
  if (!userId)
    return
  void safePush(router, `/user/${userId}`)
}

// =======================
// 封面图片处理
// =======================
function getCoverUrl(item: SquareCollectionDTO) {
  // ✅ 优先使用后端返回的 coverUrl
  if (item.coverUrl) {
    return item.coverUrl
  }

  // 降级：如果后端没返回 coverUrl，但有 coverPid，则前端拼接
  if (item.coverPid) {
    const p = item.coverP || 0
    // ✅ 使用 regular 尺寸（600x600）或 img-master，避免使用不存在的 360x360
    // 方案1：使用 i.yukiryou.top 的 c/600x600_90 尺寸
    return `${IMAGE_CDN_URL}/c/600x600_90/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
    // 方案2（备选）：使用 img-master 原始尺寸（会更大）
    // return `https://i.yukiryou.top/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
  }

  return ''
}

function getPreviewUrl(image: CollectionPreviewImageDTO) {
  return image.url || image.urlSmall || image.urlRegular || image.urlOriginal || ''
}

function normalizePreviewImages(item: SquareCollectionDTO): CollectionPreviewImageDTO[] {
  const images = Array.isArray(item.previewImages) ? item.previewImages : []
  const normalized = images
    .map(image => ({
      ...image,
      p: image.p ?? 0,
      url: getPreviewUrl(image),
    }))
    .filter(image => image.url)

  if (normalized.length > 0)
    return normalized.slice(0, 5)

  const coverUrl = getCoverUrl(item)
  if (!coverUrl)
    return []

  return [{
    pid: item.coverPid || item.id,
    p: item.coverP || 0,
    title: item.name,
    url: coverUrl,
  }]
}

function getPreviewImages(item: SquareCollectionDTO) {
  const images = Array.isArray(item.previewImages) ? item.previewImages : []
  return images.length > 0 ? images : normalizePreviewImages(item)
}

function getFirstPreviewUrl(item: SquareCollectionDTO) {
  const image = getPreviewImages(item)[0]
  return image ? getPreviewUrl(image) : ''
}

function normalizeTags(item: SquareCollectionDTO) {
  const rawTags = [...(item.tags || []), ...(item.themeTags || [])]
  const tags = rawTags
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
  return Array.from(new Set(tags)).slice(0, 4)
}

function getMoodText(item: SquareCollectionDTO) {
  if (item.curatorNote)
    return item.curatorNote
  if (item.scoreReason)
    return item.scoreReason
  if (item.description)
    return item.description
  if (item.recentItemCount && item.recentItemCount > 0)
    return `最近新增 ${item.recentItemCount} 张作品`
  return `${item.itemCount || 0} 张作品组成的公开收藏夹`
}

function getFreshnessLabel(item: SquareCollectionDTO) {
  if (item.recentItemCount && item.recentItemCount > 0)
    return `新增 ${item.recentItemCount}`
  if (item.updatedAt)
    return `更新 ${formatRelative(item.updatedAt)}`
  if (item.shareCreatedAt)
    return `分享 ${formatRelative(item.shareCreatedAt)}`
  return '公开分享'
}

function getCollectionStrength(item: SquareCollectionDTO) {
  if ((item.favoriteCount || 0) >= 30)
    return '很多人在收藏'
  if ((item.likeCount || 0) >= 50)
    return '点赞很高'
  if ((item.shareViewCount || 0) >= 200)
    return '浏览热度高'
  if ((item.itemCount || 0) >= 80)
    return '内容很足'
  return '值得看看'
}

// ✅ 获取热力值标签
function getHotLabel(item: SquareCollectionDTO) {
  const score = (item.likeCount || 0) + (item.shareViewCount || 0) * 0.5 + (item.favoriteCount || 0) * 1.5
  if (score > 100)
    return '热门'
  if (score > 50)
    return '精选'
  if (score > 10)
    return '好评'
  // ✅ 降低阈值，让测试数据也能显示
  if (score > 0)
    return '新秀'
  return null
}

// =======================
// 初始化
// =======================
// onMounted 已经在上面定义了，不需要重复
</script>

<template>
  <div class="page-container ui-page">
    <!-- ✅ 滚动进度条 -->
    <div class="scroll-progress-bar">
      <div class="scroll-progress-fill" :style="{ width: `${scrollProgress}%` }" />
    </div>

    <div class="header-section ui-page-header ui-card">
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
          <NButton type="primary" secondary @click="safePush(router, '/dashboard/collections')">
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

      <div class="collection-grid">
        <div
          v-for="item in collections"
          :key="item.id"
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
      </div>

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
  </div>
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
  background: linear-gradient(90deg, #f586a9 0%, #fca5c8 50%, #ff9a9e 100%);
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

.ripple-effect {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
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

.header-section {
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

.glass-card {
  border-radius: var(--ui-radius-xl) !important;
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
  outline: 2px solid var(--lg-accent, #f586a9);
  outline-offset: 2px;
}

.spotlight-preview {
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #f7f9fd;
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
  color: #1f2937;
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
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.86);
  color: #475569;
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
  color: #1f2937;
  font-size: 18px;
  line-height: 1.1;
}

.metric-cell span {
  margin-top: 3px;
  color: #64748b;
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
  background: rgba(255, 255, 255, 0.78);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.mini-pick:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 134, 169, 0.26);
  background: #fff;
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
  color: #1f2937;
  font-size: 13px;
}

.mini-pick-text span {
  color: #64748b;
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
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
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
  outline: 2px solid var(--lg-accent, #f586a9);
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
  background: #f1f5f9;
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
  background: linear-gradient(135deg, #f586a9 0%, #ff9cc0 100%);
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
  background: rgba(255, 255, 255, 0.72);
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
  color: var(--ui-text);
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
  color: #f26d99;
}

.collection-desc {
  font-size: 13px;
  color: #64748b;
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
  color: #475569;
  font-weight: 600;
  transition: all 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strength-pill {
  flex: 0 0 auto;
  color: #64748b;
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
  color: #64748b;
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

  .header-section {
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

  .collection-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
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
  .collection-grid {
    grid-template-columns: 1fr;
  }

  .discovery-side {
    grid-template-columns: 1fr;
  }

  .mini-pick {
    grid-column: auto;
  }
}
</style>
