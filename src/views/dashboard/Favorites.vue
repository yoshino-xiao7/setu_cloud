<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  NPopconfirm,
  NSkeleton,
  NTag,
  useMessage,
  NEmpty,
  NImage,
  NButton,
  NIcon,
  NPagination,
  NCard,
  NModal,
  NInput,
  NSpace,
  NRadioGroup,
  NRadio,
  NTooltip
} from 'naive-ui'
import {
  HeartDislikeOutline,
  EyeOutline,
  ImageOutline,
  PersonOutline,
  AddOutline,
  SettingsOutline,
  TrashOutline,
  LockClosedOutline,
  GlobeOutline,
  ShareSocialOutline,
  CopyOutline,
  OpenOutline
} from '@vicons/ionicons5'

import { useRouter } from 'vue-router'
const router = useRouter()

import { getFavoriteList, removeFavorite } from '@/api/favorite'
import {
  listMyCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionItems,
  removeFromCollection
} from '@/api/collections'

const message = useMessage()

// =======================
// 工具：兼容 http.ts 是否解包
// =======================
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

// =======================
// 类型
// =======================
type Collection = {
  id: number
  name: string
  description?: string
  visibility: number // 0私有 1公开
  isDefault: boolean
}

interface FavItem {
  favId: number
  pid: number
  p: number
  title: string
  author: string
  url: string
  originalUrl: string
  width: number
  height: number
  r18: boolean
}

// =======================
// 左侧：收藏夹列表
// =======================
const colLoading = ref(false)
const collections = ref<Collection[]>([])
const selectedCollectionId = ref<number | null>(null)

const selectedCollection = computed(() => {
  if (!selectedCollectionId.value) return null
  return collections.value.find(c => c.id === selectedCollectionId.value) || null
})

const selectedIsDefault = computed(() => !!selectedCollection.value?.isDefault)

const fetchCollections = async () => {
  colLoading.value = true
  try {
    const res: any = await listMyCollections()
    const arr = unwrap(res) || []
    collections.value = (Array.isArray(arr) ? arr : []).map((c: any) => ({
      id: Number(c.id),
      name: c.name,
      description: c.description || '',
      visibility: Number(c.visibility ?? 0),
      isDefault: !!c.isDefault
    }))

    // 默认选中默认收藏夹
    if (!selectedCollectionId.value) {
      const def = collections.value.find(x => x.isDefault)
      selectedCollectionId.value = def?.id ?? (collections.value[0]?.id ?? null)
    } else {
      const still = collections.value.some(x => x.id === selectedCollectionId.value)
      if (!still) {
        const def = collections.value.find(x => x.isDefault)
        selectedCollectionId.value = def?.id ?? (collections.value[0]?.id ?? null)
      }
    }
  } catch (e) {
    message.error('加载收藏夹失败（请确认 /collections/mine 正常）')
    console.error(e)
  } finally {
    colLoading.value = false
  }
}

// =======================
// 右侧：当前收藏夹图片列表（分页）
// =======================
const loading = ref(true)
const list = ref<FavItem[]>([])
const pagination = reactive({
  page: 1,
  size: 24,
  total: 0
})

