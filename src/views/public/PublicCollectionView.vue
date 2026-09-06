<script setup lang="ts">
import {
  ArrowForwardOutline,
  CloseOutline,
  CompassOutline,
  DownloadOutline,
  EyeOutline,
  GlobeOutline,
  ImageOutline,
  ImagesOutline,
  LockClosedOutline,
  LogInOutline,
  PersonAddOutline,
  PersonOutline,
  ShareSocialOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import {
  NAvatar,
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NModal,
  NPagination,
  NSkeleton,
  NSpace,
  NSpin,
  NTag,
} from 'naive-ui'
import { usePublicCollectionView } from '@/composables/usePublicCollectionView'

const {
  downloadExportImage,
  exportLoading,
  exportPreview,
  getRowSpan,
  getSimilarCoverUrl,
  getSimilarTags,
  goLogin,
  goPublicCollection,
  goRegister,
  goSquare,
  handleCopyShare,
  handleExportImage,
  handlePageChange,
  handleViewOriginal,
  id,
  info,
  isLoggedIn,
  isPublic,
  list,
  loading,
  loadingInfo,
  ownerAvatar,
  ownerName,
  pagination,
  qrCodeUrl,
  shareCardRef,
  showExportModal,
  similarCollections,
  siteHost,
} = usePublicCollectionView()
</script>

<template>
  <div class="page page-container ui-page" :class="{ 'in-layout': isLoggedIn }">
    <!-- ✅ 未登录用户：显示登录/注册按钮 -->
    <div v-if="!isLoggedIn" class="guest-banner ui-card">
      <div class="banner-content">
        <div class="banner-text">
          <div class="banner-title">
            👋 欢迎来到雪涼云
          </div>
          <div class="banner-desc">
            登录后可创建自己的收藏夹，分享给更多人
          </div>
        </div>
        <div class="banner-actions">
          <NButton type="primary" size="medium" @click="goLogin">
            <template #icon>
              <NIcon><LogInOutline /></NIcon>
            </template>
            登录
          </NButton>
          <NButton secondary size="medium" @click="goRegister">
            <template #icon>
              <NIcon><PersonAddOutline /></NIcon>
            </template>
            注册
          </NButton>
        </div>
      </div>
    </div>

    <div class="header ui-page-header">
      <div class="title-row">
        <h1 class="title ui-page-title">
          <span v-if="loadingInfo">加载中…</span>
          <span v-else>{{ info?.name || '公开收藏夹' }}</span>
        </h1>

        <NTag
          v-if="!loadingInfo && info"
          size="small"
          round
          :bordered="false"
          :type="isPublic ? 'success' : 'warning'"
        >
          <template #icon>
            <NIcon :size="14">
              <GlobeOutline v-if="isPublic" />
              <LockClosedOutline v-else />
            </NIcon>
          </template>
          {{ isPublic ? '公开' : '私有' }}
        </NTag>
      </div>

      <!-- ✅ 分享者信息（一定显示：头像有就用头像，没有就用 icon） -->
      <div v-if="!loadingInfo && info" class="owner-row">
        <NAvatar v-if="ownerAvatar" :src="ownerAvatar" round :size="32" />
        <div v-else class="owner-fallback">
          <NIcon size="18">
            <PersonOutline />
          </NIcon>
        </div>

        <div class="owner-text">
          <div class="owner-name">
            {{ ownerName }}
          </div>
          <div class="owner-sub">
            分享了一个明亮的收藏夹空间
          </div>
        </div>
      </div>

      <div v-if="!loadingInfo && info" class="sub-row">
        <span class="sub">共 {{ info?.itemCount ?? pagination.total }} 张作品</span>
        <span class="dot">·</span>
        <span class="sub">ID: {{ id }}</span>

        <div class="actions">
          <NButton v-if="isPublic" secondary size="small" @click="handleCopyShare">
            <template #icon>
              <NIcon><ShareSocialOutline /></NIcon>
            </template>
            分享
          </NButton>
          <NButton v-if="isPublic" secondary size="small" @click="handleExportImage">
            <template #icon>
              <NIcon><DownloadOutline /></NIcon>
            </template>
            导出图片
          </NButton>
        </div>
      </div>
    </div>

    <div v-if="!loadingInfo && !info" class="empty ui-card">
      <NEmpty description="收藏夹不可访问（可能是私有或不存在）" size="large">
        <template #icon>
          <NIcon><ImageOutline /></NIcon>
        </template>
      </NEmpty>
    </div>

    <div v-else class="content">
      <div v-if="loading && list.length === 0" class="loading-grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <NSkeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
        </div>
      </div>

      <div v-else-if="!loading && list.length === 0" class="empty ui-card">
        <NEmpty description="这个收藏夹是空的" size="large">
          <template #icon>
            <NIcon><ImageOutline /></NIcon>
          </template>
        </NEmpty>
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
            <NImage
              lazy
              :src="item.url"
              :alt="item.title"
              object-fit="cover"
              show-toolbar-tooltip
              class="abs-image"
              :img-props="{
                referrerpolicy: 'no-referrer',
                style: 'cursor: pointer;',
              }"
            >
              <template #placeholder>
                <div class="image-placeholder">
                  <NIcon size="32" color="#d1d5db">
                    <ImageOutline />
                  </NIcon>
                </div>
              </template>
            </NImage>
            <div class="overlay">
              <NButton circle color="#fff" class="action-btn" aria-label="查看原图" @click.stop="handleViewOriginal(item.originalUrl)">
                <template #icon>
                  <NIcon color="#333">
                    <EyeOutline />
                  </NIcon>
                </template>
              </NButton>
            </div>
          </div>
          <div class="info">
            <div class="t" :title="item.title">
              {{ item.title }}
            </div>
            <div class="m">
              PID: {{ item.pid }} · P{{ item.p }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="info" class="continue-panel ui-card">
        <div class="continue-copy">
          <div class="continue-kicker">
            <NIcon><CompassOutline /></NIcon>
            继续探索
          </div>
          <h3>看完这一组，再逛下一组</h3>
          <p>
            {{ similarCollections.length > 0 ? '这些公开收藏夹和当前内容更接近。' : '回到收藏夹广场，继续找同风格的公开收藏。' }}
          </p>
        </div>

        <div class="continue-actions">
          <NButton secondary @click="goSquare">
            <template #icon>
              <NIcon><CompassOutline /></NIcon>
            </template>
            {{ isLoggedIn ? '回到广场' : '登录后逛广场' }}
          </NButton>
        </div>

        <div v-if="similarCollections.length > 0" class="similar-grid">
          <button
            v-for="item in similarCollections"
            :key="item.id"
            class="similar-card"
            type="button"
            @click="goPublicCollection(item.id)"
          >
            <div class="similar-cover">
              <img
                v-if="getSimilarCoverUrl(item)"
                :src="getSimilarCoverUrl(item)"
                :alt="item.name"
                referrerpolicy="no-referrer"
                loading="lazy"
                decoding="async"
              >
              <div v-else class="similar-placeholder">
                <NIcon><ImagesOutline /></NIcon>
              </div>
            </div>
            <div class="similar-info">
              <strong>{{ item.name }}</strong>
              <span>{{ item.itemCount }} 张作品</span>
              <div v-if="getSimilarTags(item).length > 0" class="similar-tags">
                <span v-for="tag in getSimilarTags(item)" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <NIcon class="similar-arrow">
              <ArrowForwardOutline />
            </NIcon>
          </button>
        </div>

        <div v-else class="continue-empty">
          <NIcon><SparklesOutline /></NIcon>
          更多相近收藏夹正在整理中。
        </div>
      </div>

      <div v-if="pagination.total > 0" class="pager">
        <NPagination
          v-model:page="pagination.page"
          :item-count="pagination.total"
          :page-size="pagination.size"
          :on-update:page="handlePageChange"
          size="large"
        />
      </div>
    </div>

    <!-- 导出图片弹窗 -->
    <NModal v-model:show="showExportModal" :mask-closable="true">
      <NCard
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
          <NButton text circle @click="showExportModal = false">
            <template #icon>
              <NIcon size="20">
                <CloseOutline />
              </NIcon>
            </template>
          </NButton>
        </template>

        <!-- 预览区域 -->
        <div class="export-preview-area">
          <NSpin v-if="exportLoading" description="生成中..." />
          <img v-else-if="exportPreview" :src="exportPreview" class="export-preview-img" alt="分享卡片预览" loading="lazy" decoding="async">
          <div v-else class="export-empty">
            点击下方按钮生成分享图片
          </div>
        </div>

        <template #footer>
          <NSpace justify="end">
            <NButton @click="showExportModal = false">
              取消
            </NButton>
            <NButton
              type="primary"
              color="#f586a9"
              :disabled="!exportPreview"
              @click="downloadExportImage"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              下载图片
            </NButton>
          </NSpace>
        </template>
      </NCard>
    </NModal>

    <!-- 隐藏的分享卡片模板（用于截图，移到屏幕外） -->
    <div ref="shareCardRef" class="share-card" style="position: fixed; left: -9999px; top: 0;">
      <!-- 封面图 -->
      <div class="card-cover">
        <img src="/og-image.webp" alt="雪涼云API" crossorigin="anonymous" loading="lazy" decoding="async">
        <div class="card-cover-overlay" />
      </div>

      <!-- 内容区域 -->
      <div class="card-body">
        <!-- 标题 -->
        <h2 class="card-title">
          {{ info?.name || '我的收藏夹' }}
        </h2>

        <!-- 创作者行 -->
        <div class="card-author-row">
          <div class="author-avatar">
            <img v-if="ownerAvatar" :src="ownerAvatar" alt="创作者头像" crossorigin="anonymous" loading="lazy" decoding="async">
            <div v-else class="avatar-placeholder">
              👤
            </div>
          </div>
          <div class="author-info">
            <div class="author-name">
              {{ ownerName }}
            </div>
            <div class="author-sub">
              公开收藏夹 · {{ info?.itemCount ?? 0 }} 张图片
            </div>
          </div>
        </div>

        <!-- 二维码区域 -->
        <div class="card-qr-section">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" class="qr-img" alt="收藏夹二维码" loading="lazy" decoding="async">
          <div class="qr-text">
            <div class="qr-hint">
              扫码查看完整收藏夹
            </div>
            <div class="qr-url">
              {{ siteHost }}/c/{{ id }}
            </div>
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

.continue-panel {
  margin-top: 22px;
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  background:
    radial-gradient(circle at 96% 12%, rgba(96, 165, 250, 0.13), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.continue-copy {
  min-width: 0;
}

.continue-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #e86f9c;
  font-size: 12px;
  font-weight: 800;
}

.continue-copy h3 {
  margin: 6px 0 0;
  color: #1f2937;
  font-size: 20px;
  letter-spacing: 0;
}

.continue-copy p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.continue-actions {
  display: flex;
  justify-content: flex-end;
}

.similar-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.similar-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  min-height: 92px;
  padding: 10px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.similar-card:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 134, 169, 0.26);
  background: #fff;
}

.similar-cover {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  background: #edf5ff;
}

.similar-cover img,
.similar-placeholder {
  width: 100%;
  height: 100%;
}

.similar-cover img {
  object-fit: cover;
}

.similar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa8ba;
}

.similar-info {
  min-width: 0;
}

.similar-info strong,
.similar-info > span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.similar-info strong {
  color: #1f2937;
  font-size: 14px;
}

.similar-info > span {
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.similar-tags {
  margin-top: 8px;
  display: flex;
  gap: 5px;
  overflow: hidden;
}

.similar-tags span {
  flex: 0 1 auto;
  min-width: 0;
  padding: 3px 7px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.11);
  color: #2f6fb4;
  font-size: 11px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.similar-arrow {
  color: #e86f9c;
}

.continue-empty {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  padding: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

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

  .continue-panel {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .continue-actions {
    justify-content: stretch;
  }

  .continue-actions :deep(.n-button) {
    width: 100%;
  }

  .similar-grid {
    grid-template-columns: 1fr;
  }

  .similar-card {
    grid-template-columns: 64px minmax(0, 1fr) 18px;
    min-height: 84px;
  }

  .similar-cover {
    width: 64px;
    height: 64px;
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
