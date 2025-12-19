<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  NCard,
  NTag,
  NButton,
  NIcon,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
  NDivider,
  NImage,
  NImageGroup,
  NEmpty,
  NSkeleton,
  useMessage,
  NModal,
  NSpace,
  NTooltip
} from 'naive-ui'
import {
  FlashOutline,
  SearchOutline,
  ImageOutline,
  PersonOutline,
  EyeOutline,
  RefreshOutline,
  HeartOutline,
  FolderOpenOutline,
  ReceiptOutline,
  DownloadOutline,
  PricetagOutline
} from '@vicons/ionicons5'

import { useRouter } from 'vue-router'
import http from '@/api/http'
import { getMyPoints } from '@/api/points'
import { addFavorite } from '@/api/favorite'
import { listMyCollections, addToCollection } from '@/api/collections'

const router = useRouter()
const message = useMessage()

/**
 * ✅ 通用解包（只解你 http.ts 的包裹，不破坏 /setu/v2 的 {error,data}）
 */
const unwrap = (res: any) => {
  const d = res?.data
  if (!d) return d
  // /setu/v2：{ error:"", data:[...] } ——保持整体
  if (typeof d === 'object' && d !== null && 'error' in d && 'data' in d) return d
  // 其它接口：{ data: xxx }
  if (d && d.data !== undefined) return d.data
  return d
}

// =======================
// 页面状态：积分 + 结果
// =======================
const pointsLoading = ref(false)
const points = ref<number>(0)

const calling = ref(false)
const resultLoading = ref(false)
const results = ref<any[]>([])

// 每次调用扣 20（前端只展示，真实扣费由后端决定）
const COST_PER_CALL = 20
const canCall = computed(() => points.value >= COST_PER_CALL)

// =======================
// Setu 调用表单
// =======================
const form = reactive({
  r18: 0 as 0 | 1 | 2,
  num: 1,
  keyword: '',
  tagText: '',
  size: 'regular' as 'original' | 'regular' | 'small',
  excludeAI: true,
  proxy: '',
  aspectRatio: ''
})

const r18Options = [
  { label: '非 R18', value: 0 },
  { label: 'R18', value: 1 },
  { label: '混合', value: 2 }
]
const sizeOptions = [
  { label: 'regular（推荐）', value: 'regular' },
  { label: 'original（原图）', value: 'original' },
  { label: 'small（小图）', value: 'small' }
]

const parsedTags = computed(() => {
  const t = (form.tagText || '').trim()
  if (!t) return []
  return t
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
})

// =======================
// 拉取积分
// =======================
const fetchPoints = async () => {
  pointsLoading.value = true
  try {
    const res: any = await getMyPoints()
    const data = unwrap(res) || {}
    points.value = Number(data.points ?? 0)
  } catch (e) {
    message.error('获取积分失败（请确认 /points/me + 前端带 Authorization）')
  } finally {
    pointsLoading.value = false
  }
}
const refreshAll = async () => {
  await fetchPoints()
}

// =======================
// ✅ 调用 /setu/v2
// 关键：用 URLSearchParams 确保 tag/size 变成重复 key：tag=xxx&tag=yyy（而不是 tag[]）
// =======================
const callSetu = async () => {
  if (!canCall.value) return message.warning(`积分不足：至少需要 ${COST_PER_CALL} 积分`)

  calling.value = true
  resultLoading.value = true
  results.value = []

  try {
    const sp = new URLSearchParams()
    sp.set('r18', String(form.r18))
    sp.set('num', String(form.num))

    if (form.keyword?.trim()) sp.set('keyword', form.keyword.trim())
    if (form.proxy?.trim()) sp.set('proxy', form.proxy.trim())
    if (form.aspectRatio?.trim()) sp.set('aspectRatio', form.aspectRatio.trim())
    if (form.excludeAI) sp.set('excludeAI', 'true')

    // ✅ List<String> tag / size：用重复 key
    parsedTags.value.forEach(t => sp.append('tag', t))
    sp.append('size', form.size)

    const res: any = await http.get('/setu/v2', { params: sp })
    const payload = unwrap(res) || {}
    const arr = payload?.data
    results.value = Array.isArray(arr) ? arr : []

    // 刷新积分显示（是否扣费由后端决定）
    await refreshAll()

    if (!results.value.length) {
      message.warning('返回为空：当前筛选条件在里没有匹配图片')
    } else {
      message.success(`成功返回 ${results.value.length} 张`)
    }
  } catch (e: any) {
    message.error(e?.response?.data?.msg || e?.message || '调用失败')
    await refreshAll()
  } finally {
    calling.value = false
    resultLoading.value = false
  }
}