const fetchItems = async () => {
  if (!selectedCollectionId.value) return
  loading.value = true
  try {
    // ✅ 默认收藏夹：沿用你原 /favorite/list
    if (selectedIsDefault.value) {
      const res: any = await getFavoriteList({ page: pagination.page, size: pagination.size })
      const data = unwrap(res) || {}
      const items = data.items || data.records || []
      pagination.total = data.total || 0

      list.value = items.map((r: any) => {
        const img = r.image || {}
        return {
          favId: r.itemId ?? r.favoriteId ?? 0,
          pid: r.pid ?? img.pid,
          p: r.p ?? img.p ?? 0,
          title: img.title || '无标题',
          author: img.author || '未知画师',
          url: img.urlRegular || img.urlSmall || img.urlOriginal || '',
          originalUrl: img.urlOriginal || '',
          width: img.width || 0,
          height: img.height || 0,
          r18: Number(img.r18) === 1
        }
      })
      return
    }

    // ✅ 非默认收藏夹：走 collections items（注意 image 在 r.image）
    const res: any = await getCollectionItems(selectedCollectionId.value, {
      page: pagination.page,
      size: pagination.size
    })
    const data = unwrap(res) || {}
    const items = data.items || data.records || []
    pagination.total = data.total || 0

    list.value = items.map((r: any) => {
      const img = r.image || {}
      return {
        favId: r.itemId ?? 0,
        pid: r.pid ?? img.pid,
        p: r.p ?? img.p ?? 0,
        title: img.title || '无标题',
        author: img.author || '未知画师',
        url: img.urlRegular || img.urlSmall || img.urlOriginal || '',
        originalUrl: img.urlOriginal || '',
        width: img.width || 0,
        height: img.height || 0,
        r18: Number(img.r18) === 1
      }
    })
  } catch (e) {
    message.error('加载收藏内容失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await fetchCollections()
  pagination.page = 1
  await fetchItems()
}

// 翻页
const handlePageChange = (page: number) => {
  pagination.page = page
  fetchItems()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 查看原图
const handleViewOriginal = (url: string) => {
  if (url) window.open(url, '_blank')
  else message.warning('原图链接无效')
}

// 在当前收藏夹移除图片
const handleRemoveFromCurrent = async (item: FavItem) => {
  if (!selectedCollectionId.value) return
  try {
    if (selectedIsDefault.value) {
      await removeFavorite(item.pid, item.p)
    } else {
      await removeFromCollection(selectedCollectionId.value, item.pid, item.p)
    }

    message.success('已移除')
    list.value = list.value.filter(i => !(i.pid === item.pid && i.p === item.p))

    if (list.value.length === 0 && pagination.page > 1) {
      handlePageChange(pagination.page - 1)
    } else {
      pagination.total = Math.max(0, pagination.total - 1)
    }
  } catch (e) {
    message.error('操作失败')
  }
}

// 切换收藏夹
const selectCollection = async (id: number) => {
  if (selectedCollectionId.value === id) return
  selectedCollectionId.value = id
  pagination.page = 1
  await fetchItems()
}

// =======================
// 新建 / 编辑 / 删除 收藏夹
// =======================
const showCreate = ref(false)
const showEdit = ref(false)

const createForm = ref({ name: '', visibility: 0 as 0 | 1 })
const editForm = ref({ id: 0, name: '', visibility: 0 as 0 | 1 })

const saving = ref(false)

const openCreate = () => {
  createForm.value = { name: '', visibility: 0 }
  showCreate.value = true
}

const submitCreate = async () => {
  const name = createForm.value.name.trim()
  if (!name) return message.warning('请输入收藏夹名称')
  saving.value = true
  try {
    await createCollection({ name, description: '', visibility: createForm.value.visibility })
    message.success('创建成功')
    showCreate.value = false
    await fetchCollections()
  } catch (e) {
    message.error('创建失败')
  } finally {
    saving.value = false
  }
}

const openEdit = () => {
  const c = selectedCollection.value
  if (!c) return
  editForm.value = { id: c.id, name: c.name, visibility: (c.visibility as 0 | 1) }
  showEdit.value = true
}

const submitEdit = async () => {
  const name = editForm.value.name.trim()
  if (!name) return message.warning('请输入收藏夹名称')
  saving.value = true
  try {
    await updateCollection(editForm.value.id, { name, description: '', visibility: editForm.value.visibility })
    message.success('保存成功')
    showEdit.value = false
    await fetchCollections()
  } catch (e) {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleDeleteCollection = async () => {
  const c = selectedCollection.value
  if (!c) return
  if (c.isDefault) return message.warning('默认收藏夹不可删除')
  saving.value = true
  try {
    await deleteCollection(c.id)
    message.success('已删除收藏夹')
    selectedCollectionId.value = null
    await refreshAll()
  } catch (e) {
    message.error('删除失败')
  } finally {
    saving.value = false
  }
}

// =======================
// ✅ 分享（新增）
// =======================
const showShare = ref(false)
const shareUrl = computed(() => {
  const c = selectedCollection.value
  if (!c?.id) return ''

  // ✅ 用路由生成 href（会自动带上 BASE_URL / 子目录）
  const href = router.resolve({
    name: 'PublicCollection',  // 你的路由里 /c/:id 的 name
    params: { id: c.id }
  }).href

  // ✅ 变成绝对链接
  return new URL(href, window.location.origin).toString()
})

const canShare = computed(() => {
  const c = selectedCollection.value
  return !!c && !c.isDefault && Number(c.visibility) === 1
})

const openShare = () => {
  if (!canShare.value) {
    message.warning('只能分享“公开”的非默认收藏夹（先在编辑里改为公开）')
    return
  }
  showShare.value = true
}


const copyShare = async () => {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    message.success('分享链接已复制')
  } catch {
    message.error('复制失败，请手动复制链接')
  }
}

const openShareLink = () => {
  if (!shareUrl.value) return
  window.open(shareUrl.value, '_blank')
}

onMounted(async () => {
  await fetchCollections()
  await fetchItems()
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <h2 class="title">我的收藏</h2>
      <p class="subtitle">
        当前收藏夹：
        <b>{{ selectedCollection?.name || '-' }}</b>
        <span class="dot">·</span>
        共 {{ pagination.total }} 张作品
      </p>
    </div>

    <div class="layout">
      <!-- 左侧：收藏夹列表 -->
      <div class="left">
        <n-card class="glass-card side-card" :bordered="false">
          <div class="side-header">
            <div class="side-title">
              收藏夹
              <n-tag size="small" round :bordered="false" type="info">{{ collections.length }}</n-tag>
            </div>
            <n-button size="small" secondary type="primary" color="#8b5cf6" @click="openCreate">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新建
            </n-button>
          </div>

          <div v-if="colLoading" class="side-loading">
            <n-skeleton v-for="i in 6" :key="i" height="34px" style="border-radius: 10px;" />
          </div>

          <div v-else class="col-list">
            <div
              v-for="c in collections"
              :key="c.id"
              class="col-item"
              :class="{ active: c.id === selectedCollectionId }"
              @click="selectCollection(c.id)"
            >
              <div class="col-name">
                <span class="star" v-if="c.isDefault">⭐</span>
                {{ c.name }}
              </div>
              <div class="col-meta">
                <n-icon v-if="c.visibility === 0" size="14"><LockClosedOutline /></n-icon>
                <n-icon v-else size="14"><GlobeOutline /></n-icon>
                <span class="meta-text">{{ c.visibility === 1 ? '公开' : '私有' }}</span>
              </div>
            </div>
          </div>

          <div class="side-actions" v-if="selectedCollection">
            <!-- ✅ 分享按钮（公开才允许） -->
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button size="small" secondary :disabled="!canShare" @click="openShare">
                  <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
                  分享
                </n-button>
              </template>
              <span v-if="canShare">复制公开链接给别人访问</span>
              <span v-else>私有收藏夹不可分享（先改为公开）</span>
            </n-tooltip>

            <n-button size="small" secondary @click="openEdit">
              <template #icon><n-icon><SettingsOutline /></n-icon></template>
              编辑
            </n-button>

            <n-popconfirm v-if="!selectedCollection.isDefault" @positive-click="handleDeleteCollection">
              <template #trigger>
                <n-button size="small" secondary type="error">
                  <template #icon><n-icon><TrashOutline /></n-icon></template>
                  删除
                </n-button>
              </template>
              确认删除收藏夹「{{ selectedCollection.name }}」吗？
            </n-popconfirm>

            <n-button v-else size="small" secondary disabled>默认收藏夹不可删除</n-button>
          </div>
        </n-card>
      </div>

      <!-- 右侧：图片内容 -->
      <div class="right">
        <div v-if="loading && list.length === 0" class="loading-grid">
          <div v-for="n in 12" :key="n" class="skeleton-card">
            <n-skeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
          </div>
        </div>

        <div v-else-if="!loading && list.length === 0" class="empty-box">
          <n-empty description="这个收藏夹是空的" size="large">
            <template #icon><n-icon><ImageOutline /></n-icon></template>
            <template #extra>
              <n-button type="primary" secondary @click="$router.push('/dashboard/docs')">去逛逛</n-button>
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

                    <n-popconfirm @positive-click="handleRemoveFromCurrent(item)">
                      <template #trigger>
                        <n-button circle color="#ef4444" class="action-btn del-btn">
                          <template #icon><n-icon color="#fff"><HeartDislikeOutline /></n-icon></template>
                        </n-button>
                      </template>
                      确认要从当前收藏夹移除这张图片吗？
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
    </div>

    <!-- ✅ 分享弹窗（新增） -->
    <n-modal v-model:show="showShare" preset="card" title="分享公开收藏夹" :style="{ width: '520px', maxWidth: '92vw' }">
      <n-space vertical size="large">
        <n-tag type="success" round :bordered="false">任何人打开这个链接都能查看该公开收藏夹</n-tag>

        <div>
          <div class="form-label">分享链接</div>
          <n-input :value="shareUrl" readonly />
        </div>

        <div class="share-actions">
          <n-button secondary @click="copyShare">
            <template #icon><n-icon><CopyOutline /></n-icon></template>
            复制链接
          </n-button>
          <n-button type="primary" color="#8b5cf6" @click="openShareLink">
            <template #icon><n-icon><OpenOutline /></n-icon></template>
            打开预览
          </n-button>
        </div>
      </n-space>
    </n-modal>

    <!-- 新建收藏夹 -->
    <n-modal v-model:show="showCreate" preset="card" title="新建收藏夹" :style="{ width: '420px' }">
      <n-space vertical size="large">
        <div>
          <div class="form-label">名称</div>
          <n-input v-model:value="createForm.name" placeholder="请输入收藏夹名称" />
        </div>

        <div>
          <div class="form-label">可见性</div>
          <n-radio-group v-model:value="createForm.visibility">
            <n-space>
              <n-radio :value="0">私有</n-radio>
              <n-radio :value="1">公开</n-radio>
            </n-space>
          </n-radio-group>
        </div>
      </n-space>

      <template #footer>
        <div class="modal-footer">
          <n-button quaternary @click="showCreate = false">取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="saving" @click="submitCreate">创建</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 编辑收藏夹 -->
    <n-modal v-model:show="showEdit" preset="card" title="编辑收藏夹" :style="{ width: '420px' }">
      <n-space vertical size="large">
        <n-tag v-if="selectedCollection?.isDefault" type="warning" round :bordered="false">
          默认收藏夹可编辑名称/可见性（如你后端允许），但不可删除
        </n-tag>

        <div>
          <div class="form-label">名称</div>
          <n-input v-model:value="editForm.name" placeholder="请输入收藏夹名称" />
        </div>

        <div>
          <div class="form-label">可见性</div>
          <n-radio-group v-model:value="editForm.visibility">
            <n-space>
              <n-radio :value="0">私有</n-radio>
              <n-radio :value="1">公开</n-radio>
            </n-space>
          </n-radio-group>
        </div>
      </n-space>

      <template #footer>
        <div class="modal-footer">
          <n-button quaternary @click="showEdit = false">取消</n-button>
          <n-button type="primary" color="#8b5cf6" :loading="saving" @click="submitEdit">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page-container {
  padding: 40px 20px 80px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 80vh;
  display: flex; flex-direction: column; gap: 20px;
}

.header-section { text-align: center; }
.title { font-size: 32px; font-weight: 800; color: #1f2937; margin: 0; }
.subtitle { color: #6b7280; margin-top: 8px; font-size: 15px; }
.dot { margin: 0 8px; opacity: .6; }

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
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
.side-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.side-title { font-size: 16px; font-weight: 800; display: flex; gap: 10px; align-items: center; }
.side-loading { display: flex; flex-direction: column; gap: 10px; }
.col-list { display: flex; flex-direction: column; gap: 10px; }

.col-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.45);
  border: 1px solid rgba(0,0,0,0.05);
  cursor: pointer;
  transition: all .2s ease;
  display: flex; align-items: center; justify-content: space-between;
}
.col-item:hover { transform: translateY(-2px); background: rgba(255,255,255,0.75); }
.col-item.active { border-color: rgba(139, 92, 246, 0.5); box-shadow: 0 8px 20px rgba(139,92,246,0.12); }

.col-name { font-weight: 700; color: #374151; display: flex; gap: 6px; align-items: center; }
.star { font-size: 14px; }
.col-meta { display: flex; gap: 6px; align-items: center; color: #6b7280; font-size: 12px; }
.meta-text { opacity: .9; }

.side-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}
.skeleton-card { aspect-ratio: 2 / 3; border-radius: 16px; overflow: hidden; }

.empty-box {
  display: flex; align-items: center; justify-content: center;
  min-height: 400px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.fav-card {
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex; flex-direction: column;
  position: relative;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.05);
}
.fav-card:hover { transform: translateY(-6px); box-shadow: 0 15px 30px rgba(0,0,0,0.1); z-index: 2; }

.img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  background: #f3f4f6;
  overflow: hidden;
}
.fav-img { width: 100%; height: 100%; display: block; }
:deep(.fav-img img) { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.fav-card:hover :deep(.fav-img img) { transform: scale(1.08); }

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

.badges { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; pointer-events: none; }
.badge { font-weight: 700; opacity: 0.9; backdrop-filter: blur(4px); }

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

.pagination-box { display: flex; justify-content: center; margin-top: 20px; }

.form-label { font-size: 13px; color: #6b7280; margin-bottom: 6px; font-weight: 600; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; }

.share-actions { display: flex; gap: 10px; justify-content: flex-end; }

@media (max-width: 640px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .page-container { padding: 20px 10px; }
  .title { font-size: 24px; }
  .share-actions { justify-content: stretch; }
  .share-actions :deep(.n-button) { flex: 1; }
}
</style>
