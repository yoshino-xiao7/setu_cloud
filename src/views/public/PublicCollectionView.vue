<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton, NIcon, NTag, NEmpty, NSkeleton, NPagination, useMessage, NImage, NAvatar, NModal, NSpin, NCard, NSpace
} from 'naive-ui'
import {
  ShareSocialOutline,
  EyeOutline,
  ImageOutline,
  LockClosedOutline,
  GlobeOutline,
  PersonOutline,
  LogInOutline,
  PersonAddOutline,
  DownloadOutline,
  CloseOutline
} from '@vicons/ionicons5'
import type { CollectionInfoDTO, CollectionItemDTO, CollectionItemPageDTO } from '@/api/collections'
import { getCollectionInfo, getCollectionItems, buildPublicCollectionUrl } from '@/api/collections'
import { unwrapApiData } from '@/api/response'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { useAuthStore } from '@/stores/auth'
import { useCollectionSeo } from '@/composables/useSeo'
import { SITE_URL } from '@/api/env'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const auth = useAuthStore()
const siteHost = computed(() => {
  try { return new URL(SITE_URL).host } catch { return SITE_URL }
})
const infoGuard = useRequestGuard()
const itemsGuard = useRequestGuard()

// ✅ 检测是否登录（Token 现在存储在 HttpOnly Cookie 中）
const isLoggedIn = computed(() => !!auth.user)

const id = computed(() => Number(route.params.id))

const loadingInfo = ref(true)
const info = ref<CollectionInfoDTO | null>(null)

const loading = ref(true)
interface CollectionImageView {
  pid: number
  p: number
  title: string
  author: string
  url: string
  originalUrl: string
  aspectRatio: number
}

const list = shallowRef<CollectionImageView[]>([])
const pagination = reactive({ page: 1, size: 24, total: 0 })

const isPublic = computed(() => Number(info.value?.visibility ?? 0) === 1)

// ✅ 昵称兜底：优先 ownerNickname，没有就显示 用户#userId
const ownerName = computed(() => {
  const nick = info.value?.ownerNickname?.trim()
  if (nick) return nick
  const uid = info.value?.userId
  return uid ? `用户#${uid}` : '用户'
})

