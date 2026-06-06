<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, shallowRef } from 'vue'
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
  PricetagOutline,
  TrashOutline
} from '@vicons/ionicons5'

import { useRouter } from 'vue-router'
import http from '@/api/http'
import { getMyPoints } from '@/api/points'
import { addFavorite } from '@/api/favorite'
import { listMyCollections, addToCollection } from '@/api/collections'
import { useAuthStore } from '@/stores/auth'
import ImageDeleteSubmitModal from '@/components/ImageDeleteSubmitModal.vue'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useRequestGuard } from '@/composables/useRequestGuard'

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()
const pointsGuard = useRequestGuard()
const callGuard = useRequestGuard()
const collectionsGuard = useRequestGuard()
const { isMobile } = useBreakpoint()

// ✅ 管理员检测（role === 1）
const isAdmin = computed(() => auth.user?.role === 1)

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
  refreshAll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})

// =======================
// ✨ 点击火花效果（ClickSpark）
// =======================
const createClickSpark = (event: MouseEvent) => {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion || isMobile.value) return

  const x = event.clientX
  const y = event.clientY
  
  // 创建多个火花粒子
  for (let i = 0; i < 8; i++) {
    const spark = document.createElement('div')
    spark.className = 'click-spark'
    spark.style.left = `${x}px`
    spark.style.top = `${y}px`
    
    // 随机角度
    const angle = (Math.PI * 2 * i) / 8
    const velocity = 50 + Math.random() * 50
    spark.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`)
    spark.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`)
    
    document.body.appendChild(spark)
    
    setTimeout(() => spark.remove(), 600)
  }
}

// =======================
// 💫 积分数字滚动动画（CountUp）
// =======================
const animatePoints = (newValue: number) => {
  const oldValue = points.value
  const duration = 1000
  const startTime = performance.now()
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 缓动函数
    const easeOutQuad = (t: number) => t * (2 - t)
    const current = Math.floor(oldValue + (newValue - oldValue) * easeOutQuad(progress))
    
    points.value = current
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      points.value = newValue
    }
  }
  
  requestAnimationFrame(animate)
}

// =======================
// 页面状态：积分 + 结果
// =======================
const pointsLoading = ref(false)
const points = ref<number>(0)

const calling = ref(false)
const resultLoading = ref(false)
const results = shallowRef<any[]>([])

// 每次调用扣 20（前端只展示，真实扣费由后端决定）
const COST_PER_CALL = 20
// ✅ 管理员无需积分限制
const canCall = computed(() => isAdmin.value || points.value >= COST_PER_CALL)

