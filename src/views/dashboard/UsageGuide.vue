<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import {
  NTabs, NTabPane, NCode, NTag, NDataTable, NIcon, NAlert, useMessage,
  NSkeleton, NImage, NButton, NTooltip
} from 'naive-ui'
import {
  CodeSlashOutline, CopyOutline, FlashOutline, ListOutline, ImageOutline,
  PersonOutline, RefreshOutline, CloudDownloadOutline, ShareSocialOutline,
  GlobeOutline, PlayOutline, Heart, HeartOutline
} from '@vicons/ionicons5'

import { addFavorite, removeFavorite, checkFavoriteExists } from '@/api/favorite'
import { useAuthStore } from '@/stores/auth'

const message = useMessage()
const authStore = useAuthStore()

// ==========================================
// Part A: 每日一图
// ==========================================
const dailyLoading = ref(false)
const dailyData = ref<any>(null)
const dailyError = ref(false)

const isFavorited = ref(false)
const favLoading = ref(false)

// 1. 获取图片
const fetchDailyImage = async () => {
  dailyLoading.value = true
  dailyError.value = false
  dailyData.value = null
  isFavorited.value = false // 先重置

  try {
    // 注意：这里建议用环境变量或代理，不要硬编码 localhost
    const res = await fetch('http://localhost:9898/blog/setu')
    const json = await res.json()
    if (json.data && json.data.length > 0) {
      dailyData.value = json.data[0]

      // ✅ 修复参数：获取 p (如果是第一张，接口可能没返回 p，默认为 0)
      const currentP = dailyData.value.p || 0

      // ✅ 检查收藏状态 (传入 pid 和 p)
      checkFavStatus(dailyData.value.pid, currentP)
    } else {
      throw new Error('No data')
    }
  } catch (e) {
    dailyError.value = true
    message.error('演示图片加载失败')
  } finally {
    setTimeout(() => { dailyLoading.value = false }, 500)
  }
}

// 2. 检查收藏状态 (修复 Bug 核心)
const checkFavStatus = async (pid: number, p: number) => {
  if (!authStore.token) return

  try {
    const res: any = await checkFavoriteExists(pid, p)

    // 🛑 修复重点：不能直接用 !!res，因为 res 是对象，永远为 true
    // 假设后端返回 Result { code: 200, data: true/false }
    // axios 拦截器如果返回的是 response，那么数据在 res.data.data

    if (res.data && typeof res.data.data === 'boolean') {
      // 情况 A: 你的 http.ts 没有解包，返回完整 axios response
      isFavorited.value = res.data.data
    } else if (typeof res.data === 'boolean') {
      // 情况 B: 你的 http.ts 解了一层包
      isFavorited.value = res.data
    } else {
      // 兜底
      isFavorited.value = false
    }
  } catch (e) {
    console.warn('检查收藏状态失败', e)
    isFavorited.value = false
  }
}

// 3. 点击收藏/取消
const handleToggleFavorite = async () => {
  if (!dailyData.value) return

  if (!authStore.token) {
    message.warning('请先登录后再收藏')
    return
  }

  favLoading.value = true
  const pid = dailyData.value.pid
  const p = dailyData.value.p || 0 // ✅ 获取 p

  try {
    if (isFavorited.value) {
      // 取消收藏
      await removeFavorite(pid, p)
      isFavorited.value = false
      message.success('已取消收藏')
    } else {
      // 添加收藏
      await addFavorite(pid, p)
      isFavorited.value = true
      message.success('已加入收藏夹 ❤️')
    }
  } catch (e) {
    message.error('操作失败')
  } finally {
    favLoading.value = false
  }
}

const dailyDisplayUrl = computed(() => dailyData.value?.urls.regular || dailyData.value?.urls.original)
const todayDate = computed(() => new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }))

const handleDownload = () => window.open(dailyData.value?.urls.original, '_blank')
const handleCopyLink = () => {
  navigator.clipboard.writeText(dailyData.value?.urls.original).then(() => message.success('链接已复制'))
}

// ==========================================
// Part B: 开发文档
// ==========================================
const baseUrl = 'http://api.yukiryou.icu'
const demoToken = 'YOUR_API_KEY'

// 文档部分保持不变...
const docJsonString = `{
  "error": "",
  "data": [
    {
      "pid": 138119385,
      "p": 0,
      "title": "【ネタバレ込】11月分",
      "author": "長月然",
      "r18": false,
      "width": 1061,
      "height": 1488,
      "tags": ["魔法少女", "插画"],
      "urls": {
        "original": "https://i.yukiryou.top/.../img.png",
        "regular": "https://i.yukiryou.top/.../img_master1200.jpg"
      }
    }
  ]
}`