// =======================
// 图片工具
// =======================
const pickPreviewSrc = (it: any) => {
  // 预览优先 original，其次 regular / small
  return it?.urls?.original || it?.urls?.regular || it?.urls?.small || ''
}
const pickCoverSrc = (it: any) => {
  // 列表展示优先 regular
  return it?.urls?.regular || it?.urls?.small || it?.urls?.original || ''
}
const pickOriginalSrc = (it: any) => {
  // 原图按钮/下载：优先 original，不存在就 fallback
  return it?.urls?.original || it?.urls?.regular || it?.urls?.small || ''
}

const openOriginal = (url?: string | null) => {
  if (!url) return message.warning('原图链接为空')
  window.open(url, '_blank')
}

/**
 * ✅ 尽力触发下载：
 * - 如果对方服务器允许，会下载
 * - 如果跨域/响应头不允许，可能会变成“打开新标签页”
 */
const downloadOriginal = (url?: string | null) => {
  if (!url) return message.warning('下载链接为空')
  try {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener'
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch {
    window.open(url, '_blank')
  }
}

// 标签显示：最多展示 6 个，剩余用 +N
const MAX_TAGS = 6
const visibleTags = (it: any) => {
  const tags = Array.isArray(it?.tags) ? it.tags : []
  return tags.slice(0, MAX_TAGS)
}
const hiddenTagCount = (it: any) => {
  const tags = Array.isArray(it?.tags) ? it.tags : []
  return Math.max(0, tags.length - MAX_TAGS)
}

// =======================
// ✅ 收藏：选择收藏夹
// 默认收藏夹走 /favorite/{pid}/{p}
// 非默认走 /collections/{id}/items/{pid}/{p}
// =======================
type Collection = { id: number; name: string; isDefault: boolean; visibility: number }
const favModal = ref(false)
const favLoading = ref(false)
const favCollections = ref<Collection[]>([])
const favSelectedId = ref<number | null>(null)
const favTarget = ref<any | null>(null)

const loadCollectionsOnce = async () => {
  if (favCollections.value.length) return
  const res: any = await listMyCollections()
  const arr = unwrap(res) || []
  favCollections.value = (Array.isArray(arr) ? arr : []).map((c: any) => ({
    id: Number(c.id),
    name: c.name,
    isDefault: !!c.isDefault,
    visibility: Number(c.visibility ?? 0)
  }))
}

const openFav = async (it: any) => {
  favTarget.value = it
  favModal.value = true
  try {
    await loadCollectionsOnce()
    const def = favCollections.value.find(x => x.isDefault)
    favSelectedId.value = def?.id ?? (favCollections.value[0]?.id ?? null)
  } catch (e) {
    message.error('加载收藏夹失败')
  }
}

const submitFav = async () => {
  const it = favTarget.value
  if (!it) return
  if (!favSelectedId.value) return message.warning('请选择一个收藏夹')

  favLoading.value = true
  try {
    const c = favCollections.value.find(x => x.id === favSelectedId.value)
    if (!c) return message.warning('收藏夹不存在')

    const pid = Number(it.pid)
    const p = Number(it.p ?? 0)

    if (c.isDefault) {
      await addFavorite(pid, p)
    } else {
      await addToCollection(c.id, pid, p)
    }

    message.success(`已收藏到「${c.name}」`)
    favModal.value = false
  } catch (e: any) {
    message.error(e?.response?.data?.msg || e?.message || '收藏失败')
  } finally {
    favLoading.value = false
  }
}

onMounted(async () => {
  await refreshAll()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <h2 class="title">积分调用</h2>
      <p class="subtitle">
        每次在线调用 <b>/setu/v2</b> 消耗 <b>{{ COST_PER_CALL }}</b> 积分 · 登录每日可领 <b>1000</b> 积分
      </p>
    </div>

    <div class="layout">
      <!-- 左侧：积分 + 调用表单 -->
      <div class="left">
        <n-card class="glass-card side-card" :bordered="false">
          <div class="side-header">
            <div class="side-title">
              当前积分
              <n-tag size="small" round :bordered="false" type="info">
                <span v-if="!pointsLoading">{{ points }}</span>
                <span v-else>...</span>
              </n-tag>
            </div>

            <div class="side-header-actions">
              <n-button size="small" secondary @click="refreshAll">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                刷新
              </n-button>
              <n-button size="small" secondary @click="router.push('/dashboard/points-logs')">
                <template #icon><n-icon><ReceiptOutline /></n-icon></template>
                流水
              </n-button>
            </div>
          </div>

          <n-tag
            v-if="!pointsLoading && !canCall"
            type="warning"
            round
            :bordered="false"
            style="margin-bottom: 10px;"
          >
            积分不足：至少需要 {{ COST_PER_CALL }} 才能调用
          </n-tag>

          <div class="form">
            <div class="form-row">
              <div class="label">R18</div>
              <n-select v-model:value="form.r18" :options="r18Options" />
            </div>

            <div class="form-row">
              <div class="label">返回数量</div>
              <n-input-number v-model:value="form.num" :min="1" :max="10" />
            </div>

            <div class="form-row">
              <div class="label">关键词</div>
              <n-input v-model:value="form.keyword" placeholder="可选：keyword" />
            </div>

            <div class="form-row">
              <div class="label">
                标签（逗号分隔）
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-icon size="16" style="margin-left: 6px; opacity: .7;"><SearchOutline /></n-icon>
                  </template>
                  例如：萝莉,白丝,金发
                </n-tooltip>
              </div>
              <n-input v-model:value="form.tagText" placeholder="tag1,tag2,tag3" />
            </div>

            <div class="form-row">
              <div class="label">尺寸 size</div>
              <n-select v-model:value="form.size" :options="sizeOptions" />
            </div>

            <div class="form-row switch-row">
              <div class="label">排除 AI</div>
              <n-switch v-model:value="form.excludeAI" />
            </div>

            <div class="form-row">
              <div class="label">proxy（可选）</div>
              <n-input v-model:value="form.proxy" placeholder="例如：https://i.pixiv.re" />
            </div>

            <div class="form-row">
              <div class="label">aspectRatio（可选）</div>
              <n-input v-model:value="form.aspectRatio" placeholder="例如：1:1 / 9:16" />
            </div>

            <n-divider />

            <n-button
              type="primary"
              color="#8b5cf6"
              :loading="calling"
              :disabled="!canCall"
              @click="callSetu"
              block
            >
              <template #icon><n-icon><FlashOutline /></n-icon></template>
              立即调用（消耗 {{ COST_PER_CALL }} 积分）
            </n-button>
          </div>
        </n-card>
      </div>

      <!-- 右侧：结果展示（点击图片可预览大图） -->
      <div class="right">
        <n-card class="glass-card right-card" :bordered="false">
          <div class="right-title">
            <div class="rt">
              <n-icon><ImageOutline /></n-icon>
              <span>返回结果（点击图片预览）</span>
            </div>
            <n-tag size="small" round :bordered="false" type="info">{{ results.length }}</n-tag>
          </div>

          <div v-if="resultLoading" class="loading-grid">
            <div v-for="n in 8" :key="n" class="skeleton-card">
              <n-skeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
            </div>
          </div>

          <div v-else-if="!results.length" class="empty-box">
            <n-empty description="还没有调用结果" size="large">
              <template #icon><n-icon><ImageOutline /></n-icon></template>
            </n-empty>
          </div>

          <n-image-group v-else>
            <div class="gallery-grid">
              <div v-for="it in results" :key="`${it.pid}-${it.p}`" class="img-card glass-card">
                <div class="img-box">
                  <!-- ✅ 点击图片直接预览（preview-src 用更大图） -->
                  <n-image
                    lazy
                    :src="pickCoverSrc(it)"
                    :preview-src="pickPreviewSrc(it)"
                    object-fit="cover"
                    class="img"
                    :img-props="{ referrerpolicy: 'no-referrer' }"
                  />

                  <!-- ✅ 右下角动作区（stop 防止触发预览） -->
                  <div class="corner-actions">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-button
                          circle
                          color="#fff"
                          class="action-btn"
                          @click.stop="openOriginal(pickOriginalSrc(it))"
                        >
                          <template #icon><n-icon color="#333"><EyeOutline /></n-icon></template>
                        </n-button>
                      </template>
                      查看原图
                    </n-tooltip>

                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-button
                          circle
                          color="#fff"
                          class="action-btn"
                          @click.stop="downloadOriginal(pickOriginalSrc(it))"
                        >
                          <template #icon><n-icon color="#333"><DownloadOutline /></n-icon></template>
                        </n-button>
                      </template>
                      原图下载
                    </n-tooltip>

                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-button
                          circle
                          color="#8b5cf6"
                          class="action-btn"
                          @click.stop="openFav(it)"
                        >
                          <template #icon><n-icon color="#fff"><HeartOutline /></n-icon></template>
                        </n-button>
                      </template>
                      收藏到收藏夹
                    </n-tooltip>
                  </div>

                  <div class="badges">
                    <n-tag v-if="it.r18 === true || it.r18 === 1" type="error" size="tiny" round class="badge">R-18</n-tag>
                    <n-tag v-if="Number(it.p) > 0" type="warning" size="tiny" round class="badge">P{{ it.p }}</n-tag>
                  </div>
                </div>

                <div class="info-box">
                  <div class="img-title" :title="it.title || ''">{{ it.title || '无标题' }}</div>

                  <div class="img-meta">
                    <div class="author">
                      <n-icon><PersonOutline /></n-icon>
                      <span>{{ it.author || '未知画师' }}</span>
                    </div>
                    <span class="pid">ID: {{ it.pid }}</span>
                  </div>

                  <!-- ✅ 标签展示 -->
                  <div v-if="Array.isArray(it.tags) && it.tags.length" class="tag-row">
                    <div class="tag-row-title">
                      <n-icon size="14" style="opacity:.75;"><PricetagOutline /></n-icon>
                      <span>标签</span>
                    </div>
                    <div class="tags">
                      <n-tag
                        v-for="t in visibleTags(it)"
                        :key="t"
                        size="small"
                        round
                        :bordered="false"
                        type="info"
                        class="tag"
                      >
                        {{ t }}
                      </n-tag>

                      <n-tag
                        v-if="hiddenTagCount(it) > 0"
                        size="small"
                        round
                        :bordered="false"
                        type="default"
                        class="tag more"
                      >
                        +{{ hiddenTagCount(it) }}
                      </n-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </n-image-group>
        </n-card>
      </div>
    </div>

    <!-- ✅ 收藏弹窗：选择收藏夹 -->
    <n-modal v-model:show="favModal" preset="card" title="收藏到收藏夹" :style="{ width: '520px', maxWidth: '92vw' }">
      <n-space vertical size="large">
        <n-tag round :bordered="false" type="info">
          <n-icon style="margin-right:6px;"><FolderOpenOutline /></n-icon>
          选择一个收藏夹保存
        </n-tag>

        <div class="form-row">
          <div class="label">收藏夹</div>
          <n-select
            v-model:value="favSelectedId"
            :options="favCollections.map(c => ({
              label: c.isDefault ? `⭐ ${c.name}` : c.name,
              value: c.id
            }))"
            placeholder="请选择收藏夹"
          />
        </div>

        <div class="modal-actions">
          <n-button quaternary @click="favModal = false">取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="favLoading" @click="submitFav">
            确认收藏
          </n-button>
        </div>
      </n-space>
    </n-modal>
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
  gap: 20px;
}

