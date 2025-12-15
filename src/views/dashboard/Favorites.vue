<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  NEmpty, NSpin, NImage, NButton, NIcon, NPagination, useMessage,
  NPopconfirm, NSkeleton, NTag
} from 'naive-ui'
import {
  HeartDislikeOutline,
  EyeOutline,
  ImageOutline,
  PersonOutline,
  AlertCircleOutline
} from '@vicons/ionicons5'
import { getFavoriteList, removeFavorite } from '@/api/favorite'

const message = useMessage()

// =======================
// 数据状态
// =======================
const loading = ref(true)
const list = ref<any[]>([])
const pagination = reactive({
  page: 1,
  size: 24, // 每页显示 24 张
  total: 0,
})

// =======================
// 核心逻辑：获取数据
// =======================
const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getFavoriteList({
      page: pagination.page,
      size: pagination.size
    })

    // 适配后端 JSON 结构
    const data = res.data || res
    const items = data.items || data.records || []

    pagination.total = data.total || 0

    // 数据映射：提取我们需要展示的字段
    list.value = items.map((item: any) => {
      const img = item.image || {}
      return {
        // 收藏记录本身的 ID
        favId: item.favoriteId,
        // 核心定位数据
        pid: item.pid,
        p: item.p ?? 0,
        // 展示数据
        title: img.title || '无标题',
        author: img.author || '未知画师',
        // 图片链接 (优先 regular，兜底 original)
        url: img.urlRegular || img.urlOriginal || '',
        originalUrl: img.urlOriginal,
        width: img.width,
        height: img.height,
        r18: img.r18 === 1
      }
    })

  } catch (e) {
    message.error('加载收藏夹失败')
  } finally {
    loading.value = false
  }
}

// =======================
// 交互逻辑
// =======================

