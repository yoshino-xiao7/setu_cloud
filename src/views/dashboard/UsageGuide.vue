<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import {
  NTabs, NTabPane, NCode, NTag, NDataTable, NIcon, NAlert, useMessage,
  NSkeleton, NImage, NButton, NTooltip,
  NModal, NCard, NInput, NSelect, NRadioGroup, NRadio, NSpace
} from 'naive-ui'
import {
  CodeSlashOutline, CopyOutline, FlashOutline, ListOutline, ImageOutline,
  PersonOutline, RefreshOutline, CloudDownloadOutline, ShareSocialOutline,
  GlobeOutline, PlayOutline, Heart, HeartOutline
} from '@vicons/ionicons5'

import { addFavorite, removeFavorite, checkFavoriteExists } from '@/api/favorite'
import { listMyCollections, createCollection, addToCollection } from '@/api/collections'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/api/env'
import { unwrapApiData } from '@/api/response'
import { useBreakpoint } from '@/composables/useBreakpoint'

const message = useMessage()
const authStore = useAuthStore()

const { isMobile } = useBreakpoint()

// ==========================================
// Part A: 每日一图
// ==========================================
const dailyLoading = ref(false)
const dailyData = ref<any>(null)
const dailyError = ref(false)

const isFavorited = ref(false)
const favLoading = ref(false)