// =======================
// Setu 调用表单
// =======================
const form = reactive({
  r18: 0 as 0 | 1 | 2,
  num: 1,
  keyword: '',
  tagText: '',
  size: 'regular' as 'original' | 'regular' | 'small',
  excludeAI: true
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
  const requestId = pointsGuard.next()
  pointsLoading.value = true
  try {
    const res: any = await getMyPoints()
    if (!pointsGuard.isCurrent(requestId)) return

    const data = unwrapApiData<any>(res, {})
    const newPoints = Number(data.points ?? 0)
    
    // ✅ 使用数字滚动动画
    if (points.value !== newPoints) {
      animatePoints(newPoints)
    } else {
      points.value = newPoints
    }
  } catch (e) {
    if (!pointsGuard.isCurrent(requestId)) return
    message.error('获取积分失败（请确认 /points/me + 前端带 Authorization）')
  } finally {
    if (pointsGuard.isCurrent(requestId)) pointsLoading.value = false
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

  const requestId = callGuard.next()
  calling.value = true
  resultLoading.value = true
  results.value = []

  try {
    const sp = new URLSearchParams()
    sp.set('r18', String(form.r18))
    sp.set('num', String(form.num))

    if (form.keyword?.trim()) sp.set('keyword', form.keyword.trim())
    if (form.excludeAI) sp.set('excludeAI', 'true')

    // ✅ List<String> tag / size：用重复 key
    parsedTags.value.forEach(t => sp.append('tag', t))
    sp.append('size', form.size)

    const res: any = await http.get('/setu/v2', { params: sp })
    if (!callGuard.isCurrent(requestId)) return

    const payload = res?.data || {}
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
    if (!callGuard.isCurrent(requestId)) return
    message.error(e?.response?.data?.msg || e?.message || '调用失败')
    await refreshAll()
  } finally {
    if (callGuard.isCurrent(requestId)) {
      calling.value = false
      resultLoading.value = false
    }
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
 * ✅ 使用代理服务器下载图片
 */
// 会话内是否跳过代理确认
const skipProxyConfirm = ref(false)
// 下载弹窗状态
const downloadModalVisible = ref(false)
const pendingDownloadUrl = ref('')
const pendingDownloadFilename = ref('')

const downloadOriginal = (url?: string | null, it?: any) => {
  if (!url) return message.warning('下载链接为空')
  
  // 生成文件名：pid_p_标题.jpg
  const pid = it?.pid || 'image'
  const p = it?.p ?? 0
  const title = it?.title || ''
  const filename = title ? `${pid}_p${p}_${title}.jpg` : `${pid}_p${p}.jpg`
  
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
// ✅ 申请删除图片
// =======================
const deleteRequestModalVisible = ref(false)
const deleteRequestImageData = ref<{
  pid: number
  p: number
  title?: string
  author?: string
  thumbnailUrl?: string
} | null>(null)

const openDeleteRequest = (it: any) => {
  deleteRequestImageData.value = {
    pid: it.pid,
    p: it.p ?? 0,
    title: it.title,
    author: it.author,
    thumbnailUrl: pickCoverSrc(it)
  }
  deleteRequestModalVisible.value = true
}

const onDeleteRequestSuccess = () => {
  message.success('申请已提交，请在"我的删除申请"中查看进度')
}

// =======================
// ✅ 收藏：选择收藏夹
// 默认收藏夹走 /favorite/{pid}/{p}
// 非默认走 /collections/{id}/items/{pid}/{p}
// =======================
type Collection = { id: number; name: string; isDefault: boolean; visibility: number }
const favModal = ref(false)
const favLoading = ref(false)
const favCollections = shallowRef<Collection[]>([])
const favSelectedId = ref<number | null>(null)
const favTarget = ref<any | null>(null)

const loadCollectionsOnce = async () => {
  if (favCollections.value.length) return
  const requestId = collectionsGuard.next()
  const res: any = await listMyCollections()
  if (!collectionsGuard.isCurrent(requestId)) return

  const arr = unwrapApiList<any>(res)
  favCollections.value = arr.map((c: any) => ({
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

// =======================
// 初始化
// =======================
// onMounted 已经在上面定义了，不需要重复
</script>

<template>
  <div class="page-container ui-page">
    <!-- ✅ 滚动进度条 -->
    <div class="scroll-progress-bar">
      <div class="scroll-progress-fill" :style="{ width: scrollProgress + '%' }"></div>
    </div>

    <div class="header-section ui-page-header">
      <div>
        <h2 class="title ui-page-title">积分调用</h2>
        <p class="subtitle ui-page-subtitle">
        每次调用 <b>/setu/v2</b> 消耗 <b>{{ COST_PER_CALL }}</b> 积分 · 每日登录可领 <b>1000</b> 积分
        </p>
      </div>
    </div>

    <div class="points-overview">
      <div class="overview-item ui-card">
        <div class="overview-label">当前积分</div>
        <div class="overview-value">
          <span v-if="isAdmin">∞</span>
          <span v-else-if="!pointsLoading">{{ points }}</span>
          <span v-else>...</span>
        </div>
      </div>
      <div class="overview-item ui-card">
        <div class="overview-label">单次消耗</div>
        <div class="overview-value small">{{ isAdmin ? '免扣费' : `${COST_PER_CALL} 积分` }}</div>
      </div>
      <div class="overview-item ui-card">
        <div class="overview-label">本次结果</div>
        <div class="overview-value small">{{ results.length }} 张</div>
      </div>
    </div>

    <div class="layout">
      <!-- 左侧：积分 + 调用表单 -->
      <div class="left">
        <n-card class="glass-card ui-card side-card" :bordered="false">
          <div class="side-header">
            <div class="side-title">
              当前积分
              <n-tag size="small" round :bordered="false" :type="isAdmin ? 'success' : 'info'" class="points-tag">
                <!-- ✅ 管理员显示无限符号 -->
                <span v-if="isAdmin" class="points-number infinity">∞</span>
                <span v-else-if="!pointsLoading" class="points-number">{{ points }}</span>
                <span v-else>...</span>
              </n-tag>
              <n-tag v-if="isAdmin" size="tiny" round type="warning" style="margin-left: 8px;">管理员</n-tag>
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

          <!-- ✅ 管理员不显示积分不足提示 -->
          <n-tag
            v-if="!isAdmin && !pointsLoading && !canCall"
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

            <n-divider />

            <!-- ✅ 磁性按钮 + 点击火花 -->
            <div class="magnetic-button-wrapper">
              <n-button
                type="primary"
                color="#f586a9"
                :loading="calling"
                :disabled="!canCall"
                @click="(e) => { createClickSpark(e); callSetu(); }"
                class="call-button"
                block
              >
                <template #icon><n-icon><FlashOutline /></n-icon></template>
                立即调用（消耗 {{ COST_PER_CALL }} 积分）
              </n-button>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右侧：结果展示（点击图片可预览大图） -->
      <div class="right">
        <n-card class="glass-card ui-card right-card" :bordered="false">
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
              <div v-for="it in results" :key="`${it.pid}-${it.p}`" class="img-card ui-card">
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
                          @click.stop="downloadOriginal(pickOriginalSrc(it), it)"
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
                          color="#f586a9"
                          class="action-btn"
                          @click.stop="openFav(it)"
                        >
                          <template #icon><n-icon color="#fff"><HeartOutline /></n-icon></template>
                        </n-button>
                      </template>
                      收藏到收藏夹
                    </n-tooltip>

                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-button
                          circle
                          color="#ef4444"
                          class="action-btn"
                          @click.stop="openDeleteRequest(it)"
                        >
                          <template #icon><n-icon color="#fff"><TrashOutline /></n-icon></template>
                        </n-button>
                      </template>
                      申请删除图片
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
          <n-button type="primary" color="#f586a9" :loading="favLoading" @click="submitFav">
            确认收藏
          </n-button>
        </div>
      </n-space>
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

    <!-- 申请删除图片弹窗 -->
    <ImageDeleteSubmitModal
      v-model:show="deleteRequestModalVisible"
      :imageData="deleteRequestImageData"
      @success="onDeleteRequestSuccess"
    />
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

/* ======================
   ✨ 点击火花效果（ClickSpark）
   ====================== */
.click-spark {
  position: fixed;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffd700, #ff69b4, transparent);
  pointer-events: none;
  z-index: 9999;
  animation: spark-fly 0.6s ease-out forwards;
}

@keyframes spark-fly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}

/* ======================
   🧲 磁性按钮效果（MagneticButton）
   ====================== */
.magnetic-button-wrapper {
  position: relative;
  padding: 4px;
}

.call-button {
  position: relative;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-weight: 700;
  font-size: 15px;
  height: 48px !important;
  border-radius: 12px !important;
  overflow: visible !important;
}

.call-button:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 8px 32px rgba(245, 134, 169, 0.4),
              0 0 0 4px rgba(245, 134, 169, 0.1);
}

.call-button:not(:disabled):active {
  transform: scale(0.98);
}

/* ======================
   💫 积分数字滚动效果（CountUp）
   ====================== */
.points-tag {
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.15), rgba(252, 165, 200, 0.15)) !important;
  border: 1px solid rgba(245, 134, 169, 0.3) !important;
  padding: 6px 14px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 8px rgba(245, 134, 169, 0.2);
  transition: all 0.3s ease;
}

.points-number {
  background: linear-gradient(135deg, #f586a9, #ff69b4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 18px;
  font-weight: 900;
  display: inline-block;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

/* ✅ 管理员无限符号样式 */
.points-number.infinity {
  font-size: 22px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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
}

.title { 
  margin: 0;
}

.subtitle { 
  margin-top: 8px;
}

.points-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.overview-item {
  padding: 18px 20px;
  min-height: 104px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.overview-label {
  color: var(--ui-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.overview-value {
  color: var(--ui-primary-hover);
  font-size: 32px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.overview-value.small {
  color: var(--ui-text);
  font-size: 24px;
}

.layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr; }
  .points-overview { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.glass-card {
  border-radius: var(--ui-radius-xl) !important;
}

.side-card { 
  position: sticky;
  top: 20px;
}

.right-card { 
  overflow: hidden;
}

.side-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ui-border-subtle);
}

.side-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--ui-text);
  display: flex;
  gap: 12px;
  align-items: center;
}

.side-header-actions{
  display: flex;
  gap: 10px;
}

.form { 
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row { 
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label { 
  font-size: 13px;
  color: #475569;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.switch-row { 
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(245, 134, 169, 0.08);
  border: 1px solid rgba(245, 134, 169, 0.12);
  border-radius: 12px;
}

.right-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ui-border-subtle);
}

.rt {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 18px;
  color: var(--ui-text);
}

/* loading */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.skeleton-card {
  aspect-ratio: 2 / 3;
  border-radius: 20px;
  overflow: hidden;
}

/* empty */
.empty-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* gallery */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.img-card {
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.26s ease, box-shadow 0.26s ease, border-color 0.26s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  
  /* ✅ 入场动画 */
  animation: fadeInUp 0.6s ease-out both;
}

/* 入场动画延迟 */
.img-card:nth-child(1) { animation-delay: 0.05s; }
.img-card:nth-child(2) { animation-delay: 0.1s; }
.img-card:nth-child(3) { animation-delay: 0.15s; }
.img-card:nth-child(4) { animation-delay: 0.2s; }
.img-card:nth-child(5) { animation-delay: 0.25s; }
.img-card:nth-child(6) { animation-delay: 0.3s; }

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

.img-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.4), rgba(252, 165, 200, 0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
  z-index: 1;
}

.img-card:hover::before {
  opacity: 1;
}

.img-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 50px rgba(31, 41, 55, 0.12), 0 16px 34px rgba(245, 134, 169, 0.12);
  border-color: rgba(245, 134, 169, 0.22);
  z-index: 10;
}

.img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  overflow: hidden;
  flex-shrink: 0;
}

.img { 
  width: 100%;
  height: 100%;
  display: block;
}

:deep(.img img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  cursor: zoom-in;
}

.img-card:hover :deep(.img img) { 
  transform: scale(1.05);
}

/* actions */
.corner-actions {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 10px;
  z-index: 3;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn { 
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 40px;
  height: 40px;
}

.action-btn:hover { 
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* badges */
.badges {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  pointer-events: none;
  z-index: 3;
}

.badge { 
  font-weight: 800;
  opacity: 0.95;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* info */
.info-box { 
  padding: 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.img-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ui-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.img-card:hover .img-title {
  color: #f586a9;
}

.img-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.author { 
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 60%;
}

.author span { 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pid {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.75;
  background: rgba(245, 134, 169, 0.1);
  color: #f586a9;
  padding: 4px 8px;
  border-radius: 10px;
}

/* tags */
.tag-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.tag-row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 800;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  max-width: 100%;
  font-weight: 600;
}

.more {
  opacity: 0.7;
}

/* modal */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .page-container { 
    gap: 24px;
  }

  .points-overview {
    grid-template-columns: 1fr;
  }
  
  .layout {
    gap: 20px;
  }
  
  .side-card {
    position: static;
  }
  
  .gallery-grid { 
    grid-template-columns: 1fr;
    gap: 16px;
    max-width: 500px;
    margin: 0 auto;
  }
  
  .img-card {
    max-width: 100%;
    border-radius: 16px;
  }
  
  .img-card:hover {
    transform: translateY(-6px) scale(1.01);
  }
  
  .corner-actions {
    right: 10px;
    bottom: 10px;
    gap: 8px;
  }
  
  .action-btn {
    width: 42px;
    height: 42px;
  }
  
  .side-header-actions { 
    flex-direction: row;
  }
  
  .info-box {
    padding: 14px 16px 16px;
  }
  
  .img-title {
    font-size: 15px;
  }
  
  .img-meta {
    font-size: 12px;
  }
  
  .tags {
    gap: 6px;
  }
  
  .img-box {
    aspect-ratio: 2 / 3;
    min-height: 400px;
  }
}

/* 下载弹窗样式 */
.download-modal-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
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