// 翻页
const handlePageChange = (page: number) => {
  pagination.page = page
  fetchData()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 取消收藏
const handleUnfavorite = async (item: any) => {
  try {
    // 调用 API：需要传 pid 和 p
    await removeFavorite(item.pid, item.p)

    message.success('已移除收藏')

    // 前端直接移除该项，避免重新请求导致闪烁
    list.value = list.value.filter(i =>
      !(i.pid === item.pid && i.p === item.p)
    )

    // 如果当前页删光了，且不是第一页，自动往前跳
    if (list.value.length === 0 && pagination.page > 1) {
      handlePageChange(pagination.page - 1)
    } else {
      // 更新总数显示
      pagination.total--
    }
  } catch (e) {
    message.error('操作失败')
  }
}

// 查看原图
const handleViewOriginal = (url: string) => {
  if (url) window.open(url, '_blank')
}

// 格式化 P 数显示 (P0 不显示，P1+ 显示)
const formatPage = (p: number) => {
  return p > 0 ? `P${p}` : ''
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="page-container">

    <div class="header-section">
      <h2 class="title">我的收藏夹</h2>
      <p class="subtitle">共收藏 {{ pagination.total }} 张作品</p>
    </div>

    <div v-if="loading && list.length === 0" class="loading-grid">
      <div v-for="n in 12" :key="n" class="skeleton-card">
        <n-skeleton height="100%" width="100%" :sharp="false" />
      </div>
    </div>

    <div v-else-if="!loading && list.length === 0" class="empty-box">
      <n-empty description="这里空空如也，快去发现美好吧" size="large">
        <template #icon><n-icon><ImageOutline /></n-icon></template>
        <template #extra>
          <n-button type="primary" secondary @click="$router.push('/daily')">去逛逛</n-button>
        </template>
      </n-empty>
    </div>

    <div v-else class="content-wrapper">
      <div class="gallery-grid">
        <div v-for="item in list" :key="`${item.pid}-${item.p}`" class="fav-card glass-card">

          <div class="img-box">
            <n-image
               lazy
               :src="item.url"
               object-fit="cover"
               class="fav-img"
               :img-props="{ referrerpolicy: 'no-referrer' }"
               :preview-disabled="true"
            />

            <div class="overlay">
              <div class="overlay-actions">
                <n-button circle color="#fff" class="action-btn" @click="handleViewOriginal(item.originalUrl)">
                  <template #icon><n-icon color="#333"><EyeOutline /></n-icon></template>
                </n-button>

                <n-popconfirm @positive-click="handleUnfavorite(item)">
                  <template #trigger>
                    <n-button circle color="#ef4444" class="action-btn del-btn">
                      <template #icon><n-icon color="#fff"><HeartDislikeOutline /></n-icon></template>
                    </n-button>
                  </template>
                  确认要移除这张图片吗？
                </n-popconfirm>
              </div>
            </div>

            <div class="badges">
               <n-tag v-if="item.r18" type="error" size="tiny" round class="badge">R-18</n-tag>
               <n-tag v-if="item.p > 0" type="warning" size="tiny" round class="badge">P{{ item.p }}</n-tag>
            </div>
          </div>

          <div class="info-box">
            <div class="img-title" :title="item.title">{{ item.title }}</div>
            <div class="img-meta">
              <div class="author">
                <n-icon><PersonOutline /></n-icon>
                <span>{{ item.author }}</span>
              </div>
              <span class="pid">ID: {{ item.pid }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination-box">
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
/* 全局容器 */
.page-container {
  padding: 40px 20px 80px;
  max-width: 1400px; /* 宽屏展示 */
  margin: 0 auto;
  min-height: 80vh;
  display: flex; flex-direction: column; gap: 32px;
}

/* 头部 */
.header-section { text-align: center; }
.title { font-size: 32px; font-weight: 800; color: #1f2937; margin: 0; }
.subtitle { color: #6b7280; margin-top: 8px; font-size: 15px; }

/* 状态容器 */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}
.skeleton-card { aspect-ratio: 2 / 3; border-radius: 16px; overflow: hidden; }

.empty-box {
  flex: 1; display: flex; align-items: center; justify-content: center; min-height: 400px;
}

/* 网格布局 */
.gallery-grid {
  display: grid;
  /* 响应式列宽：最小240px，自动填充 */
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

/* 卡片样式 */
.fav-card {
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex; flex-direction: column;
  position: relative;
  background: #fff;
}
.fav-card:hover { transform: translateY(-6px); box-shadow: 0 15px 30px rgba(0,0,0,0.1); z-index: 2; }

.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

/* 图片容器 */
.img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3; /* 统一竖图比例，防止参差不齐 */
  background: #f3f4f6;
  overflow: hidden;
}
.fav-img { width: 100%; height: 100%; display: block; }
:deep(.fav-img img) { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.fav-card:hover :deep(.fav-img img) { transform: scale(1.08); }

/* 遮罩与按钮 */
.overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.2);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}
.fav-card:hover .overlay { opacity: 1; }

.overlay-actions { display: flex; gap: 16px; }
.action-btn { box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.2s; }
.action-btn:hover { transform: scale(1.1); }

/* 角标 */
.badges { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; pointer-events: none; }
.badge { font-weight: 700; opacity: 0.9; backdrop-filter: blur(4px); }

/* 信息区域 */
.info-box { padding: 12px 16px 16px; }
.img-title {
  font-size: 15px; font-weight: 700; color: #374151;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 6px;
}
.img-meta {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: #6b7280;
}
.author { display: flex; align-items: center; gap: 4px; max-width: 60%; }
.author span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pid { font-family: monospace; font-size: 11px; opacity: 0.7; background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; }

/* 分页 */
.pagination-box { display: flex; justify-content: center; margin-top: 20px; }

/* 移动端适配 */
@media (max-width: 640px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .page-container { padding: 20px 10px; }
  .title { font-size: 24px; }

  /* 移动端优化：不需要 hover 也能看到按钮（或者改为点击触发，这里简单处理为常显或简化） */
  /* 这里保持 hover 逻辑，但在手机上点击图片会触发 hover 效果 */
}
</style>