.header-section { text-align: center; }
.title { font-size: 32px; font-weight: 800; color: #1f2937; margin: 0; }
.subtitle { color: #6b7280; margin-top: 8px; font-size: 15px; }

.layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr; }
}

.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
}

.side-card { border-radius: 16px; }
.right-card { border-radius: 16px; }

.side-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.side-title {
  font-size: 16px;
  font-weight: 800;
  display: flex;
  gap: 10px;
  align-items: center;
}
.side-header-actions{
  display:flex;
  gap:10px;
}

.form { display: flex; flex-direction: column; gap: 12px; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; color: #6b7280; font-weight: 600; }
.switch-row { flex-direction: row; justify-content: space-between; align-items: center; }

.right-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.rt {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  color: #374151;
}

/* loading */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 18px;
}
.skeleton-card {
  aspect-ratio: 2 / 3;
  border-radius: 16px;
  overflow: hidden;
}

/* empty */
.empty-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
}

/* gallery */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}

.img-card{
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(0,0,0,0.05);
}
.img-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.1);
  z-index: 2;
}

.img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  background: #f3f4f6;
  overflow: hidden;
}

.img { width: 100%; height: 100%; display: block; }
:deep(.img img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
  cursor: zoom-in;
}
.img-card:hover :deep(.img img) { transform: scale(1.06); }