// ✅ 头像兜底：如果是相对路径，拼上域名
const ownerAvatar = computed(() => {
  const url = info.value?.ownerAvatarUrl
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${location.origin}${url}`
})

// ✅ SEO 动态 Meta 标签（使用 useCollectionSeo 替代直接 useHead）
const collectionName = computed(() => info.value?.name || '公开收藏夹')
const imageCount = computed(() => info.value?.itemCount ?? 0)
useCollectionSeo(collectionName, imageCount)

const fetchInfo = async () => {
  const requestId = infoGuard.next()
  loadingInfo.value = true
  try {
    const res = await getCollectionInfo(id.value)
    if (!infoGuard.isCurrent(requestId)) return

    const data = unwrapApiData<CollectionInfoDTO | null>(res, null)
    info.value = data || null
  } catch (e: unknown) {
    if (!infoGuard.isCurrent(requestId)) return
    info.value = null
    message.error('收藏夹不可访问（可能是私有或不存在）')
  } finally {
    if (infoGuard.isCurrent(requestId)) loadingInfo.value = false
  }
}

const fetchItems = async () => {
  const requestId = itemsGuard.next()
  loading.value = true
  try {
    const res = await getCollectionItems(id.value, {
      page: pagination.page,
      size: pagination.size
    })
    if (!itemsGuard.isCurrent(requestId)) return

    const data = unwrapApiData<CollectionItemPageDTO>(res, { page: 1, size: 24, total: 0, items: [] })
    const items = data.items || []
    pagination.total = data.total || 0

    list.value = items.map((it: CollectionItemDTO) => {
      const img = it.image || {}
      // ✅ 获取图片实际宽高比
      const width = img.width || 1
      const height = img.height || 1
      const aspectRatio = height / width  // 高/宽，用于计算卡片跨度
      
      return {
        pid: it.pid ?? img.pid,
        p: it.p ?? img.p ?? 0,
        title: img.title || '无标题',
        author: img.author || '未知画师',
        url: img.urlRegular || img.urlSmall || img.urlOriginal || '',
        originalUrl: img.urlOriginal || '',
        aspectRatio  // ✅ 保存宽高比
      }
    })
  } catch (e) {
    if (!itemsGuard.isCurrent(requestId)) return
    list.value = []
    pagination.total = 0
    message.error('加载收藏夹内容失败（可能是私有）')
  } finally {
    if (itemsGuard.isCurrent(requestId)) loading.value = false
  }
}

const handlePageChange = async (page: number) => {
  pagination.page = page
  await fetchItems()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleCopyShare = async () => {
  if (!info.value) return
  if (!isPublic.value) return message.warning('私有收藏夹无法分享，请先设置公开')
  const shareUrl = buildPublicCollectionUrl(id.value)
  await navigator.clipboard.writeText(shareUrl)
  message.success('分享链接已复制')
}

const handleViewOriginal = (url: string) => {
  if (url) window.open(url, '_blank')
  else message.warning('原图链接无效')
}

// ✅ 导出图片功能
const showExportModal = ref(false)
const exportLoading = ref(false)
const exportPreview = ref('')
const shareCardRef = ref<HTMLElement | null>(null)
const qrCodeUrl = ref('')

const handleExportImage = async () => {
  if (!info.value) return
  if (!isPublic.value) return message.warning('私有收藏夹无法导出')
  
  showExportModal.value = true
  exportLoading.value = true
  exportPreview.value = ''
  
  try {
    // 生成二维码
    const shareUrl = buildPublicCollectionUrl(id.value)
    const [{ default: QRCode }, { default: html2canvas }] = await Promise.all([
      import('qrcode'),
      import('html2canvas')
    ])

    qrCodeUrl.value = await QRCode.toDataURL(shareUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#1f2937', light: '#ffffff' }
    })
    
    await nextTick()
    
    // 等待DOM渲染
    setTimeout(async () => {
      if (!shareCardRef.value) return
      
      try {
        const canvas = await html2canvas(shareCardRef.value, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        })
        
        exportPreview.value = canvas.toDataURL('image/png')
      } catch {
        message.error('导出失败，请重试')
      } finally {
        exportLoading.value = false
      }
    }, 500)
  } catch (e) {
    exportLoading.value = false
    message.error('生成二维码失败')
  }
}

const downloadExportImage = () => {
  if (!exportPreview.value) return
  const link = document.createElement('a')
  link.download = `收藏夹-${info.value?.name || id.value}.png`
  link.href = exportPreview.value
  link.click()
  message.success('图片已下载')
}

// ✅ 根据图片宽高比计算网格跨度（用于瀑布流）
const getRowSpan = (aspectRatio: number) => {
  if (!aspectRatio || aspectRatio <= 0) return 20  // 兜底值
  
  // 横图（宽>高）：跨度更小
  if (aspectRatio < 0.75) return 15
  // 方图
  if (aspectRatio < 1.2) return 20
  // 竖图（高>宽）：跨度更大
  if (aspectRatio < 1.5) return 25
  if (aspectRatio < 2) return 30
  // 超长竖图
  return Math.min(Math.ceil(aspectRatio * 20), 50)
}

const reload = async () => {
  pagination.page = 1
  await fetchInfo()
  if (info.value) await fetchItems()
}

onMounted(reload)
watch(id, reload)
</script>

<template>
  <div class="page page-container ui-page" :class="{ 'in-layout': isLoggedIn }">
    <!-- ✅ 未登录用户：显示登录/注册按钮 -->
    <div v-if="!isLoggedIn" class="guest-banner ui-card">
      <div class="banner-content">
        <div class="banner-text">
          <div class="banner-title">👋 欢迎来到雪涼云</div>
          <div class="banner-desc">登录后可创建自己的收藏夹，分享给更多人</div>
        </div>
        <div class="banner-actions">
          <n-button type="primary" size="medium" @click="router.push('/login')">
            <template #icon><n-icon><LogInOutline /></n-icon></template>
            登录
          </n-button>
          <n-button secondary size="medium" @click="router.push('/register')">
            <template #icon><n-icon><PersonAddOutline /></n-icon></template>
            注册
          </n-button>
        </div>
      </div>
    </div>

    <div class="header ui-page-header">
      <div class="title-row">
        <h1 class="title ui-page-title">
          <span v-if="loadingInfo">加载中…</span>
          <span v-else>{{ info?.name || '公开收藏夹' }}</span>
        </h1>

        <n-tag
          v-if="!loadingInfo && info"
          size="small"
          round
          :bordered="false"
          :type="isPublic ? 'success' : 'warning'"
        >
          <template #icon>
            <n-icon :size="14">
              <GlobeOutline v-if="isPublic" />
              <LockClosedOutline v-else />
            </n-icon>
          </template>
          {{ isPublic ? '公开' : '私有' }}
        </n-tag>
      </div>

      <!-- ✅ 分享者信息（一定显示：头像有就用头像，没有就用 icon） -->
      <div v-if="!loadingInfo && info" class="owner-row">
        <n-avatar v-if="ownerAvatar" :src="ownerAvatar" round :size="32" />
        <div v-else class="owner-fallback">
          <n-icon size="18"><PersonOutline /></n-icon>
        </div>

        <div class="owner-text">
          <div class="owner-name">{{ ownerName }}</div>
          <div class="owner-sub">分享了一个明亮的收藏夹空间</div>
        </div>
      </div>

      <div class="sub-row" v-if="!loadingInfo && info">
        <span class="sub">共 {{ info?.itemCount ?? pagination.total }} 张作品</span>
        <span class="dot">·</span>
        <span class="sub">ID: {{ id }}</span>

        <div class="actions">
          <n-button v-if="isPublic" secondary size="small" @click="handleCopyShare">
            <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
            分享
          </n-button>
          <n-button v-if="isPublic" secondary size="small" @click="handleExportImage">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            导出图片
          </n-button>
        </div>
      </div>
    </div>

    <div v-if="!loadingInfo && !info" class="empty ui-card">
      <n-empty description="收藏夹不可访问（可能是私有或不存在）" size="large">
        <template #icon><n-icon><ImageOutline /></n-icon></template>
      </n-empty>
    </div>

    <div v-else class="content">
      <div v-if="loading && list.length === 0" class="loading-grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <n-skeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
        </div>
      </div>

      <div v-else-if="!loading && list.length === 0" class="empty ui-card">
        <n-empty description="这个收藏夹是空的" size="large">
          <template #icon><n-icon><ImageOutline /></n-icon></template>
        </n-empty>
      </div>

      <div v-else class="grid">
        <div 
          v-for="item in list" 
          :key="`${item.pid}-${item.p}`" 
          class="card ui-card ui-card-hover"
          :style="{ gridRowEnd: `span ${getRowSpan(item.aspectRatio)}` }"
        >
          <div class="img-box" :style="{ paddingBottom: `${item.aspectRatio * 100}%` }">
            <!-- ✅ 使用绝对定位，让图片自然展示 -->
            <n-image
              lazy
              :src="item.url"
              :alt="item.title"
              object-fit="cover"
              show-toolbar-tooltip
              class="abs-image"
              :img-props="{ 
                referrerpolicy: 'no-referrer',
                style: 'cursor: pointer;'
              }"
            >
              <template #placeholder>
                <div class="image-placeholder">
                  <n-icon size="32" color="#d1d5db"><ImageOutline /></n-icon>
                </div>
              </template>
            </n-image>
            <div class="overlay">
              <n-button circle color="#fff" class="action-btn" @click.stop="handleViewOriginal(item.originalUrl)">
                <template #icon><n-icon color="#333"><EyeOutline /></n-icon></template>
              </n-button>
            </div>
          </div>
          <div class="info">
            <div class="t" :title="item.title">{{ item.title }}</div>
            <div class="m">PID: {{ item.pid }} · P{{ item.p }}</div>
          </div>
        </div>
      </div>

      <div class="pager" v-if="pagination.total > 0">
        <n-pagination
          v-model:page="pagination.page"
          :item-count="pagination.total"
          :page-size="pagination.size"
          :on-update:page="handlePageChange"
          size="large"
        />
      </div>
    </div>

    <!-- 导出图片弹窗 -->
    <n-modal v-model:show="showExportModal" :mask-closable="true">
      <n-card
        style="width: 480px; max-width: 95vw;"
        :bordered="false"
        class="export-modal-card"
        role="dialog"
        aria-modal="true"
      >
        <template #header>
          <div class="modal-header">
            <span class="modal-title">导出分享图片</span>
          </div>
        </template>
        <template #header-extra>
          <n-button text circle @click="showExportModal = false">
            <template #icon><n-icon size="20"><CloseOutline /></n-icon></template>
          </n-button>
        </template>
        
        <!-- 预览区域 -->
        <div class="export-preview-area">
          <n-spin v-if="exportLoading" description="生成中..." />
          <img v-else-if="exportPreview" :src="exportPreview" class="export-preview-img" alt="分享卡片预览" />
          <div v-else class="export-empty">点击下方按钮生成分享图片</div>
        </div>
        
        <template #footer>
          <n-space justify="end">
            <n-button @click="showExportModal = false">取消</n-button>
            <n-button 
              type="primary" 
              color="#f586a9"
              :disabled="!exportPreview" 
              @click="downloadExportImage"
            >
              <template #icon><n-icon><DownloadOutline /></n-icon></template>
              下载图片
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- 隐藏的分享卡片模板（用于截图，移到屏幕外） -->
    <div ref="shareCardRef" class="share-card" style="position: fixed; left: -9999px; top: 0;">
      <!-- 封面图 -->
      <div class="card-cover">
        <img src="/og-image.webp" alt="雪涼云API" crossorigin="anonymous" />
        <div class="card-cover-overlay"></div>
      </div>
      
      <!-- 内容区域 -->
      <div class="card-body">
        <!-- 标题 -->
        <h2 class="card-title">{{ info?.name || '我的收藏夹' }}</h2>
        
        <!-- 创作者行 -->
        <div class="card-author-row">
          <div class="author-avatar">
            <img v-if="ownerAvatar" :src="ownerAvatar" alt="创作者头像" crossorigin="anonymous" />
            <div v-else class="avatar-placeholder">👤</div>
          </div>
          <div class="author-info">
            <div class="author-name">{{ ownerName }}</div>
            <div class="author-sub">公开收藏夹 · {{ info?.itemCount ?? 0 }} 张图片</div>
          </div>
        </div>
        
        <!-- 二维码区域 -->
        <div class="card-qr-section">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" class="qr-img" alt="收藏夹二维码" />
          <div class="qr-text">
            <div class="qr-hint">扫码查看完整收藏夹</div>
            <div class="qr-url">{{ siteHost }}/c/{{ id }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page{ padding-bottom:70px; }
/* ✅ 登录用户在框架内，减少上内边距 */
.page.in-layout{ padding-top: 0; }

/* ✅ 未登录用户的欢迎横幅 */
.guest-banner {
  margin-bottom: 24px;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 247, 250, 0.96) 100%);
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.banner-text {
  flex: 1;
  min-width: 200px;
}

.banner-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 6px;
}

.banner-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.banner-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .banner-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .banner-actions {
    justify-content: stretch;
  }
  
  .banner-actions :deep(.n-button) {
    flex: 1;
  }
}

.header{
  margin-bottom:20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.header::after{
  content:'';
  position:absolute;
  right:24px;
  top:18px;
  width:150px;
  height:150px;
  border-radius:999px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.16), transparent 68%);
  pointer-events:none;
}
.title-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; position:relative; z-index:1; }
.title{ margin:0; }

.owner-row{
  margin-top: 14px;
  display:flex;
  align-items:center;
  gap:10px;
  position:relative;
  z-index:1;
}
.owner-fallback{
  width:32px; height:32px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.06);
  color:#6b7280;
}
.owner-text{ text-align:left; }
.owner-name{ font-weight:800; color:#374151; font-size:14px; line-height:1.1; }
.owner-sub{ margin-top:2px; font-size:12px; color:#6b7280; }

.sub-row{ margin-top:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; position:relative; z-index:1; }
.sub{ color:#6b7280; font-size:13px; }
.dot{ opacity:.5; }
.actions{ margin-left:auto; display:flex; gap:10px; flex-wrap:wrap; }

.loading-grid, .grid{
  display: grid;
  /* ✅ 瀑布流布局：使用 grid-auto-rows 控制最小行高 */
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: 5px;  /* ✅ 最小行高，用于精确控制卡片高度 */
  gap: 14px;
}
/* ✅ 骨架屏使用平均高度 */
.skeleton-card{ 
  grid-row-end: span 25;  /* ✅ 平均跨度 */
  overflow: hidden; 
  border-radius: 16px; 
}

.card{
  padding:0;
  border-radius: var(--ui-radius-md);
  overflow: hidden; 
  /* ✅ 卡片高度由 grid-row-end 动态控制 */
}
.card:hover {
  z-index: 2;
}

.img-box{ 
  position: relative; 
  /* ✅ 使用 padding-bottom 撑开容器，保持图片原始比例 */
  width: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #edf5ff 100%);
  overflow: hidden;
}

/* ✅ 图片绝对定位，填满容器 */
.abs-image {
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

:deep(.n-image), :deep(.abs-image .n-image__img) { 
  width: 100%; 
  height: 100%; 
}

:deep(.abs-image img){ 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  object-position: center center;
  transition: transform 0.5s;
}
.card:hover :deep(.abs-image img) { transform: scale(1.035); }

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.overlay{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  background: rgba(15,23,42,0.12);
  opacity:0; transition: opacity .2s;
  pointer-events: none;  /* ✅ 让 overlay 不阻挡图片点击 */
}
.card:hover .overlay{ opacity:1; }
.action-btn{ 
  box-shadow:0 8px 18px rgba(0,0,0,0.18); 
  pointer-events: auto;  /* ✅ 但按钮可以点击 */
}

.info{ padding:11px 12px 13px; text-align:left; background:#fff; }
.t{ font-weight:800; color:var(--ui-text); font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.m{ margin-top:6px; font-size:12px; color:var(--ui-muted); }

.pager{ margin-top:18px; display:flex; justify-content:center; }
.empty{ min-height: 320px; display:flex; align-items:center; justify-content:center; }

/* ✅ 移动端优化 */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    /* ✅ 移动端禁用瀑布流，使用固定比例 */
    grid-auto-rows: auto;
    gap: 12px;
  }
  .loading-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  /* ✅ 移动端强制使用1:1比例 */
  .card {
    grid-row-end: auto !important;
  }
  .img-box {
    padding-bottom: 100% !important;  /* ✅ 强制1:1比例 */
  }
  .info {
    padding: 8px 10px 10px;
  }
  .t {
    font-size: 13px;
  }
  .m {
    font-size: 11px;
  }
  .header {
    padding: 20px;
  }
  .sub-row {
    align-items: flex-start;
  }
  .actions {
    width: 100%;
    margin-left: 0;
  }
  .actions :deep(.n-button) {
    flex: 1;
  }
}

/* ========== 导出图片相关样式 ========== */
.export-modal-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.modal-header {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

/* 预览区域 */
.export-preview-area {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
}

.export-preview-img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.export-empty {
  color: #6b7280;
  font-size: 14px;
}



/* 分享卡片样式 - YouTube风格 */
.share-card {
  width: 380px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* 封面图 */
.card-cover {
  position: relative;
  width: 100%;
  background: linear-gradient(135deg, #f8bbd9 0%, #f48fb1 100%);
}

.card-cover img {
  width: 100%;
  height: auto;
  display: block;
}

.card-cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 100%);
}



/* 内容区域 */
.card-body {
  padding: 16px;
}

.card-title {
  margin: 0 0 14px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.4;
}

/* 创作者行 */
.card-author-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
}

.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.author-info {
  flex: 1;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.author-sub {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* 二维码区域 */
.card-qr-section {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 14px;
}

.qr-img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
}

.qr-text {
  flex: 1;
}

.qr-hint {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  margin-bottom: 4px;
}

.qr-url {
  font-size: 11px;
  color: #6b7280;
}
</style>
