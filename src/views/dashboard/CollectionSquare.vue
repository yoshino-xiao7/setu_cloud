<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard,
  NTag,
  NButton,
  NIcon,
  NInput,
  NSelect,
  NPagination,
  NSkeleton,
  NEmpty,
  NAvatar,
  NTooltip,
  NPopover,
  useMessage
} from 'naive-ui'
import {
  SearchOutline,
  HeartOutline,
  Heart,
  StarOutline,
  Star,
  EyeOutline,
  ImageOutline,
  PersonOutline,
  TrendingUpOutline,
  TimeOutline,
  ThumbsUpOutline
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import {
  getSquareCollections,
  likeSquareCollection,
  unlikeSquareCollection,
  favoriteSquareCollection,
  unfavoriteSquareCollection,
  type SquareCollectionDTO
} from '@/api/collections'

const router = useRouter()
const message = useMessage()

// =======================
// 滚动进度条
// =======================
const scrollProgress = ref(0)

const updateScrollProgress = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
  scrollProgress.value = (scrollTop / scrollHeight) * 100
}

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress)
  fetchCollections()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})

// =======================
// 数字滚动动画
// =======================
const animateNumber = (element: HTMLElement, start: number, end: number, duration: number) => {
  const startTime = performance.now()
  
  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 缓动函数
    const easeOutQuad = (t: number) => t * (2 - t)
    const current = Math.floor(start + (end - start) * easeOutQuad(progress))
    
    element.textContent = current.toString()
    
    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }
  
  requestAnimationFrame(update)
}