const codeExamples = reactive({
  curl: `curl -X GET "${baseUrl}/setu/v2?r18=0&num=1&excludeAI=true" \\
  -H "Authorization: Bearer ${demoToken}"`,
  js: `fetch("${baseUrl}/setu/v2?r18=0&num=1&excludeAI=true")
  .then(res => res.json())
  .then(data => console.log(data))`,
  python: `import requests
# 排除 AI 作品，按长宽比筛选
params = {
    "r18": 0,
    "excludeAI": True,
    "aspectRatio": "16:9"
}
res = requests.get("${baseUrl}/setu/v2", params=params)
print(res.json())`
})

const paramColumns = [
  { title: '参数名', key: 'name', width: 90, render: (row:any) => h('code', {class: 'param-code'}, row.name) },
  { title: '类型', key: 'type', width: 90, render: (row:any) => h(NTag, {size:'small', bordered:false, type: row.type.includes('[]') ? 'warning' : 'info', class: 'type-tag'}, {default:()=>row.type}) },
  { title: '必填', key: 'required', width: 60, render: (row: any) => row.required ? h('span',{class:'text-red'},'是') : '否' },
  { title: '说明', key: 'desc' }
]

const paramData = [
  { name: 'num', type: 'int', required: false, desc: '返回数量，默认 1，最大 20' },
  { name: 'r18', type: 'int', required: false, desc: '0=非R18，1=R18，2=混合；默认为 0' },
  { name: 'uid', type: 'int[]', required: false, desc: '指定作者 UID 列表' },
  { name: 'pid', type: 'long', required: false, desc: '指定作品 PID 精确查询' },
  { name: 'keyword', type: 'string', required: false, desc: '标题 / 标签关键字模糊搜索' },
  { name: 'tag', type: 'string[]', required: false, desc: '按标签过滤（支持多个）' },
  { name: 'size', type: 'string[]', required: false, desc: 'original / regular / small / thumb / mini' },
  { name: 'proxy', type: 'string', required: false, desc: '图片域名代理，不传则使用服务端默认' },
  { name: 'dateAfter', type: 'long', required: false, desc: '上传时间戳下限（毫秒）' },
  { name: 'dateBefore', type: 'long', required: false, desc: '上传时间戳上限（毫秒）' },
  { name: 'excludeAI', type: 'bool', required: false, desc: '是否排除 AI 作品' },
  { name: 'aspectRatio', type: 'string', required: false, desc: '长宽比过滤（如 "16:9"）' }
]

const handleCopyCode = (text: string) => navigator.clipboard.writeText(text).then(() => message.success('代码已复制'))
const formatDate = (ts: number) => new Date(ts).toLocaleDateString()
</script>