/* actions */
.corner-actions{
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 10px;
  z-index: 3;
}
.action-btn { box-shadow: 0 6px 14px rgba(0,0,0,0.22); transition: transform 0.2s; }
.action-btn:hover { transform: scale(1.08); }

/* badges */
.badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  pointer-events: none;
  z-index: 3;
}
.badge { font-weight: 700; opacity: 0.92; backdrop-filter: blur(4px); }

/* info */
.info-box { padding: 12px 16px 16px; }
.img-title {
  font-size: 15px;
  font-weight: 800;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}
.img-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 10px;
}
.author { display: flex; align-items: center; gap: 4px; max-width: 60%; }
.author span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pid {
  font-family: monospace;
  font-size: 11px;
  opacity: 0.7;
  background: rgba(0,0,0,0.05);
  padding: 2px 6px;
  border-radius: 8px;
}

/* tags */
.tag-row{
  display:flex;
  flex-direction: column;
  gap: 8px;
}
.tag-row-title{
  display:flex;
  align-items:center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 700;
}
.tags{
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag{
  max-width: 100%;
}
.more{
  opacity:.8;
}

/* modal */
.modal-actions{
  display:flex;
  justify-content:flex-end;
  gap:10px;
}

@media (max-width: 640px) {
  .page-container { padding: 20px 10px; }
  .title { font-size: 24px; }
  .gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .side-header-actions{ flex-direction: row; }
}
</style>