// =======================
// 涟漪效果
// =======================
const createRipple = (event: MouseEvent) => {
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
// 工具函数
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

// =======================
// 搜索和排序
// =======================
const keyword = ref('')
const sortType = ref<'hot' | 'new' | 'like'>('hot')

const sortOptions = [
  { label: '🔥 热门', value: 'hot' },
  { label: '🆕 最新', value: 'new' },
  { label: '👍 点赞', value: 'like' }
]

// =======================
// 列表数据
// =======================
const loading = ref(false)
const collections = ref<SquareCollectionDTO[]>([])
const hoveredCollectionId = ref<number | null>(null)  // ✅ 跟踪悬停的收藏夹
const previewImages = ref<Record<number, any[]>>({})  // ✅ 缓存预览图片
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

const fetchCollections = async () => {
  loading.value = true
  try {
    const res: any = await getSquareCollections({
      page: pagination.page,
      size: pagination.size,
      sort: sortType.value,
      keyword: keyword.value.trim() || undefined
    })
    
    const data = unwrap(res) || {}
    console.log('✅ [广场] 后端返回数据:', data)
    
    // ✅ 后端返回的是 list 而不是 items
    const listData = data.list || data.items || data.records || []
    
    collections.value = listData.map((item: any) => {
      // 🔍 调试：查看单个项目的数据
      if (!item.ownerNickname) {
        console.warn('⚠️ [广场] 收藏夹', item.id, '缺少分享者信息')
      }
      if (!item.itemCount) {
        console.warn('⚠️ [广场] 收藏夹', item.id, '缺少图片数量')
      }
      if (!item.coverPid && !item.coverUrl) {
        console.warn('⚠️ [广场] 收藏夹', item.id, '缺少封面图片')
      }
      
      // 🔍 调试：查看 userId 字段
      console.log('🔍 [广场] 收藏夹 #' + item.id + ' userId:', item.userId, 'ownerId:', item.ownerId)
      
      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        coverPid: item.coverPid,
        coverP: item.coverP || 0,
        coverUrl: item.coverUrl,  // ✅ 后端直接返回完整URL
        userId: item.userId || item.ownerId,  // ✅ 添加 userId 映射
        ownerNickname: item.ownerNickname || '匿名用户',
        ownerAvatarUrl: item.ownerAvatarUrl || null,
        itemCount: item.itemCount ?? 0,
        shareViewCount: item.shareViewCount || 0,
        likeCount: item.shareLikeCount || 0,
        favoriteCount: item.shareFavCount || 0,
        // ✅ 注意：后端返回的是 likedByMe 和 favoritedByMe
        isLiked: !!item.likedByMe,
        isFavorited: !!item.favoritedByMe,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        shareCreatedAt: item.shareCreatedAt
      }
    })
    
    pagination.total = data.total || 0
    console.log('✅ [广场] 解析完成，共', collections.value.length, '个收藏夹')
  } catch (e: any) {
    console.error('❌ [广场] 加载失败:', e)
    message.error(e?.response?.data?.message || e?.response?.data?.msg || '加载广场失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchCollections()
}

const handleSortChange = () => {
  pagination.page = 1
  fetchCollections()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchCollections()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// =======================
// 点赞/收藏操作
// =======================
const handleLike = async (item: SquareCollectionDTO) => {
  try {
    console.log('🔍 [点赞] 开始操作，收藏夹ID:', item.id, '当前状态:', item.isLiked)
    
    if (item.isLiked) {
      await unlikeSquareCollection(item.id)
      item.isLiked = false
      item.likeCount = Math.max(0, item.likeCount - 1)
      message.success('已取消点赞')
    } else {
      await likeSquareCollection(item.id)
      item.isLiked = true
      item.likeCount += 1
      message.success('点赞成功')
    }
    
    console.log('✅ [点赞] 操作成功')
  } catch (e: any) {
    console.error('❌ [点赞] 操作失败:', e)
    console.error('❌ [点赞] 错误详情:', e?.response?.data)
    console.error('❌ [点赞] 状态码:', e?.response?.status)
    
    const errMsg = e?.response?.data?.message || e?.response?.data?.msg || e?.message || '操作失败'
    message.error(`点赞失败: ${errMsg}`)
  }
}

const handleFavorite = async (item: SquareCollectionDTO) => {
  try {
    console.log('🔍 [收藏] 开始操作，收藏夹ID:', item.id, '当前状态:', item.isFavorited)
    
    if (item.isFavorited) {
      await unfavoriteSquareCollection(item.id)
      item.isFavorited = false
      item.favoriteCount = Math.max(0, item.favoriteCount - 1)
      message.success('已取消收藏')
    } else {
      await favoriteSquareCollection(item.id)
      item.isFavorited = true
      item.favoriteCount += 1
      message.success('收藏成功')
    }
    
    console.log('✅ [收藏] 操作成功')
  } catch (e: any) {
    console.error('❌ [收藏] 操作失败:', e)
    console.error('❌ [收藏] 错误详情:', e?.response?.data)
    console.error('❌ [收藏] 状态码:', e?.response?.status)
    
    const errMsg = e?.response?.data?.message || e?.response?.data?.msg || e?.message || '操作失败'
    message.error(`收藏失败: ${errMsg}`)
  }
}

// =======================
// 跳转详情
// =======================
const viewDetail = (item: SquareCollectionDTO) => {
  // ✅ 登录用户跳转到框架内的路由
  router.push(`/dashboard/collection/${item.id}`)
}

// =======================
// 跳转用户主页
// =======================
const goToUserProfile = (userId: number) => {
  if (!userId) return
  router.push(`/user/${userId}`)
}

// =======================
// 预览图片加载（模拟后端返回）
// =======================
const loadPreviewImages = async (item: SquareCollectionDTO) => {
  if (previewImages.value[item.id]) return
  
  try {
    // ✅ 这里可以后续调用 API 获取前3张图片
    // const res = await getCollectionItems(item.id, { page: 1, size: 3 })
    // previewImages.value[item.id] = unwrap(res)?.items || []
    
    // 暂时使用模拟数据
    previewImages.value[item.id] = []
  } catch (e) {
    console.error('预览加载失败:', e)
  }
}

const handleMouseEnter = (item: SquareCollectionDTO) => {
  hoveredCollectionId.value = item.id
  loadPreviewImages(item)
}

const handleMouseLeave = () => {
  hoveredCollectionId.value = null
}

// =======================
// 封面图片处理
// =======================
const getCoverUrl = (item: SquareCollectionDTO) => {
  // ✅ 优先使用后端返回的 coverUrl
  if (item.coverUrl) {
    return item.coverUrl
  }
  
  // 降级：如果后端没返回 coverUrl，但有 coverPid，则前端拼接
  if (item.coverPid) {
    const p = item.coverP || 0
    // ✅ 使用 regular 尺寸（600x600）或 img-master，避免使用不存在的 360x360
    // 方案1：使用 i.yukiryou.top 的 c/600x600_90 尺寸
    return `https://i.yukiryou.top/c/600x600_90/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
    // 方案2（备选）：使用 img-master 原始尺寸（会更大）
    // return `https://i.yukiryou.top/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
  }
  
  console.warn('⚠️ [广场] 收藏夹', item.id, '没有封面图片')
  return ''
}

// ✅ 获取热力值标签
const getHotLabel = (item: SquareCollectionDTO) => {
  const score = (item.likeCount || 0) + (item.shareViewCount || 0) * 0.5 + (item.favoriteCount || 0) * 1.5
  console.log('🔥 [热力值] 收藏夹 #' + item.id + ' 得分:', score, '(点赞:' + item.likeCount + ', 浏览:' + item.shareViewCount + ', 收藏:' + item.favoriteCount + ')')
  
  if (score > 100) return '🔥 热门'
  if (score > 50) return '🌟 精选'
  if (score > 10) return '👍 不错'
  // ✅ 降低阈值，让测试数据也能显示
  if (score > 0) return '✨ 新秀'
  return null
}

// =======================
// 初始化
// =======================
// onMounted 已经在上面定义了，不需要重复
</script>

<template>
  <div class="page-container">
    <!-- ✅ 滚动进度条 -->
    <div class="scroll-progress-bar">
      <div class="scroll-progress-fill" :style="{ width: scrollProgress + '%' }"></div>
    </div>

    <div class="header-section">
      <h2 class="title">收藏夹广场</h2>
      <p class="subtitle">
        发现其他用户分享的精彩收藏 · 共 {{ pagination.total }} 个公开收藏夹
      </p>
    </div>

    <!-- 搜索和排序 -->
    <div class="filter-section">
      <div class="search-box">
        <n-input
          v-model:value="keyword"
          placeholder="搜索收藏夹名称或描述..."
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button type="primary" color="#f586a9" size="large" @click="handleSearch">
          <template #icon><n-icon><SearchOutline /></n-icon></template>
          搜索
        </n-button>
      </div>

      <div class="sort-box">
        <n-select
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
        <n-skeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
      </div>
    </div>

    <div v-else-if="!loading && collections.length === 0" class="empty-box">
      <n-empty description="暂无公开收藏夹" size="large">
        <template #icon><n-icon><ImageOutline /></n-icon></template>
        <template #extra>
          <n-button type="primary" secondary @click="router.push('/dashboard/collections')">
            去创建我的收藏夹
          </n-button>
        </template>
      </n-empty>
    </div>

    <div v-else class="content-wrapper">
      <div class="collection-grid">
        <div
          v-for="item in collections"
          :key="item.id"
          class="collection-card glass-card ripple-container"
          @click="(e) => { createRipple(e); viewDetail(item); }"
          @mouseenter="handleMouseEnter(item)"
          @mouseleave="handleMouseLeave"
        >
          <!-- 封面图 -->
          <div class="cover-box">
            <img
              v-if="item.coverPid"
              :src="getCoverUrl(item)"
              :alt="item.name"
              class="cover-img"
              referrerpolicy="no-referrer"
            />
            <div v-else class="cover-placeholder">
              <n-icon size="60" color="#cbd5e1"><ImageOutline /></n-icon>
            </div>

            <!-- 统计角标 -->
            <div class="cover-stats">
              <div class="stat-item">
                <n-icon size="14"><ImageOutline /></n-icon>
                <span>{{ item.itemCount }}</span>
              </div>
              <div class="stat-item">
                <n-icon size="14"><EyeOutline /></n-icon>
                <span>{{ item.shareViewCount }}</span>
              </div>
            </div>
            
            <!-- ✅ 热力值标签 -->
            <div v-if="getHotLabel(item)" class="hot-badge">
              {{ getHotLabel(item) }}
            </div>
          </div>

          <!-- 信息区 -->
          <div class="info-box" @click.stop>
            <div class="info-header">
              <div class="collection-name" :title="item.name">{{ item.name }}</div>
            </div>

            <div v-if="item.description" class="collection-desc" :title="item.description">
              {{ item.description }}
            </div>

            <!-- 作者信息 -->
            <div class="owner-box" @click.stop="goToUserProfile(item.userId || 0)">
              <n-avatar
                :src="item.ownerAvatarUrl"
                round
                size="small"
                :fallback-src="`https://api.dicebear.com/7.x/identicon/svg?seed=${item.ownerNickname}`"
              />
              <span class="owner-name">{{ item.ownerNickname }}</span>
            </div>

            <!-- 交互按钮 -->
            <div class="action-box">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    circle
                    size="small"
                    :type="item.isLiked ? 'error' : 'default'"
                    :secondary="!item.isLiked"
                    @click.stop="handleLike(item)"
                  >
                    <template #icon>
                      <n-icon><Heart v-if="item.isLiked" /><HeartOutline v-else /></n-icon>
                    </template>
                  </n-button>
                </template>
                {{ item.isLiked ? '取消点赞' : '点赞' }}
              </n-tooltip>
              <span class="action-count">{{ item.likeCount }}</span>

              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    circle
                    size="small"
                    :type="item.isFavorited ? 'warning' : 'default'"
                    :secondary="!item.isFavorited"
                    @click.stop="handleFavorite(item)"
                  >
                    <template #icon>
                      <n-icon><Star v-if="item.isFavorited" /><StarOutline v-else /></n-icon>
                    </template>
                  </n-button>
                </template>
                {{ item.isFavorited ? '取消收藏' : '收藏' }}
              </n-tooltip>
              <span class="action-count">{{ item.favoriteCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-box" v-if="pagination.total > 0">
        <n-pagination
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
  padding: 48px 32px 100px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.header-section {
  text-align: center;
}

.title {
  font-size: 42px;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.subtitle {
  color: #64748b;
  margin-top: 12px;
  font-size: 16px;
  font-weight: 500;
}

.filter-section {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
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
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
.skeleton-card {
  /* ✅ 与实际卡片比例一致 */
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

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.collection-card {
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  
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
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
  z-index: 1;
}

.collection-card:hover::before {
  opacity: 1;
}

.collection-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow: 0 28px 56px rgba(102, 126, 234, 0.18), 0 12px 24px rgba(118, 75, 162, 0.12);
  z-index: 10;
}

.cover-box {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.collection-card:hover .cover-img {
  transform: scale(1.15) rotate(2deg);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.15;
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(16px) saturate(180%);
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

/* ✅ 热力值徽章样式 */
.hot-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: linear-gradient(135deg, #ff6b9d 0%, #c471ed 50%, #12c2e9 100%);
  color: white;
  font-size: 11px;
  font-weight: 800;
  padding: 8px 14px;
  border-radius: 30px;
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.5);
  animation: badge-glow 3s ease-in-out infinite;
  letter-spacing: 0.5px;
  text-transform: uppercase;
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
  gap: 12px;
  flex: 1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(247, 250, 252, 0.6) 100%);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.collection-name {
  font-size: 17px;
  font-weight: 800;
  color: #1e293b;
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
  color: #667eea;
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
}

.action-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
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
    padding: 24px 16px 80px;
    gap: 24px;
  }
  
  .title {
    font-size: 32px;
  }
  
  .subtitle {
    font-size: 14px;
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
  
  .collection-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .collection-card {
    border-radius: 16px;
  }
  
  .collection-card:hover {
    transform: translateY(-6px) scale(1.01);
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
  }
  
  .action-count {
    font-size: 12px;
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
</style>