<template>
  <div class="page-container">
    <div class="top-section">
      <div class="section-header-center">
        <h2 class="hero-title">API 实时演示</h2>
        <p class="hero-subtitle">{{ todayDate }} · 每日精选插画</p>
      </div>

      <div class="daily-card glass-card">
        <div class="daily-img-box">
          <div v-if="dailyLoading" class="loading-state">
            <n-skeleton height="100%" width="100%" />
          </div>

          <div v-else-if="dailyError" class="error-state">
            <n-icon size="40"><ImageOutline /></n-icon>
            <span>加载失败</span>
            <n-button size="small" @click="fetchDailyImage">重试</n-button>
          </div>

          <div v-else-if="dailyData" class="img-content">
            <n-image
              :src="dailyDisplayUrl"
              object-fit="cover"
              class="the-image"
              :img-props="{ referrerpolicy: 'no-referrer' }"
            />
            <div class="img-badges">
              <n-tag v-if="dailyData.r18" type="error" size="small" round>R-18</n-tag>
              <n-tag type="info" size="small" round class="glass-tag">{{ dailyData.width }}x{{ dailyData.height }}</n-tag>
            </div>
          </div>

          <div v-else class="idle-state">
            <n-icon size="64" color="#e5e7eb"><ImageOutline /></n-icon>
            <p>API 演示准备就绪</p>
            <n-button type="primary" color="#8b5cf6" size="large" @click="fetchDailyImage" class="pulse-btn">
              <template #icon><n-icon><PlayOutline /></n-icon></template>
              点击调用 API
            </n-button>
          </div>
        </div>

        <div class="daily-info-box" v-if="!dailyLoading && dailyData">
          <div class="info-top">
            <h3 class="art-title">{{ dailyData.title }}</h3>
            <div class="art-meta">
              <div class="meta-line primary">
                <n-icon class="icon"><PersonOutline /></n-icon>
                <span class="author-name">{{ dailyData.author }}</span>
                <span class="meta-sub">UID: {{ dailyData.uid }}</span>
              </div>
              <div class="meta-line secondary">
                <span class="meta-sub">PID: {{ dailyData.pid }}</span>
                <span class="meta-sub" v-if="dailyData.p !== undefined"> · P{{ dailyData.p }}</span>
                <span class="dot">·</span>
                <span>{{ formatDate(dailyData.uploadDate) }}</span>
              </div>
            </div>
          </div>

          <div class="tags-row">
            <n-tag v-for="tag in dailyData.tags" :key="tag" :bordered="false" size="tiny" class="art-tag">#{{ tag }}</n-tag>
          </div>

          <div class="action-row">
             <n-button type="primary" color="#8b5cf6" class="flex-1" @click="handleDownload">
               <template #icon><n-icon><CloudDownloadOutline /></n-icon></template> 原图
             </n-button>

             <n-tooltip trigger="hover">
               <template #trigger>
                 <n-button
                   circle
                   secondary
                   @click="handleToggleFavorite"
                   :loading="favLoading"
                   class="like-btn"
                 >
                   <template #icon>
                     <n-icon :color="isFavorited ? '#ef4444' : ''" :size="20">
                       <Heart v-if="isFavorited" />
                       <HeartOutline v-else />
                     </n-icon>
                   </template>
                 </n-button>
               </template>
               {{ isFavorited ? '取消收藏' : '加入收藏' }}
             </n-tooltip>

             <n-tooltip trigger="hover">
               <template #trigger>
                 <n-button secondary circle @click="handleCopyLink"><template #icon><n-icon><ShareSocialOutline /></n-icon></template></n-button>
               </template>
               复制链接
             </n-tooltip>

             <n-tooltip trigger="hover">
               <template #trigger>
                 <n-button secondary circle @click="fetchDailyImage"><template #icon><n-icon><RefreshOutline /></n-icon></template></n-button>
               </template>
               换一张
             </n-tooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="section-header-left">
        <h2 class="doc-title">集成指南</h2>
        <div class="base-url-badge">
          <span class="method">GET</span>
          <code class="url">{{ baseUrl }}/setu/v2</code>
        </div>
      </div>

      <n-alert type="info" title="接入提示" class="glass-alert">
          <template #icon><n-icon><FlashOutline /></n-icon></template>
          默认返回随机图片。如需更高配额或高级筛选（如 excludeAI），请在 Header 中携带 <b>Authorization</b>。
      </n-alert>

      <div class="doc-vertical-layout">
        <div class="glass-card compact-card">
          <h3 class="card-title"><n-icon class="text-purple"><ListOutline /></n-icon> 常用请求参数 (Query)</h3>
          <n-data-table :columns="paramColumns" :data="paramData" size="small" class="glass-table" :single-line="false" />
        </div>

        <div class="glass-card compact-card code-box">
            <div class="card-header-row">
              <h3 class="card-title"><n-icon class="text-blue"><CodeSlashOutline /></n-icon> 代码示例</h3>
            </div>
            <n-tabs type="segment" animated class="modern-tabs">
              <n-tab-pane name="curl" tab="cURL">
                  <div class="code-editor transparent-editor">
                    <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.curl)"><n-icon><CopyOutline /></n-icon></n-button>
                    <n-code :code="codeExamples.curl" language="bash" />
                  </div>
              </n-tab-pane>
              <n-tab-pane name="js" tab="JS">
                  <div class="code-editor transparent-editor">
                    <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.js)"><n-icon><CopyOutline /></n-icon></n-button>
                    <n-code :code="codeExamples.js" language="javascript" />
                  </div>
              </n-tab-pane>
              <n-tab-pane name="py" tab="Python">
                  <div class="code-editor transparent-editor">
                    <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.python)"><n-icon><CopyOutline /></n-icon></n-button>
                    <n-code :code="codeExamples.python" language="python" />
                  </div>
              </n-tab-pane>
            </n-tabs>
        </div>

        <div class="glass-card compact-card">
          <h3 class="card-title"><n-icon class="text-green"><GlobeOutline /></n-icon> 响应结构</h3>
          <div class="code-editor transparent-editor json-editor">
              <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(docJsonString)"><n-icon><CopyOutline /></n-icon></n-button>
              <n-code :code="docJsonString" language="json" />
          </div>
          <div class="status-list">
              <div class="status-item"><n-tag type="success" size="tiny" round>200</n-tag> 成功</div>
              <div class="status-item"><n-tag type="error" size="tiny" round>429</n-tag> 配额耗尽</div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* 样式保持不变 */
.page-container {
  display: flex; flex-direction: column; gap: 40px; padding-bottom: 80px;
  max-width: 900px; margin: 0 auto; width: 100%;
}

.top-section {
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  width: 100%;
}
.section-header-center { text-align: center; }
.hero-title {
  font-size: 32px; font-weight: 800; margin: 0;
  background: linear-gradient(135deg, #1f2937 0%, #4b5563 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hero-subtitle { margin: 6px 0 0; color: #6b7280; font-size: 15px; }

.daily-card {
  width: 100%; max-width: 500px;
  margin: 0 auto;
  display: flex; flex-direction: column;
  border-radius: 20px; overflow: hidden;
  transition: transform 0.3s ease;
}
.daily-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.1); }

