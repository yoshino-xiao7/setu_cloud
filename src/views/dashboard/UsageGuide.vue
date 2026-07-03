<script setup lang="ts">
import {
  CloudDownloadOutline,
  CodeSlashOutline,
  CopyOutline,
  FlashOutline,
  GlobeOutline,
  Heart,
  HeartOutline,
  ImageOutline,
  ListOutline,
  MusicalNotesOutline,
  PersonOutline,
  PlayOutline,
  RefreshOutline,
  ShareSocialOutline,
} from '@vicons/ionicons5'

import {
  NAlert,
  NButton,
  NCard,
  NCode,
  NDataTable,
  NIcon,
  NImage,
  NInput,
  NModal,
  NRadio,
  NRadioGroup,
  NSelect,
  NSkeleton,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
} from 'naive-ui'
import { useUsageGuide } from '@/composables/useUsageGuide'

const {
  isMobile,
  dailyLoading,
  dailyData,
  dailyError,
  isFavorited,
  favLoading,
  fetchDailyImage,
  handleToggleFavorite,
  dailyDisplayUrl,
  todayDate,
  handleDownload,
  handleCopyLink,
  pickModal,
  collectionsLoading,
  selectedCollectionId,
  newColName,
  newColVisibility,
  pickSubmitting,
  collectionOptions,
  openPickModal,
  handleAddToSelected,
  handleCreateAndAdd,
  imageBaseEndpoint,
  musicBaseEndpoint,
  integrationQuickCards,
  musicUsageNotes,
  docJsonString,
  codeExamples,
  paramColumns,
  paramData,
  musicEndpointColumns,
  musicEndpointData,
  musicParamData,
  musicCodeExamples,
  musicJsonString,
  handleCopyCode,
  formatDateOnly,
} = useUsageGuide()
</script>