const fetchDailyImage = async () => {
  dailyLoading.value = true
  dailyError.value = false
  dailyData.value = null
  isFavorited.value = false

  try {
    const res = await fetch(`${API_BASE_URL}/blog/setu`)

    const json = await res.json()
    if (json.data && json.data.length > 0) {
      dailyData.value = json.data[0]
      const currentP = dailyData.value.p || 0
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

const checkFavStatus = async (pid: number, p: number) => {
  if (!authStore.user) return  // ✅ 使用 user 判断登录状态
  try {
    const res: any = await checkFavoriteExists(pid, p)
    const v = unwrapApiData<boolean>(res)
    isFavorited.value = typeof v === 'boolean' ? v : false
  } catch (e) {
    console.warn('检查收藏状态失败', e)
    isFavorited.value = false
  }
}

const handleToggleFavorite = async () => {
  if (!dailyData.value) return
  if (!authStore.user) {  // ✅ 使用 user 判断登录状态
    message.warning('请先登录后再收藏')
    return
  }

  favLoading.value = true
  const pid = dailyData.value.pid
  const p = dailyData.value.p || 0

  try {
    if (isFavorited.value) {
      await removeFavorite(pid, p)
      isFavorited.value = false
      message.success('已取消收藏')
    } else {
      await addFavorite(pid, p)
      isFavorited.value = true
      message.success('已加入默认收藏夹 ❤️')
    }
  } catch (e) {
    message.error('操作失败')
  } finally {
    favLoading.value = false
  }
}

const dailyDisplayUrl = computed(() => dailyData.value?.urls?.regular || dailyData.value?.urls?.original)
const todayDate = computed(() => new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }))
// 会话内是否跳过代理确认
const skipProxyConfirm = ref(false)
// 下载弹窗状态
const downloadModalVisible = ref(false)
const pendingDownloadUrl = ref('')
const pendingDownloadFilename = ref('')

const handleDownload = () => {
  const url = dailyData.value?.urls?.original
  if (!url) {
    message.warning('原图链接为空')
    return
  }
  
  const filename = `${dailyData.value?.pid || 'image'}_${dailyData.value?.p || 0}.jpg`
  
  // 如果已勾选"不再提示"，直接使用代理下载
  if (skipProxyConfirm.value) {
    doProxyDownload(url, filename)
    return
  }
  
  // 保存待下载信息，显示弹窗
  pendingDownloadUrl.value = url
  pendingDownloadFilename.value = filename
  downloadModalVisible.value = true
}

const confirmProxyDownload = () => {
  doProxyDownload(pendingDownloadUrl.value, pendingDownloadFilename.value)
  downloadModalVisible.value = false
}

const confirmNativeDownload = () => {
  doNativeDownload(pendingDownloadUrl.value, pendingDownloadFilename.value)
  downloadModalVisible.value = false
}

// 代理下载
const doProxyDownload = (url: string, filename: string) => {
  const proxyUrl = `https://download.yukiryou.top/d/${url}?filename=${encodeURIComponent(filename)}`
  window.open(proxyUrl, '_blank')
}

// 原生下载
const doNativeDownload = (url: string, filename: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const handleCopyLink = () => {
  navigator.clipboard.writeText(dailyData.value?.urls?.original).then(() => message.success('链接已复制'))
}

// ==========================================
// 收藏到指定收藏夹（新增）
// ==========================================
const pickModal = ref(false)
const collectionsLoading = ref(false)
const collections = ref<any[]>([])
const selectedCollectionId = ref<number | null>(null)

const newColName = ref('')
const newColVisibility = ref<0 | 1>(0)
const pickSubmitting = ref(false)

const collectionOptions = computed(() =>
  collections.value.map((c: any) => ({
    label: c.isDefault ? `${c.name}（默认）` : c.name,
    value: c.id
  }))
)

const openPickModal = async () => {
  if (!dailyData.value) return
  if (!authStore.user) {  // ✅ 使用 user 判断登录状态
    message.warning('请先登录后再收藏')
    return
  }

  pickModal.value = true
  collectionsLoading.value = true

  try {
    const res: any = await listMyCollections()
    const list = unwrapApiData<any[]>(res, [])
    collections.value = Array.isArray(list) ? list : []

    const def = collections.value.find((x: any) => x.isDefault)
    selectedCollectionId.value = def?.id ?? (collections.value[0]?.id ?? null)
  } catch (e) {
    message.error('加载收藏夹失败')
  } finally {
    collectionsLoading.value = false
  }
}

const handleAddToSelected = async () => {
  if (!dailyData.value) return
  if (!selectedCollectionId.value) {
    message.warning('请选择一个收藏夹')
    return
  }

  pickSubmitting.value = true
  try {
    const pid = dailyData.value.pid
    const p = dailyData.value.p || 0
    await addToCollection(selectedCollectionId.value, pid, p)
    message.success('已加入所选收藏夹')
    pickModal.value = false
  } catch (e) {
    message.error('加入失败')
  } finally {
    pickSubmitting.value = false
  }
}

const handleCreateAndAdd = async () => {
  if (!dailyData.value) return
  const name = newColName.value.trim()
  if (!name) {
    message.warning('请输入收藏夹名称')
    return
  }

  pickSubmitting.value = true
  try {
    const createRes: any = await createCollection({
      name,
      description: '',
      visibility: newColVisibility.value
    })
    const newId = unwrapApiData<number>(createRes)
    if (!newId) throw new Error('create failed')

    const pid = dailyData.value.pid
    const p = dailyData.value.p || 0
    await addToCollection(newId, pid, p)

    message.success('已创建并加入收藏夹')
    newColName.value = ''
    pickModal.value = false
  } catch (e) {
    message.error('创建或加入失败')
  } finally {
    pickSubmitting.value = false
  }
}

// ==========================================
// Part B: 开发文档
// ==========================================
const baseUrl = API_BASE_URL
const demoToken = 'YOUR_API_KEY'

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
  <div class="page-container ui-page">
    <div class="top-section">
      <div class="section-header-center ui-page-header ui-card">
        <div>
          <h2 class="hero-title ui-page-title">API 实时演示</h2>
          <p class="hero-subtitle ui-page-subtitle">{{ todayDate }} · 每日精选插画</p>
        </div>
        <n-button secondary round @click="fetchDailyImage">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          换一张
        </n-button>
      </div>

      <div class="daily-card ui-card ui-card-hover" :class="{ 'has-data': dailyData && !dailyLoading }">
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
            <n-button type="primary" color="#f586a9" size="large" @click="fetchDailyImage" class="pulse-btn">
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
            <n-button type="primary" color="#f586a9" class="flex-1" @click="handleDownload">
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
              {{ isFavorited ? '取消默认收藏' : '加入默认收藏' }}
            </n-tooltip>

            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button secondary circle @click="openPickModal">
                  <template #icon><n-icon><ListOutline /></n-icon></template>
                </n-button>
              </template>
              收藏到…
            </n-tooltip>

            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button secondary circle @click="handleCopyLink">
                  <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
                </n-button>
              </template>
              复制链接
            </n-tooltip>

            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button secondary circle @click="fetchDailyImage">
                  <template #icon><n-icon><RefreshOutline /></n-icon></template>
                </n-button>
              </template>
              换一张
            </n-tooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="section-header-left ui-card">
        <div>
          <h2 class="doc-title">集成指南</h2>
          <p class="doc-subtitle">请求参数、代码示例和响应结构都在这里。</p>
        </div>
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
        <div class="ui-card compact-card">
          <h3 class="card-title">
            <n-icon class="text-purple"><ListOutline /></n-icon>
            常用请求参数 (Query)
          </h3>

          <!-- ✅ PC：保留表格 -->
          <div v-if="!isMobile" class="table-wrap">
            <n-data-table
              :columns="paramColumns"
              :data="paramData"
              size="small"
              class="glass-table"
              :single-line="false"
            />
          </div>

          <!-- ✅ 手机：卡片列表 -->
          <div v-else class="param-cards">
            <n-card
              v-for="p in paramData"
              :key="p.name"
              size="small"
              class="param-card"
              :bordered="false"
            >
              <div class="param-title-row">
                <code class="param-code">{{ p.name }}</code>

                <n-tag size="small" :bordered="false" type="info" class="type-pill">
                  {{ p.type }}
                </n-tag>

                <n-tag
                  size="small"
                  :bordered="false"
                  :type="p.required ? 'error' : 'success'"
                  class="req-pill"
                >
                  {{ p.required ? '必填' : '可选' }}
                </n-tag>
              </div>

              <div class="param-desc">{{ p.desc }}</div>
            </n-card>
          </div>
        </div>

        <div class="ui-card compact-card code-box">
          <div class="card-header-row">
            <h3 class="card-title"><n-icon class="text-blue"><CodeSlashOutline /></n-icon> 代码示例</h3>
          </div>
          <n-tabs type="segment" animated class="modern-tabs">
            <n-tab-pane name="curl" tab="cURL">
              <div class="code-editor transparent-editor">
                <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.curl)">
                  <n-icon><CopyOutline /></n-icon>
                </n-button>
                <n-code :code="codeExamples.curl" language="bash" />
              </div>
            </n-tab-pane>
            <n-tab-pane name="js" tab="JS">
              <div class="code-editor transparent-editor">
                <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.js)">
                  <n-icon><CopyOutline /></n-icon>
                </n-button>
                <n-code :code="codeExamples.js" language="javascript" />
              </div>
            </n-tab-pane>
            <n-tab-pane name="py" tab="Python">
              <div class="code-editor transparent-editor">
                <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(codeExamples.python)">
                  <n-icon><CopyOutline /></n-icon>
                </n-button>
                <n-code :code="codeExamples.python" language="python" />
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>

        <div class="ui-card compact-card">
          <h3 class="card-title"><n-icon class="text-green"><GlobeOutline /></n-icon> 响应结构</h3>
          <div class="code-editor transparent-editor json-editor">
            <n-button size="tiny" secondary class="copy-btn" @click="handleCopyCode(docJsonString)">
              <n-icon><CopyOutline /></n-icon>
            </n-button>
            <n-code :code="docJsonString" language="json" />
          </div>
          <div class="status-list">
            <div class="status-item"><n-tag type="success" size="tiny" round>200</n-tag> 成功</div>
            <div class="status-item"><n-tag type="error" size="tiny" round>429</n-tag> 配额耗尽</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏到…弹窗 -->
    <n-modal v-model:show="pickModal">
      <n-card style="width: 520px; max-width: 92vw;" title="收藏到…" bordered>
        <n-space vertical size="large">
          <div>
            <div style="margin-bottom: 8px; font-weight: 600;">选择已有收藏夹</div>
            <n-select
              :loading="collectionsLoading"
              :options="collectionOptions"
              v-model:value="selectedCollectionId"
              placeholder="选择收藏夹"
            />
            <div style="margin-top: 12px;">
              <n-button type="primary" color="#f586a9" :loading="pickSubmitting" @click="handleAddToSelected">
                加入所选收藏夹
              </n-button>
            </div>
          </div>

          <div style="height: 1px; background: rgba(0,0,0,0.06);"></div>

          <div>
            <div style="margin-bottom: 8px; font-weight: 600;">新建收藏夹并加入</div>
            <n-input v-model:value="newColName" placeholder="收藏夹名称" />
            <div style="margin-top: 10px;">
              <n-radio-group v-model:value="newColVisibility">
                <n-space>
                  <n-radio :value="0">私有</n-radio>
                  <n-radio :value="1">公开</n-radio>
                </n-space>
              </n-radio-group>
            </div>
            <div style="margin-top: 12px;">
              <n-button secondary :loading="pickSubmitting" @click="handleCreateAndAdd">
                创建并加入
              </n-button>
            </div>
          </div>
        </n-space>
      </n-card>
    </n-modal>

    <!-- 下载方式选择弹窗 -->
    <n-modal v-model:show="downloadModalVisible">
      <n-card 
        style="width: 400px; max-width: 92vw;" 
        title="选择下载方式" 
        :bordered="false"
        class="download-modal-card"
      >
        <div class="download-modal-content">
          <p class="download-desc">请选择您的下载方式：</p>
          <p class="download-tip">💡 温馨提示：代理下载可解决您无法正常下载的问题</p>
          
          <label class="download-checkbox">
            <input 
              type="checkbox" 
              v-model="skipProxyConfirm"
            />
            <span>本次登录不再提示</span>
          </label>
        </div>
        
        <template #footer>
          <n-space justify="end">
            <n-button @click="downloadModalVisible = false">取消</n-button>
            <n-button secondary @click="confirmNativeDownload">原生下载</n-button>
            <n-button type="primary" color="#f586a9" @click="confirmProxyDownload">代理下载</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
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
  height: 350px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #9ca3af;
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
.meta-line.secondary { font-size: 12px; color: #9ca3af; }
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

.doc-vertical-layout { display: flex; flex-direction: column; gap: 24px; }

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
}

/* 下载弹窗样式 */
.download-modal-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.download-modal-content {
  padding: 8px 0;
}

.download-desc {
  color: #1f2937;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 8px;
}

.download-tip {
  color: #f586a9;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: rgba(245, 134, 169, 0.1);
  border-radius: 8px;
}

.download-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
}

.download-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #f586a9;
  cursor: pointer;
}
</style>
