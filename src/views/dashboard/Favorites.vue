<script setup lang="ts">
import type { CollectionInfoDTO, CollectionItemDTO, CollectionItemPageDTO } from '@/api/collections'
import type { FavoriteItemDTO, FavoritePageDTO } from '@/api/favorite'
import {
  AddOutline,
  CloseCircleOutline,
  CopyOutline,
  EyeOutline,
  GlobeOutline,
  HeartDislikeOutline,
  ImageOutline,
  ImagesOutline, // ✅ 新增：设置封面图标
  LockClosedOutline,
  OpenOutline,
  PersonOutline,
  RocketOutline,
  SettingsOutline,
  ShareSocialOutline,
  SwapHorizontalOutline,
  TrashOutline
} from '@vicons/ionicons5'

import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NRadio,
  NRadioGroup,
  NSelect,
  NSkeleton,
  NSpace,
  NTag,
  NTooltip,
  useMessage
} from 'naive-ui'

import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import {
  addToCollection,
  createCollection,
  deleteCollection,
  getCollectionItems,
  listMyCollections,
  removeFromCollection,
  setCover, // ✅ 新增：设置封面
  shareToSquare,
  unshareFromSquare,
  updateCollection
} from '@/api/collections'
import { getFavoriteList, removeFavorite } from '@/api/favorite'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { getApiErrorMessage } from '@/composables/useApiError'
import { useRequestGuard } from '@/composables/useRequestGuard'

const router = useRouter()

const message = useMessage()

// =======================
// 类型
// =======================
type Visibility = 0 | 1

interface Collection {
  id: number
  name: string
  description?: string
  visibility: Visibility // 0私有 1公开
  isDefault: boolean
  isShared?: boolean // ✅ 是否已分享到广场
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
const collections = shallowRef<Collection[]>([])
const selectedCollectionId = ref<number | null>(null)
const collectionsGuard = useRequestGuard()
const itemsGuard = useRequestGuard()

const selectedCollection = computed(() => {
  if (!selectedCollectionId.value)
    return null
  return collections.value.find(c => c.id === selectedCollectionId.value) || null
})
const selectedIsDefault = computed(() => !!selectedCollection.value?.isDefault)

async function fetchCollections() {
  const requestId = collectionsGuard.next()
  colLoading.value = true
  try {
    const res = await listMyCollections()
    if (!collectionsGuard.isCurrent(requestId))
      return

    const arr = unwrapApiList<CollectionInfoDTO>(res)
    collections.value = arr.map((c: CollectionInfoDTO) => ({
      id: Number(c.id),
      name: c.name,
      description: c.description || '',
      visibility: Number(c.visibility ?? 0) as Visibility,
      isDefault: !!c.isDefault,
      isShared: !!c.isShared // ✅ 读取后端返回的 is_shared 字段
    }))

    // 默认选中默认收藏夹
    if (!selectedCollectionId.value) {
      const def = collections.value.find(x => x.isDefault)
      selectedCollectionId.value = def?.id ?? (collections.value[0]?.id ?? null)
    }
    else {
      const still = collections.value.some(x => x.id === selectedCollectionId.value)
      if (!still) {
        const def = collections.value.find(x => x.isDefault)
        selectedCollectionId.value = def?.id ?? (collections.value[0]?.id ?? null)
      }
    }

    // ✅ 同步 isSharedToSquare 状态
    updateSharedStatus()
  }
  catch {
    if (!collectionsGuard.isCurrent(requestId))
      return
    message.error('加载收藏夹失败（请确认 /collections/mine 正常）')
  }
  finally {
    if (collectionsGuard.isCurrent(requestId))
      colLoading.value = false
  }
}

// =======================
// 右侧：当前收藏夹图片列表（分页）
// =======================
const loading = ref(true)
const list = shallowRef<FavItem[]>([])
const pagination = reactive({
  page: 1,
  size: 24,
  total: 0
})

function mapRowsToItems(items: (FavoriteItemDTO | CollectionItemDTO)[]) {
  return items.map((r: FavoriteItemDTO | CollectionItemDTO) => {
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
    } as FavItem
  })
}