<template>
  <div class="page-container ui-page">
    <div class="top-section">
      <div class="section-header-center ui-page-header ui-card">
        <div>
          <h1 class="hero-title ui-page-title">
            雪涼云开发文档
          </h1>
          <p class="hero-subtitle ui-page-subtitle">
            图片与音乐 API 实时演示 · {{ todayDate }} · 每日精选插画
          </p>
        </div>
        <NButton secondary round @click="fetchDailyImage">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          换一张
        </NButton>
      </div>

      <div class="daily-card ui-card ui-card-hover" :class="{ 'has-data': dailyData && !dailyLoading }">
        <div class="daily-img-box">
          <div v-if="dailyLoading" class="loading-state">
            <NSkeleton height="100%" width="100%" />
          </div>

          <div v-else-if="dailyError" class="error-state">
            <NIcon size="40">
              <ImageOutline />
            </NIcon>
            <span>加载失败</span>
            <NButton size="small" @click="fetchDailyImage">
              重试
            </NButton>
          </div>

          <div v-else-if="dailyData" class="img-content">
            <NImage
              :src="dailyDisplayUrl"
              object-fit="cover"
              class="the-image"
              :img-props="{ referrerpolicy: 'no-referrer' }"
            />
            <div class="img-badges">
              <NTag v-if="dailyData.r18" type="error" size="small" round>
                R-18
              </NTag>
              <NTag type="info" size="small" round class="glass-tag">
                {{ dailyData.width }}x{{ dailyData.height }}
              </NTag>
            </div>
          </div>

          <div v-else class="idle-state">
            <NIcon size="64" color="#e5e7eb">
              <ImageOutline />
            </NIcon>
            <p>API 演示准备就绪</p>
            <NButton type="primary" color="#f586a9" size="large" class="pulse-btn" @click="fetchDailyImage">
              <template #icon>
                <NIcon><PlayOutline /></NIcon>
              </template>
              点击调用 API
            </NButton>
          </div>
        </div>

        <div v-if="!dailyLoading && dailyData" class="daily-info-box">
          <div class="info-top">
            <h3 class="art-title">
              {{ dailyData.title }}
            </h3>
            <div class="art-meta">
              <div class="meta-line primary">
                <NIcon class="icon">
                  <PersonOutline />
                </NIcon>
                <span class="author-name">{{ dailyData.author }}</span>
                <span class="meta-sub">UID: {{ dailyData.uid }}</span>
              </div>
              <div class="meta-line secondary">
                <span class="meta-sub">PID: {{ dailyData.pid }}</span>
                <span v-if="dailyData.p !== undefined" class="meta-sub"> · P{{ dailyData.p }}</span>
                <span class="dot">·</span>
                <span>{{ formatDateOnly(dailyData.uploadDate) }}</span>
              </div>
            </div>
          </div>

          <div class="tags-row">
            <NTag v-for="tag in dailyData.tags" :key="tag" :bordered="false" size="tiny" class="art-tag">
              #{{ tag }}
            </NTag>
          </div>

          <div class="action-row">
            <NButton type="primary" color="#f586a9" class="flex-1" @click="handleDownload">
              <template #icon>
                <NIcon><CloudDownloadOutline /></NIcon>
              </template> 原图
            </NButton>

            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  circle
                  secondary
                  :loading="favLoading"
                  class="like-btn"
                  @click="handleToggleFavorite"
                >
                  <template #icon>
                    <NIcon :color="isFavorited ? '#ef4444' : ''" :size="20">
                      <Heart v-if="isFavorited" />
                      <HeartOutline v-else />
                    </NIcon>
                  </template>
                </NButton>
              </template>
              {{ isFavorited ? '取消默认收藏' : '加入默认收藏' }}
            </NTooltip>

            <NTooltip trigger="hover">
              <template #trigger>
                <NButton secondary circle @click="openPickModal">
                  <template #icon>
                    <NIcon><ListOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              收藏到…
            </NTooltip>

            <NTooltip trigger="hover">
              <template #trigger>
                <NButton secondary circle @click="handleCopyLink">
                  <template #icon>
                    <NIcon><ShareSocialOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              复制链接
            </NTooltip>

            <NTooltip trigger="hover">
              <template #trigger>
                <NButton secondary circle @click="fetchDailyImage">
                  <template #icon>
                    <NIcon><RefreshOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              换一张
            </NTooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="section-header-left ui-card">
        <div>
          <h2 class="doc-title">
            集成指南
          </h2>
          <p class="doc-subtitle">
            图片与音乐接口的请求参数、代码示例和响应结构都在这里。
          </p>
        </div>
        <div class="base-url-badge">
          <span class="method">DOCS</span>
          <code class="url">Image API · Music API</code>
        </div>
      </div>

      <div class="integration-grid">
        <div
          v-for="card in integrationQuickCards"
          :key="card.eyebrow"
          class="integration-card ui-card"
        >
          <div class="integration-eyebrow">
            {{ card.eyebrow }}
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.desc }}</p>
          <div class="integration-code-row">
            <code>{{ card.code }}</code>
            <NButton size="tiny" secondary circle @click="handleCopyCode(card.code)">
              <template #icon>
                <NIcon><CopyOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </div>
      </div>

      <NTabs type="segment" animated class="doc-product-tabs">
        <NTabPane name="image" tab="图片 API">
          <NAlert type="info" title="图片接口接入提示" class="glass-alert">
            <template #icon>
              <NIcon><FlashOutline /></NIcon>
            </template>
            默认返回随机图片。如需更高配额或高级筛选（如 excludeAI），请在 Header 中携带 <b>Authorization</b>。
          </NAlert>

          <div class="endpoint-strip">
            <span class="method">GET</span>
            <code>{{ imageBaseEndpoint }}</code>
          </div>

          <div class="doc-vertical-layout">
            <div class="ui-card compact-card">
              <h3 class="card-title">
                <NIcon class="text-purple">
                  <ListOutline />
                </NIcon>
                常用请求参数 (Query)
              </h3>

              <div v-if="!isMobile" class="table-wrap">
                <NDataTable
                  :columns="paramColumns"
                  :data="paramData"
                  size="small"
                  class="glass-table"
                  :single-line="false"
                />
              </div>

              <div v-else class="param-cards">
                <NCard
                  v-for="p in paramData"
                  :key="p.name"
                  size="small"
                  class="param-card"
                  :bordered="false"
                >
                  <div class="param-title-row">
                    <code class="param-code">{{ p.name }}</code>

                    <NTag size="small" :bordered="false" type="info" class="type-pill">
                      {{ p.type }}
                    </NTag>

                    <NTag
                      size="small"
                      :bordered="false"
                      :type="p.required ? 'error' : 'success'"
                      class="req-pill"
                    >
                      {{ p.required ? '必填' : '可选' }}
                    </NTag>
                  </div>

                  <div class="param-desc">
                    {{ p.desc }}
                  </div>
                </NCard>
              </div>
            </div>

            <div class="ui-card compact-card code-box">
              <div class="card-header-row">
                <h3 class="card-title">
                  <NIcon class="text-blue">
                    <CodeSlashOutline />
                  </NIcon>
                  代码示例
                </h3>
              </div>
              <NTabs type="segment" animated class="modern-tabs">
                <NTabPane name="curl" tab="cURL">
                  <div class="code-editor transparent-editor">
                    <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.curl)">
                      <NIcon><CopyOutline /></NIcon>
                    </NButton>
                    <NCode :code="codeExamples.curl" language="bash" />
                  </div>
                </NTabPane>
                <NTabPane name="js" tab="JS">
                  <div class="code-editor transparent-editor">
                    <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.js)">
                      <NIcon><CopyOutline /></NIcon>
                    </NButton>
                    <NCode :code="codeExamples.js" language="javascript" />
                  </div>
                </NTabPane>
                <NTabPane name="py" tab="Python">
                  <div class="code-editor transparent-editor">
                    <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.python)">
                      <NIcon><CopyOutline /></NIcon>
                    </NButton>
                    <NCode :code="codeExamples.python" language="python" />
                  </div>
                </NTabPane>
              </NTabs>
            </div>

            <div class="ui-card compact-card">
              <h3 class="card-title">
                <NIcon class="text-green">
                  <GlobeOutline />
                </NIcon>
                响应结构
              </h3>
              <div class="code-editor transparent-editor json-editor">
                <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(docJsonString)">
                  <NIcon><CopyOutline /></NIcon>
                </NButton>
                <NCode :code="docJsonString" language="json" />
              </div>
              <div class="status-list">
                <div class="status-item">
                  <NTag type="success" size="tiny" round>
                    200
                  </NTag> 成功
                </div>
                <div class="status-item">
                  <NTag type="error" size="tiny" round>
                    429
                  </NTag> 配额耗尽
                </div>
              </div>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="music" tab="音乐 API">
          <NAlert type="warning" title="音乐接口接入提示" class="glass-alert music-alert">
            <template #icon>
              <NIcon><MusicalNotesOutline /></NIcon>
            </template>
            控制台音乐页使用 <b>/user/music/**</b> 登录态接口，浏览器需要携带 SID Cookie。外部 API Key 入口可按后端开放的 <b>/music/**</b> 等价能力接入。
          </NAlert>

          <div class="endpoint-strip music-strip">
            <span class="method">USER</span>
            <code>{{ musicBaseEndpoint }}</code>
          </div>

          <div class="doc-vertical-layout">
            <div class="music-note-grid">
              <div
                v-for="(note, index) in musicUsageNotes"
                :key="note.title"
                class="music-note-item ui-card"
              >
                <span class="music-note-index">{{ index + 1 }}</span>
                <div>
                  <h3>{{ note.title }}</h3>
                  <p>{{ note.desc }}</p>
                </div>
              </div>
            </div>

            <div class="ui-card compact-card">
              <h3 class="card-title">
                <NIcon class="text-purple">
                  <ListOutline />
                </NIcon>
                常用音乐接口
              </h3>

              <div v-if="!isMobile" class="table-wrap">
                <NDataTable
                  :columns="musicEndpointColumns"
                  :data="musicEndpointData"
                  size="small"
                  class="glass-table"
                  :single-line="false"
                />
              </div>

              <div v-else class="param-cards">
                <NCard
                  v-for="endpoint in musicEndpointData"
                  :key="endpoint.endpoint"
                  size="small"
                  class="param-card"
                  :bordered="false"
                >
                  <div class="param-title-row">
                    <NTag size="small" :bordered="false" :type="endpoint.method === 'GET' ? 'success' : 'info'">
                      {{ endpoint.method }}
                    </NTag>
                    <code class="endpoint-code">{{ endpoint.endpoint }}</code>
                  </div>
                  <div class="param-desc">
                    {{ endpoint.desc }}
                  </div>
                </NCard>
              </div>
            </div>

            <div class="ui-card compact-card">
              <h3 class="card-title">
                <NIcon class="text-blue">
                  <CodeSlashOutline />
                </NIcon>
                核心参数
              </h3>

              <div class="music-param-grid">
                <div
                  v-for="p in musicParamData"
                  :key="`${p.group}-${p.name}`"
                  class="music-param-item"
                >
                  <div class="music-param-head">
                    <NTag size="tiny" :bordered="false" type="info">
                      {{ p.group }}
                    </NTag>
                    <code class="param-code">{{ p.name }}</code>
                    <NTag size="tiny" :bordered="false" :type="p.required ? 'error' : 'success'">
                      {{ p.required ? '必填' : '可选' }}
                    </NTag>
                  </div>
                  <div class="music-param-type">
                    {{ p.type }}
                  </div>
                  <p>{{ p.desc }}</p>
                </div>
              </div>
            </div>

            <div class="ui-card compact-card code-box">
              <div class="card-header-row">
                <h3 class="card-title">
                  <NIcon class="text-blue">
                    <CodeSlashOutline />
                  </NIcon>
                  音乐代码示例
                </h3>
              </div>
              <NTabs type="segment" animated class="modern-tabs">
                <NTabPane name="search" tab="搜索">
                  <div class="code-editor transparent-editor">
                    <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(musicCodeExamples.search)">
                      <NIcon><CopyOutline /></NIcon>
                    </NButton>
                    <NCode :code="musicCodeExamples.search" language="javascript" />
                  </div>
                </NTabPane>
                <NTabPane name="playUrl" tab="播放地址">
                  <div class="code-editor transparent-editor">
                    <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(musicCodeExamples.playUrl)">
                      <NIcon><CopyOutline /></NIcon>
                    </NButton>
                    <NCode :code="musicCodeExamples.playUrl" language="javascript" />
                  </div>
                </NTabPane>
              </NTabs>
            </div>

            <div class="ui-card compact-card">
              <h3 class="card-title">
                <NIcon class="text-green">
                  <GlobeOutline />
                </NIcon>
                播放地址响应结构
              </h3>
              <div class="code-editor transparent-editor json-editor">
                <NButton size="tiny" secondary class="copy-btn" @click="handleCopyCode(musicJsonString)">
                  <NIcon><CopyOutline /></NIcon>
                </NButton>
                <NCode :code="musicJsonString" language="json" />
              </div>
              <div class="status-list music-status-list">
                <div class="status-item">
                  <NTag type="success" size="tiny" round>
                    FULL
                  </NTag> 完整可播
                </div>
                <div class="status-item">
                  <NTag type="warning" size="tiny" round>
                    TRIAL
                  </NTag> 仅试听，不进入正常播放队列
                </div>
                <div class="status-item">
                  <NTag type="error" size="tiny" round>
                    UNAVAILABLE
                  </NTag> 暂不可播
                </div>
                <div class="status-item">
                  <NTag type="error" size="tiny" round>
                    LOGIN_INVALID
                  </NTag> 音乐源登录态失效
                </div>
              </div>
            </div>
          </div>
        </NTabPane>
      </NTabs>
    </div>

    <!-- 收藏到…弹窗 -->
    <NModal v-model:show="pickModal">
      <NCard style="width: 520px; max-width: 92vw;" title="收藏到…" bordered>
        <NSpace vertical size="large">
          <div>
            <div style="margin-bottom: 8px; font-weight: 600;">
              选择已有收藏夹
            </div>
            <NSelect
              v-model:value="selectedCollectionId"
              :loading="collectionsLoading"
              :options="collectionOptions"
              placeholder="选择收藏夹"
            />
            <div style="margin-top: 12px;">
              <NButton type="primary" color="#f586a9" :loading="pickSubmitting" @click="handleAddToSelected">
                加入所选收藏夹
              </NButton>
            </div>
          </div>

          <div style="height: 1px; background: rgba(0,0,0,0.06);" />

          <div>
            <div style="margin-bottom: 8px; font-weight: 600;">
              新建收藏夹并加入
            </div>
            <NInput v-model:value="newColName" placeholder="收藏夹名称" />
            <div style="margin-top: 10px;">
              <NRadioGroup v-model:value="newColVisibility">
                <NSpace>
                  <NRadio :value="0">
                    私有
                  </NRadio>
                  <NRadio :value="1">
                    公开
                  </NRadio>
                </NSpace>
              </NRadioGroup>
            </div>
            <div style="margin-top: 12px;">
              <NButton secondary :loading="pickSubmitting" @click="handleCreateAndAdd">
                创建并加入
              </NButton>
            </div>
          </div>
        </NSpace>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
/* 样式保持不变（原样） */
.page-container {
  display: flex; flex-direction: column; gap: 28px; padding-bottom: 80px;
  max-width: 1080px; width: 100%;
}