.daily-img-box { position: relative; width: 100%; min-height: 350px; background: #f3f4f6; }
.img-content { width: 100%; height: 100%; display: flex; }
:deep(.the-image), :deep(.the-image img) { width: 100%; height: auto; display: block; }

.loading-state, .error-state, .idle-state {
  height: 350px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #9ca3af;
}

.idle-state { background: rgba(255,255,255,0.4); }
.pulse-btn { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); animation: pulse-purple 2s infinite; }
@keyframes pulse-purple {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
}

.img-badges { position: absolute; top: 12px; right: 12px; display: flex; gap: 6px; z-index: 2; }
.glass-tag { background: rgba(0,0,0,0.5)!important; color: #fff!important; border:none!important; backdrop-filter: blur(4px); }

.daily-info-box { padding: 20px; background: rgba(255,255,255,0.6); display: flex; flex-direction: column; gap: 12px; }
.info-top { display: flex; justify-content: space-between; align-items: flex-start; }

.art-title { margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; line-height: 1.3; max-width: 60%; }

.art-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.meta-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4b5563; }
.meta-line.primary .icon { color: #8b5cf6; }
.meta-line.secondary { font-size: 12px; color: #9ca3af; }
.meta-sub { opacity: 0.8; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.dot { font-weight: bold; opacity: 0.5; }

.tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
.art-tag { background: rgba(139, 92, 246, 0.08); color: #7c3aed; }
.action-row { display: flex; gap: 10px; margin-top: 4px; }
.flex-1 { flex: 1; }

.like-btn:active { transform: scale(0.9); }
.like-btn .n-icon { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.like-btn .n-icon:has(svg) { transform: scale(1.1); }

.bottom-section { display: flex; flex-direction: column; gap: 20px; padding: 0 10px; }
.section-header-left { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; flex-wrap: wrap; }
.doc-title { font-size: 24px; font-weight: 700; color: #374151; margin: 0; }
.base-url-badge { display: inline-flex; align-items: center; padding: 4px 12px; background: rgba(255,255,255,0.8); border-radius: 8px; border: 1px solid rgba(0,0,0,0.05); font-size: 13px; }
.base-url-badge .method { font-weight: 800; color: #10b981; margin-right: 8px; }
.base-url-badge .url { font-family: monospace; color: #4b5563; word-break: break-all; }

.doc-vertical-layout { display: flex; flex-direction: column; gap: 24px; }

.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}
.compact-card { padding: 20px; border-radius: 16px; }
.card-title { margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #4b5563; display: flex; align-items: center; gap: 8px; }
.text-purple { color: #8b5cf6; } .text-blue { color: #3b82f6; } .text-green { color: #10b981; } .text-red { color: #ef4444; }

.glass-alert { background: rgba(239, 246, 255, 0.6); border: 1px solid rgba(191, 219, 254, 0.5); border-radius: 12px; margin-bottom: 20px; }

.glass-table :deep(.n-data-table) {
  background-color: transparent !important;
  --n-td-color: transparent !important;
  --n-th-color: rgba(255, 255, 255, 0.4) !important;
  --n-border-color: rgba(0,0,0,0.05) !important;
}
.glass-table :deep(.n-data-table-th) { font-weight: 600; color: #4b5563; border-bottom: 1px solid rgba(0,0,0,0.06); }
.glass-table :deep(.n-data-table-td) { color: #374151; border-bottom: 1px solid rgba(0,0,0,0.03); }
.param-code { font-family: monospace; background: rgba(139, 92, 246, 0.08); padding: 2px 6px; border-radius: 4px; color: #db2777; font-weight: 600; }
.type-tag { font-family: monospace; }

.code-editor.transparent-editor {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px; position: relative; overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
}
.code-editor :deep(.n-code) { padding: 16px; font-size: 13px; font-family: 'JetBrains Mono', monospace; }
.code-editor :deep(pre) { background: transparent !important; }
.copy-btn { position: absolute; top: 8px; right: 8px; z-index: 2; opacity: 0.6; }
.copy-btn:hover { opacity: 1; background: #fff; }

.status-list { margin-top: 16px; display: flex; gap: 12px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 12px; font-size: 12px; color: #6b7280; }
.status-item { display: flex; align-items: center; gap: 6px; }

@media (max-width: 900px) {
  .daily-card { width: 100%; max-width: 400px; }
  .art-title { max-width: 100%; margin-bottom: 8px; }
  .info-top { flex-direction: column; align-items: flex-start; }
  .art-meta { align-items: flex-start; }
}
</style>