async function fetchItems() {
  if (!selectedCollectionId.value)
    return
  const requestId = itemsGuard.next()
  const collectionId = selectedCollectionId.value
  const isDefault = selectedIsDefault.value
  loading.value = true
  try {
    // ✅ 默认收藏夹：走 /favorite/list
    if (isDefault) {
      const res = await getFavoriteList({ page: pagination.page, size: pagination.size })
      if (!itemsGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<FavoritePageDTO>(res, { page: 1, size: 24, total: 0, items: [] })
      const items = data.items || data.records || []
      pagination.total = data.total || 0
      list.value = mapRowsToItems(items)
      return
    }

    // ✅ 非默认收藏夹：走 /collections/{id}/items
    const res = await getCollectionItems(collectionId, {
      page: pagination.page,
      size: pagination.size
    })
    if (!itemsGuard.isCurrent(requestId))
      return

    const data = unwrapApiData<CollectionItemPageDTO>(res, { page: 1, size: 24, total: 0, items: [] })
    const items = data.items || data.records || []
    pagination.total = data.total || 0
    list.value = mapRowsToItems(items)
  }
  catch {
    if (!itemsGuard.isCurrent(requestId))
      return
    message.error('加载收藏内容失败')
  }
  finally {
    if (itemsGuard.isCurrent(requestId))
      loading.value = false
  }
}

async function refreshAll() {
  await fetchCollections()
  pagination.page = 1
  await fetchItems()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchItems()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleViewOriginal(url: string) {
  if (url)
    window.open(url, '_blank')
  else message.warning('原图链接无效')
}

// 在当前收藏夹移除图片
async function handleRemoveFromCurrent(item: FavItem) {
  if (!selectedCollectionId.value)
    return
  try {
    if (selectedIsDefault.value) {
      await removeFavorite(item.pid, item.p)
    }
    else {
      await removeFromCollection(selectedCollectionId.value, item.pid, item.p)
    }

    message.success('已移除')
    list.value = list.value.filter(i => !(i.pid === item.pid && i.p === item.p))

    if (list.value.length === 0 && pagination.page > 1) {
      handlePageChange(pagination.page - 1)
    }
    else {
      pagination.total = Math.max(0, pagination.total - 1)
    }
  }
  catch {
    message.error('操作失败')
  }
}

async function selectCollection(id: number) {
  if (selectedCollectionId.value === id)
    return
  selectedCollectionId.value = id
  pagination.page = 1
  updateSharedStatus() // ✅ 切换收藏夹时同步分享状态
  await fetchItems()
}

// =======================
// 新建 / 编辑 / 删除 收藏夹
// =======================
const showCreate = ref(false)
const showEdit = ref(false)

const createForm = ref({ name: '', description: '', visibility: 0 as Visibility })
const editForm = ref({ id: 0, name: '', description: '', visibility: 0 as Visibility })

const saving = ref(false)

function openCreate() {
  createForm.value = { name: '', description: '', visibility: 0 }
  showCreate.value = true
}

async function submitCreate() {
  const name = createForm.value.name.trim()
  if (!name)
    return message.warning('请输入收藏夹名称')

  saving.value = true
  try {
    await createCollection({
      name,
      description: createForm.value.description?.trim() || '',
      visibility: createForm.value.visibility
    })
    message.success('创建成功')
    showCreate.value = false
    await fetchCollections()
  }
  catch {
    message.error('创建失败')
  }
  finally {
    saving.value = false
  }
}

function openEdit() {
  const c = selectedCollection.value
  if (!c)
    return
  editForm.value = {
    id: c.id,
    name: c.name,
    description: c.description || '',
    visibility: (c.visibility as Visibility)
  }
  showEdit.value = true
}

async function submitEdit() {
  const c = selectedCollection.value
  if (!c)
    return

  // 默认收藏夹：后端一般只允许改描述（你之前 service 就是这么写的）
  const payload: { name?: string, description?: string, visibility?: number } = {
    description: editForm.value.description?.trim() || ''
  }

  if (!c.isDefault) {
    const name = editForm.value.name.trim()
    if (!name)
      return message.warning('请输入收藏夹名称')
    payload.name = name
    payload.visibility = editForm.value.visibility
  }

  saving.value = true
  try {
    await updateCollection(editForm.value.id, payload)
    message.success('保存成功')
    showEdit.value = false
    await fetchCollections()
  }
  catch {
    message.error('保存失败')
  }
  finally {
    saving.value = false
  }
}

async function handleDeleteCollection() {
  const c = selectedCollection.value
  if (!c)
    return
  if (c.isDefault)
    return message.warning('默认收藏夹不可删除')

  saving.value = true
  try {
    await deleteCollection(c.id)
    message.success('已删除收藏夹')
    selectedCollectionId.value = null
    await refreshAll()
  }
  catch {
    message.error('删除失败')
  }
  finally {
    saving.value = false
  }
}

// =======================
// 分享
// =======================
const showShare = ref(false)
const shareUrl = computed(() => {
  const c = selectedCollection.value
  if (!c?.id)
    return ''

  const href = router.resolve({
    name: 'PublicCollection',
    params: { id: c.id }
  }).href

  return new URL(href, window.location.origin).toString()
})

const canShare = computed(() => {
  const c = selectedCollection.value
  return !!c && !c.isDefault && Number(c.visibility) === 1
})

function openShare() {
  if (!canShare.value) {
    message.warning('只能分享“公开”的非默认收藏夹（先在编辑里改为公开）')
    return
  }
  showShare.value = true
}

async function copyShare() {
  if (!shareUrl.value)
    return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    message.success('分享链接已复制')
  }
  catch {
    message.error('复制失败，请手动复制链接')
  }
}

function openShareLink() {
  if (!shareUrl.value)
    return
  window.open(shareUrl.value, '_blank')
}

// =======================
// 🚀 分享到广场
// =======================
const shareToSquareLoading = ref(false)
const isSharedToSquare = ref(false) // 当前选中的收藏夹是否已分享到广场

// ✅ 同步当前选中收藏夹的分享状态
function updateSharedStatus() {
  const c = selectedCollection.value
  isSharedToSquare.value = c?.isShared ?? false
}

async function handleShareToSquare() {
  const c = selectedCollection.value
  if (!c)
    return
  if (!canShare.value) {
    message.warning('只有公开的非默认收藏夹才能分享到广场')
    return
  }

  shareToSquareLoading.value = true
  try {
    if (isSharedToSquare.value) {
      await unshareFromSquare(c.id)
      isSharedToSquare.value = false
      collections.value = collections.value.map(col => (
        col.id === c.id ? { ...col, isShared: false } : col
      ))
      message.success('已取消分享到广场')
    }
    else {
      await shareToSquare(c.id)
      isSharedToSquare.value = true
      collections.value = collections.value.map(col => (
        col.id === c.id ? { ...col, isShared: true } : col
      ))
      message.success('已分享到广场，其他用户现在可以发现你的收藏夹了！')
    }
  }
  catch (e: unknown) {
    message.error(getApiErrorMessage(e, '操作失败'))
  }
  finally {
    shareToSquareLoading.value = false
  }
}

function viewSquare() {
  router.push('/dashboard/square')
}

// =======================
// ✅ 设置封面
// =======================
const settingCover = ref(false)

async function handleSetCover(item: FavItem) {
  const c = selectedCollection.value
  if (!c)
    return
  if (c.isDefault) {
    message.warning('默认收藏夹不支持设置封面')
    return
  }

  settingCover.value = true
  try {
    await setCover(c.id, item.pid, item.p)
    message.success(`已设置「${item.title}」为封面`)
    // 如果已分享到广场，封面会立即更新
    if (c.isShared) {
      message.info('广场页面封面已同步更新')
    }
  }
  catch (e: unknown) {
    message.error(getApiErrorMessage(e, '设置封面失败'))
  }
  finally {
    settingCover.value = false
  }
}

// =======================
// ✅ 复制/移动到其它收藏夹（完善点）
// =======================
const showMove = ref(false)
const moving = ref(false)
const moveMode = ref<'copy' | 'move'>('move')
const moveTargetId = ref<number | null>(null)
const movingItem = ref<FavItem | null>(null)

const moveTargetOptions = computed(() => {
  const curId = selectedCollectionId.value
  return collections.value
    .filter(c => c.id !== curId) // 不能移到自己
    .map(c => ({
      label: c.isDefault ? `⭐ ${c.name}` : c.name,
      value: c.id
    }))
})

function openMoveModal(item: FavItem) {
  if (!selectedCollectionId.value)
    return
  if (moveTargetOptions.value.length === 0) {
    message.warning('你还没有其它收藏夹，先新建一个吧')
    return
  }
  movingItem.value = item
  moveMode.value = 'move'
  moveTargetId.value = moveTargetOptions.value[0]?.value ?? null
  showMove.value = true
}

async function submitMove() {
  const curId = selectedCollectionId.value
  const toId = moveTargetId.value
  const item = movingItem.value
  if (!curId || !toId || !item)
    return

  moving.value = true
  try {
    // 1) 先添加到目标（幂等）
    await addToCollection(toId, item.pid, item.p)

    // 2) 如果是移动：从当前移除
    if (moveMode.value === 'move') {
      if (selectedIsDefault.value) {
        await removeFavorite(item.pid, item.p)
      }
      else {
        await removeFromCollection(curId, item.pid, item.p)
      }

      // 更新当前列表（当前收藏夹少一张）
      list.value = list.value.filter(i => !(i.pid === item.pid && i.p === item.p))
      pagination.total = Math.max(0, pagination.total - 1)

      if (list.value.length === 0 && pagination.page > 1) {
        pagination.page = pagination.page - 1
        await fetchItems()
      }
      message.success('已移动到目标收藏夹')
    }
    else {
      message.success('已复制到目标收藏夹')
    }

    showMove.value = false
  }
  catch {
    message.error('操作失败（请确认 /collections/{id}/items/{pid}/{p} 可用）')
  }
  finally {
    moving.value = false
  }
}

onMounted(async () => {
  await fetchCollections()
  await fetchItems()
})
</script>

<template>
  <div class="page-container ui-page">
    <div class="header-section ui-page-header ui-card">
      <div>
        <h2 class="title ui-page-title">
          我的收藏
        </h2>
        <p class="subtitle ui-page-subtitle">
          当前收藏夹：
          <b>{{ selectedCollection?.name || '-' }}</b>
          <span class="dot">·</span>
          共 {{ pagination.total }} 张作品
          <span class="dot">·</span>
          <NButton text type="primary" @click="viewSquare">
            <template #icon>
              <NIcon><RocketOutline /></NIcon>
            </template>
            去广场逛逛
          </NButton>
        </p>
      </div>
    </div>

    <div class="collection-overview">
      <div class="overview-card ui-card">
        <div class="overview-label">
          收藏夹
        </div>
        <div class="overview-value">
          {{ collections.length }}
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-label">
          当前作品
        </div>
        <div class="overview-value">
          {{ pagination.total }}
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-label">
          可见性
        </div>
        <div class="overview-value small">
          {{ selectedCollection?.visibility === 1 ? '公开' : '私有' }}
        </div>
      </div>
      <div class="overview-card ui-card">
        <div class="overview-label">
          广场状态
        </div>
        <div class="overview-value small">
          {{ isSharedToSquare ? '已分享' : '未分享' }}
        </div>
      </div>
    </div>

    <div class="layout">
      <!-- 左侧：收藏夹列表 -->
      <div class="left">
        <NCard class="glass-card ui-card side-card" :bordered="false">
          <div class="side-header">
            <div class="side-title">
              收藏夹
              <NTag size="small" round :bordered="false" type="info">
                {{ collections.length }}
              </NTag>
            </div>
            <NButton size="small" secondary type="primary" color="#f586a9" @click="openCreate">
              <template #icon>
                <NIcon><AddOutline /></NIcon>
              </template>
              新建
            </NButton>
          </div>

          <div v-if="colLoading" class="side-loading">
            <NSkeleton v-for="i in 6" :key="i" height="34px" style="border-radius: 10px;" />
          </div>

          <div v-else class="col-list">
            <div
              v-for="c in collections"
              :key="c.id"
              v-memo="[c.id, c.name, c.visibility, c.isDefault, c.id === selectedCollectionId]"
              class="col-item"
              :class="{ active: c.id === selectedCollectionId }"
              role="button"
              tabindex="0"
              @click="selectCollection(c.id)"
              @keydown.enter="selectCollection(c.id)"
              @keydown.space.prevent="selectCollection(c.id)"
            >
              <div class="col-name">
                <span v-if="c.isDefault" class="star">⭐</span>
                {{ c.name }}
              </div>
              <div class="col-meta">
                <NIcon v-if="c.visibility === 0" size="14">
                  <LockClosedOutline />
                </NIcon>
                <NIcon v-else size="14">
                  <GlobeOutline />
                </NIcon>
                <span class="meta-text">{{ c.visibility === 1 ? '公开' : '私有' }}</span>
              </div>
            </div>
          </div>

          <div v-if="selectedCollection" class="side-actions">
            <!-- 🚀 分享到广场按钮 -->
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  size="small"
                  :type="isSharedToSquare ? 'warning' : 'primary'"
                  :secondary="!isSharedToSquare"
                  :disabled="!canShare"
                  :loading="shareToSquareLoading"
                  @click="handleShareToSquare"
                >
                  <template #icon>
                    <NIcon>
                      <RocketOutline v-if="!isSharedToSquare" />
                      <CloseCircleOutline v-else />
                    </NIcon>
                  </template>
                  {{ isSharedToSquare ? '取消广场' : '分享到广场' }}
                </NButton>
              </template>
              <span v-if="canShare">
                {{ isSharedToSquare ? '取消分享，其他用户将无法在广场看到' : '分享到广场，让其他用户发现你的收藏夹' }}
              </span>
              <span v-else>私有收藏夹不能分享到广场（先改为公开）</span>
            </NTooltip>

            <!-- 分享按钮（公开才允许） -->
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton size="small" secondary :disabled="!canShare" @click="openShare">
                  <template #icon>
                    <NIcon><ShareSocialOutline /></NIcon>
                  </template>
                  分享链接
                </NButton>
              </template>
              <span v-if="canShare">复制公开链接给别人访问</span>
              <span v-else>私有收藏夹不可分享（先改为公开）</span>
            </NTooltip>

            <NButton size="small" secondary @click="openEdit">
              <template #icon>
                <NIcon><SettingsOutline /></NIcon>
              </template>
              编辑
            </NButton>

            <NPopconfirm v-if="!selectedCollection.isDefault" @positive-click="handleDeleteCollection">
              <template #trigger>
                <NButton size="small" secondary type="error">
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                  删除
                </NButton>
              </template>
              确认删除收藏夹「{{ selectedCollection.name }}」吗？
            </NPopconfirm>

            <NButton v-else size="small" secondary disabled>
              默认收藏夹不可删除
            </NButton>
          </div>
        </NCard>
      </div>

      <!-- 右侧：图片内容 -->
      <div class="right">
        <div v-if="loading && list.length === 0" class="loading-grid">
          <div v-for="n in 12" :key="n" class="skeleton-card">
            <NSkeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
          </div>
        </div>

        <div v-else-if="!loading && list.length === 0" class="empty-box ui-card">
          <NEmpty description="这个收藏夹是空的" size="large">
            <template #icon>
              <NIcon><ImageOutline /></NIcon>
            </template>
            <template #extra>
              <NButton type="primary" secondary @click="$router.push('/dashboard/docs')">
                去逛逛
              </NButton>
            </template>
          </NEmpty>
        </div>

        <div v-else class="content-wrapper">
          <div class="gallery-grid">
            <div v-for="item in list" :key="`${item.pid}-${item.p}`" v-memo="[item.pid, item.p, item.title, item.url, item.r18, selectedIsDefault]" class="fav-card ui-card">
              <div class="img-box">
                <!-- ✅ 启用图片预览，移除 preview-disabled -->
                <NImage
                  lazy
                  :src="item.url"
                  object-fit="cover"
                  class="fav-img"
                  show-toolbar-tooltip
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
                  <div class="overlay-actions">
                    <NButton circle color="#fff" class="action-btn" aria-label="查看原图" @click.stop="handleViewOriginal(item.originalUrl)">
                      <template #icon>
                        <NIcon color="#333">
                          <EyeOutline />
                        </NIcon>
                      </template>
                    </NButton>

                    <!-- ✅ 新增：设置为封面 -->
                    <NTooltip v-if="!selectedIsDefault" trigger="hover">
                      <template #trigger>
                        <NButton
                          circle
                          color="#f586a9"
                          class="action-btn"
                          aria-label="设置为封面"
                          :loading="settingCover"
                          @click.stop="handleSetCover(item)"
                        >
                          <template #icon>
                            <NIcon color="#fff">
                              <ImagesOutline />
                            </NIcon>
                          </template>
                        </NButton>
                      </template>
                      <span>设置为封面</span>
                    </NTooltip>

                    <!-- ✅ 移动/复制到其他收藏夹 -->
                    <NTooltip trigger="hover">
                      <template #trigger>
                        <NButton circle color="#fff" class="action-btn" aria-label="移动/复制到其它收藏夹" @click.stop="openMoveModal(item)">
                          <template #icon>
                            <NIcon color="#333">
                              <SwapHorizontalOutline />
                            </NIcon>
                          </template>
                        </NButton>
                      </template>
                      <span>移动/复制到其它收藏夹</span>
                    </NTooltip>

                    <NPopconfirm @positive-click="handleRemoveFromCurrent(item)">
                      <template #trigger>
                        <NButton circle color="#ef4444" class="action-btn del-btn" aria-label="从当前收藏夹移除" @click.stop>
                          <template #icon>
                            <NIcon color="#fff">
                              <HeartDislikeOutline />
                            </NIcon>
                          </template>
                        </NButton>
                      </template>
                      确认要从当前收藏夹移除这张图片吗？
                    </NPopconfirm>
                  </div>
                </div>

                <div class="badges">
                  <NTag v-if="item.r18" type="error" size="tiny" round class="badge">
                    R-18
                  </NTag>
                  <NTag v-if="item.p > 0" type="warning" size="tiny" round class="badge">
                    P{{ item.p }}
                  </NTag>
                </div>
              </div>

              <div class="info-box">
                <div class="img-title" :title="item.title">
                  {{ item.title }}
                </div>
                <div class="img-meta">
                  <div class="author">
                    <NIcon><PersonOutline /></NIcon>
                    <span>{{ item.author }}</span>
                  </div>
                  <span class="pid">ID: {{ item.pid }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="pagination.total > 0" class="pagination-box">
            <NPagination
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

    <!-- 分享弹窗 -->
    <NModal v-model:show="showShare" preset="card" title="分享公开收藏夹" :style="{ width: '520px', maxWidth: '92vw' }">
      <NSpace vertical size="large">
        <NTag type="success" round :bordered="false">
          任何人打开这个链接都能查看该公开收藏夹
        </NTag>

        <div>
          <div class="form-label">
            分享链接
          </div>
          <NInput :value="shareUrl" readonly />
        </div>

        <div class="share-actions">
          <NButton secondary @click="copyShare">
            <template #icon>
              <NIcon><CopyOutline /></NIcon>
            </template>
            复制链接
          </NButton>
          <NButton type="primary" color="#f586a9" @click="openShareLink">
            <template #icon>
              <NIcon><OpenOutline /></NIcon>
            </template>
            打开预览
          </NButton>
        </div>
      </NSpace>
    </NModal>

    <!-- ✅ 移动/复制弹窗 -->
    <NModal v-model:show="showMove" preset="card" title="移动/复制到收藏夹" :style="{ width: '520px', maxWidth: '92vw' }">
      <NSpace vertical size="large">
        <NTag round :bordered="false" type="info">
          当前：{{ selectedCollection?.name || '-' }}
        </NTag>

        <div>
          <div class="form-label">
            目标收藏夹
          </div>
          <NSelect
            v-model:value="moveTargetId"
            :options="moveTargetOptions"
            placeholder="请选择目标收藏夹"
          />
        </div>

        <div>
          <div class="form-label">
            操作
          </div>
          <NRadioGroup v-model:value="moveMode">
            <NSpace>
              <NRadio value="move">
                移动（从当前移除）
              </NRadio>
              <NRadio value="copy">
                复制（保留当前）
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <NButton quaternary @click="showMove = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="moving" @click="submitMove">
            确认
          </NButton>
        </div>
      </NSpace>
    </NModal>

    <!-- 新建收藏夹 -->
    <NModal v-model:show="showCreate" preset="card" title="新建收藏夹" :style="{ width: '420px' }">
      <NSpace vertical size="large">
        <div>
          <div class="form-label">
            名称
          </div>
          <NInput v-model:value="createForm.name" placeholder="请输入收藏夹名称" />
        </div>

        <div>
          <div class="form-label">
            描述（可选）
          </div>
          <NInput v-model:value="createForm.description" placeholder="写点说明…" />
        </div>

        <div>
          <div class="form-label">
            可见性
          </div>
          <NRadioGroup v-model:value="createForm.visibility">
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
      </NSpace>

      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showCreate = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="saving" @click="submitCreate">
            创建
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 编辑收藏夹 -->
    <NModal v-model:show="showEdit" preset="card" title="编辑收藏夹" :style="{ width: '420px' }">
      <NSpace vertical size="large">
        <NTag v-if="selectedCollection?.isDefault" type="warning" round :bordered="false">
          默认收藏夹：通常只允许改描述（名称/可见性由后端限制）
        </NTag>

        <div>
          <div class="form-label">
            名称
          </div>
          <NInput
            v-model:value="editForm.name"
            placeholder="请输入收藏夹名称"
            :disabled="!!selectedCollection?.isDefault"
          />
        </div>

        <div>
          <div class="form-label">
            描述
          </div>
          <NInput v-model:value="editForm.description" placeholder="写点说明…" />
        </div>

        <div>
          <div class="form-label">
            可见性
          </div>
          <NRadioGroup v-model:value="editForm.visibility" :disabled="!!selectedCollection?.isDefault">
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
      </NSpace>

      <template #footer>
        <div class="modal-footer">
          <NButton quaternary @click="showEdit = false">
            取消
          </NButton>
          <NButton type="primary" color="#f586a9" :loading="saving" @click="submitEdit">
            保存
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.page-container {
  padding-bottom: 80px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.header-section {
  text-align: left;
  padding: 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(245, 134, 169, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}
.title { margin: 0; }
.subtitle { margin-top: 8px; }
.dot { margin: 0 8px; opacity: .6; }

.collection-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.overview-card {
  padding: 18px;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.overview-label {
  color: var(--ui-text-muted);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.overview-value {
  color: var(--ui-text);
  font-size: 26px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.overview-value.small {
  color: #f26d99;
  font-size: 20px;
}

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
  border-radius: var(--ui-radius-xl) !important;
}

.side-card {
  position: sticky;
  top: 20px;
}
.side-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.side-title { font-size: 16px; font-weight: 800; display: flex; gap: 10px; align-items: center; color: var(--ui-text); }
.side-loading { display: flex; flex-direction: column; gap: 10px; }
.col-list { display: flex; flex-direction: column; gap: 10px; }

.col-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.62);
  border: 1px solid rgba(255,255,255,0.78);
  cursor: pointer;
  transition: all .2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.col-item:hover { transform: translateY(-2px); background: rgba(255,255,255,0.75); }
.col-item:focus-visible {
  outline: 2px solid var(--lg-accent, #f586a9);
  outline-offset: 2px;
}
.col-item.active {
  border-color: rgba(245, 134, 169, 0.42);
  box-shadow: 0 10px 24px rgba(245,134,169,0.12);
  background: rgba(255, 246, 251, 0.9);
}

.col-name { font-weight: 800; color: var(--ui-text); display: flex; gap: 6px; align-items: center; }
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.fav-card {
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}
.fav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 50px rgba(31, 41, 55, 0.12), 0 16px 34px rgba(245, 134, 169, 0.1);
  border-color: rgba(245, 134, 169, 0.22);
  z-index: 2;
}

.img-box {
  position: relative;
  width: 100%;
  /* ✅ 使用3:4比例，更适合大多数图片 */
  aspect-ratio: 3 / 4;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  overflow: hidden;
  border-radius: 12px 12px 0 0;  /* ✅ 上部圆角 */
}
.fav-img { width: 100%; height: 100%; display: block; }
:deep(.fav-img img) {
  width: 100%;
  height: 100%;
  /* ✅ 优化裁切方式：保持图片中心区域 */
  object-fit: cover;
  object-position: center center;
  transition: transform 0.45s ease;
}
.fav-card:hover :deep(.fav-img img) { transform: scale(1.04); }

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.2);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  pointer-events: none;  /* ✅ 让 overlay 不阻挡图片点击 */
}
.fav-card:hover .overlay { opacity: 1; }

.overlay-actions {
  display: flex;
  gap: 16px;
  pointer-events: auto;  /* ✅ 但按钮可以点击 */
}
.action-btn { box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.2s; }
.action-btn:hover { transform: scale(1.1); }

.badges { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; pointer-events: none; }
.badge { font-weight: 700; opacity: 0.9; backdrop-filter: blur(4px); }

.info-box { padding: 12px 16px 16px; background: rgba(255,255,255,0.72); }
.img-title {
  font-size: 15px; font-weight: 800; color: var(--ui-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 6px;
}
.img-meta {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: #6b7280;
}
.author { display: flex; align-items: center; gap: 4px; max-width: 60%; }
.author span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pid { font-family: monospace; font-size: 11px; opacity: 0.82; background: rgba(245,134,169,0.1); color: #f26d99; padding: 3px 6px; border-radius: 8px; }

.pagination-box { display: flex; justify-content: center; margin-top: 20px; }

.form-label { font-size: 13px; color: #6b7280; margin-bottom: 6px; font-weight: 600; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; }

.share-actions { display: flex; gap: 10px; justify-content: flex-end; }

@media (max-width: 640px) {
  .collection-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);  /* ✅ 移动端2列 */
    gap: 12px;
  }
  .side-card { position: static; }
  .share-actions { justify-content: stretch; }
  .share-actions :deep(.n-button) { flex: 1; }

  /* ✅ 移动端卡片优化 */
  .fav-card {
    border-radius: 12px;
  }
  .img-box {
    aspect-ratio: 1 / 1;  /* ✅ 移动端使用1:1比例，更紧凑 */
    border-radius: 10px 10px 0 0;
  }
  .info-box {
    padding: 8px 10px 10px;
  }
  .img-title {
    font-size: 13px;
  }
}
</style>