.top-section {
  display: flex; flex-direction: column; align-items: stretch; gap: 18px;
  width: 100%;
}
.section-header-center {
  width:100%;
  padding: 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
  border-radius: var(--ui-radius-lg);
}
.hero-title {
  margin: 0;
}
.hero-subtitle { margin: 6px 0 0; }

.daily-card {
  width: 100%;
  margin: 0 auto;
  display: flex; flex-direction: column;
  padding:0;
  border-radius: var(--ui-radius-lg); overflow: hidden;
}
.daily-card:hover { transform: translateY(-4px); }

.daily-card.has-data {
  flex-direction: row;
  min-height: 420px;
}

.daily-img-box {
  position: relative;
  width: 100%;
  min-height: 360px;
  background: linear-gradient(135deg, #f8fafc, #eef6ff);
}

.daily-card.has-data .daily-img-box {
  width: 48%;
  min-height: 420px;
  flex-shrink: 0;
}

.img-content { width: 100%; height: 100%; display: flex; }
:deep(.the-image), :deep(.the-image img) { width: 100%; height: 100%; display: block; }
:deep(.the-image img) { object-fit: cover; }

.loading-state, .error-state, .idle-state {
  height: 350px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #6b7280;
}

.idle-state { background: #fff; }
.pulse-btn { box-shadow: 0 0 0 0 rgba(245, 134, 169, 0.7); animation: pulse-pink 2s infinite; }
@keyframes pulse-pink {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 134, 169, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(245, 134, 169, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 134, 169, 0); }
}

.img-badges { position: absolute; top: 12px; right: 12px; display: flex; gap: 6px; z-index: 2; }
.glass-tag { background: rgba(15,23,42,0.55)!important; color: #fff!important; border:none!important; }

.daily-info-box {
  padding: 26px;
  background: linear-gradient(180deg, #fff 0%, #fff9fc 100%);
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
}
.info-top { display: flex; justify-content: space-between; align-items: flex-start; }

.art-title { margin: 0; font-size: 22px; font-weight: 800; color: var(--ui-text); line-height: 1.35; max-width: 100%; }

.art-meta { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 12px; }
.meta-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4b5563; }
.meta-line.primary .icon { color: #f586a9; }
.meta-line.secondary { font-size: 12px; color: #6b7280; }
.meta-sub { opacity: 0.8; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.dot { font-weight: bold; opacity: 0.5; }

.tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
.art-tag { background: rgba(245, 134, 169, 0.08); color: #f586a9; }
.action-row { display: flex; gap: 10px; margin-top: 4px; }
.flex-1 { flex: 1; }

.like-btn:active { transform: scale(0.9); }
.like-btn .n-icon { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.like-btn .n-icon:has(svg) { transform: scale(1.1); }

.bottom-section { display: flex; flex-direction: column; gap: 20px; }
.section-header-left {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  flex-wrap: wrap;
}
.doc-title { font-size: 24px; font-weight: 800; color: var(--ui-text); margin: 0; }
.doc-subtitle { margin: 6px 0 0; color: var(--ui-text-muted); font-size: 14px; }
.base-url-badge { display: inline-flex; align-items: center; padding: 4px 12px; background: #fff; border-radius: 8px; border: 1px solid var(--ui-border); font-size: 13px; }
.base-url-badge .method { font-weight: 800; color: #10b981; margin-right: 8px; }
.base-url-badge .url { font-family: monospace; color: #4b5563; word-break: break-all; }

.integration-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.integration-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border-radius: 12px;
}

.integration-eyebrow {
  color: #f586a9;
  font-size: 11px;
  font-weight: 800;
}

.integration-card h3 {
  margin: 0;
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 800;
}

.integration-card p {
  flex: 1;
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}

.integration-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 8px 8px 10px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.82);
}

.integration-code-row code {
  min-width: 0;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.doc-vertical-layout { display: flex; flex-direction: column; gap: 24px; }

.doc-product-tabs {
  width: 100%;
}

.doc-product-tabs :deep(.n-tabs-pane-wrapper) {
  padding-top: 18px;
}

.endpoint-strip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 8px 12px;
  margin-bottom: 18px;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  color: #4b5563;
  font-size: 13px;
}

.endpoint-strip .method {
  flex-shrink: 0;
  color: #10b981;
  font-weight: 800;
}

.endpoint-strip code,
.endpoint-code {
  font-family: 'JetBrains Mono', monospace;
  overflow-wrap: anywhere;
}

.music-strip .method {
  color: #3b82f6;
}

.music-alert {
  background: #fff7ed;
  border-color: rgba(253, 186, 116, 0.6);
}

.music-note-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.music-note-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
  padding: 14px;
  border-radius: 12px;
}

.music-note-index {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  color: #2563eb;
  background: rgba(59, 130, 246, 0.12);
  font-size: 12px;
  font-weight: 800;
}

.music-note-item h3 {
  margin: 0;
  color: var(--ui-text);
  font-size: 14px;
  font-weight: 800;
}

.music-note-item p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}

.music-param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.music-param-item {
  padding: 14px;
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.music-param-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.music-param-type {
  margin-top: 8px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.music-param-item p {
  margin: 8px 0 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.55;
}

.music-status-list {
  flex-wrap: wrap;
}

.compact-card { padding: 20px; border-radius: 16px; }
.card-title { margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: var(--ui-text); display: flex; align-items: center; gap: 8px; }
.text-purple { color: #f586a9; } .text-blue { color: #3b82f6; } .text-green { color: #10b981; } .text-red { color: #ef4444; }

.glass-alert { background: #eff6ff; border: 1px solid rgba(191, 219, 254, 0.8); border-radius: 12px; margin-bottom: 20px; }

.glass-table :deep(.n-data-table) {
  background-color: transparent !important;
  --n-td-color: transparent !important;
  --n-th-color: rgba(255, 255, 255, 0.4) !important;
  --n-border-color: rgba(0,0,0,0.05) !important;
}
.glass-table :deep(.n-data-table-th) { font-weight: 600; color: #4b5563; border-bottom: 1px solid rgba(0,0,0,0.06); }
.glass-table :deep(.n-data-table-td) { color: #374151; border-bottom: 1px solid rgba(0,0,0,0.03); }
.param-code { font-family: monospace; background: rgba(245, 134, 169, 0.08); padding: 2px 6px; border-radius: 4px; color: #db2777; font-weight: 600; }
.type-tag { font-family: monospace; }

.code-editor.transparent-editor {
  background: #fbfdff;
  border: 1px solid var(--ui-border);
  border-radius: 12px; position: relative; overflow: hidden;
}
.code-editor :deep(.n-code) { padding: 16px; font-size: 13px; font-family: 'JetBrains Mono', monospace; }
.code-editor :deep(pre) { background: transparent !important; }
.copy-btn { position: absolute; top: 8px; right: 8px; z-index: 2; opacity: 0.6; }
.copy-btn:hover { opacity: 1; background: #fff; }

.status-list { margin-top: 16px; display: flex; gap: 12px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 12px; font-size: 12px; color: #6b7280; }
.status-item { display: flex; align-items: center; gap: 6px; }

@media (max-width: 900px) {
  .integration-grid,
  .music-note-grid {
    grid-template-columns: 1fr;
  }

  .daily-card,
  .daily-card.has-data {
    flex-direction: column;
    min-height: 0;
  }

  .daily-card.has-data .daily-img-box {
    width: 100%;
    min-height: 360px;
  }

  .art-title { max-width: 100%; margin-bottom: 8px; }
  .info-top { flex-direction: column; align-items: flex-start; }
  .art-meta { align-items: flex-start; }
}

/* =========================
   ✅ B方案：手机端参数卡片
   ========================= */
.param-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-card {
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--ui-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
}

.param-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.param-desc {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.55;
}

.type-pill {
  font-family: monospace;
}

.req-pill {
  font-weight: 700;
}

@media (max-width: 640px) {
  .section-header-center {
    align-items: stretch;
    padding: 18px;
  }

  .section-header-center :deep(.n-button) {
    width: 100%;
  }

  .daily-card.has-data .daily-img-box,
  .daily-img-box,
  .loading-state,
  .error-state,
  .idle-state {
    min-height: 320px;
    height: 320px;
  }

  .daily-info-box {
    padding: 20px;
  }

  .compact-card { padding: 14px; }
  .param-desc { font-size: 13px; }
  .param-code { font-size: 12px; }

  .endpoint-strip {
    display: flex;
    width: 100%;
  }

  .music-param-grid {
    grid-template-columns: 1fr;
  }
}
</style>
