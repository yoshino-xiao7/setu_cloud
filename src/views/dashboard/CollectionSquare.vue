<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
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
      
      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        coverPid: item.coverPid,
        coverP: item.coverP || 0,
        coverUrl: item.coverUrl,  // ✅ 后端直接返回完整URL
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
// 封面图片处理
// =======================
const getCoverUrl = (item: SquareCollectionDTO) => {
  // ✅ 优先使用后端返回的 coverUrl（small 尺寸 360x360）
  if (item.coverUrl) {
    return item.coverUrl
  }
  
  // 降级：如果后端没返回 coverUrl，但有 coverPid，则前端拼接
  if (item.coverPid) {
    const p = item.coverP || 0
    return `https://i.pixiv.re/c/360x360_70/img-master/img/${item.coverPid}_p${p}_master1200.jpg`
  }
  
  console.warn('⚠️ [广场] 收藏夹', item.id, '没有封面图片')
  return ''
}

onMounted(() => {
  fetchCollections()
})
</script>

<template>
  <div class="page-container">
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
        <n-button type="primary" color="#8b5cf6" size="large" @click="handleSearch">
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
          class="collection-card glass-card"
          @click="viewDetail(item)"
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
            <div class="owner-box">
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
.page-container {
  padding: 40px 20px 80px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section {
  text-align: center;
}
.title {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  margin: 0;
}
.subtitle {
  color: #6b7280;
  margin-top: 8px;
  font-size: 15px;
}

.filter-section {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.collection-card {
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.collection-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  z-index: 2;
}

.cover-box {
  position: relative;
  width: 100%;
  /* ✅ 使用3:4比例，与收藏夹页面保持一致 */
  aspect-ratio: 3 / 4;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  /* ✅ 优化裁切方式 */
  object-fit: cover;
  object-position: center center;
  transition: transform 0.5s;
}
.collection-card:hover .cover-img {
  transform: scale(1.08);
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
  backdrop-filter: blur(8px);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
}

.info-box {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
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
  color: #374151;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.owner-name {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
}

.action-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
}

.action-count {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
  margin-right: 8px;
}

.pagination-box {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .page-container {
    padding: 20px 10px;
  }
  .title {
    font-size: 24px;
  }
  .filter-section {
    flex-direction: column;
  }
  .search-box,
  .sort-box {
    width: 100%;
    min-width: unset;
  }
  .collection-grid {
    /* ✅ 移动端2列布局 */
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  /* ✅ 移动端卡片优化 */
  .collection-card {
    border-radius: 12px;
  }
  .cover-box {
    /* ✅ 移动端使用1:1比例 */
    aspect-ratio: 1 / 1;
  }
  .info-box {
    padding: 10px;
    gap: 8px;
  }
  .collection-name {
    font-size: 14px;
  }
  .collection-desc {
    font-size: 12px;
    -webkit-line-clamp: 1;  /* ✅ 移动端只显示1行 */
  }
  .owner-name {
    font-size: 12px;
  }
  .action-box {
    gap: 8px;
  }
  .action-count {
    font-size: 12px;
  }
  /* ✅ 移动端统计角标优化 */
  .stat-item {
    font-size: 11px;
    padding: 3px 6px;
  }
}
</style>
