<script setup lang="ts">
import type { CloudVideoItem } from '@/api/cloudVideo'
import {
  CloudUploadOutline,
  CreateOutline,
  RefreshOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NProgress,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  deleteAdminCloudVideo,
  fetchAdminCloudVideos,
  syncAdminCloudVideo,
  updateAdminCloudVideo,
} from '@/api/admin'
import { cloudVideoRatingLabel } from '@/api/cloudVideo'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useCloudVideoUploadStore } from '@/stores/cloudVideoUpload'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const upload = useCloudVideoUploadStore()
const { isCompact } = useBreakpoint()
const loading = ref(false)
const videos = ref<CloudVideoItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const status = ref<string>('ALL')
const rating = ref<string>('ALL')
const keywords = ref('')
let syncTimer: number | null = null

const editVisible = ref(false)
const editSaving = ref(false)
const editForm = ref({
  id: 0,
  title: '',
  description: '',
  tags: '',
  visibility: 'draft',
  rating: 'all_ages',
})

const statusOptions = [
  { label: '全部', value: 'ALL' },
  { label: '上传中', value: 'uploading' },
  { label: '转码中', value: 'encoding' },
  { label: '已就绪', value: 'ready' },
  { label: '失败', value: 'failed' },
]

const visibilityOptions = [
  { label: '草稿', value: 'draft' },
  { label: '发布', value: 'published' },
]

const ratingOptions = [
  { label: '全年龄', value: 'all_ages' },
  { label: 'R18', value: 'r18' },
]

const ratingFilterOptions = [
  { label: '全部分级', value: 'ALL' },
  ...ratingOptions,
]

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function statusMeta(value?: string) {
  if (value === 'ready')
    return { type: 'success' as const, label: '已就绪' }
  if (value === 'encoding')
    return { type: 'info' as const, label: '转码中' }
  if (value === 'failed')
    return { type: 'error' as const, label: '失败' }
  return { type: 'warning' as const, label: '上传中' }
}

function formatDuration(seconds?: number) {
  const total = Math.max(0, seconds || 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function loadList(options: { silent?: boolean } = {}) {
  if (!options.silent)
    loading.value = true
  try {
    const data = unwrapApiData(await fetchAdminCloudVideos({
      status: status.value === 'ALL' ? undefined : status.value,
      rating: rating.value === 'ALL' ? undefined : rating.value,
      keywords: keywords.value.trim() || undefined,
      page: page.value,
      pageSize,
    }), { list: [], total: 0, page: page.value, pageSize })
    videos.value = data.list || []
    total.value = data.total || 0
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载云视频失败')
  }
  finally {
    if (!options.silent)
      loading.value = false
  }
}

function handlePageChange(next: number) {
  page.value = next
  void loadList()
}

function handleFilter() {
  page.value = 1
  void loadList()
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (files.length)
    upload.enqueue(files)
}

async function handleSync(row: CloudVideoItem) {
  try {
    await syncAdminCloudVideo(row.id)
    message.success('已同步 Bunny 状态')
    await loadList()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '同步失败')
  }
}

function openEdit(row: CloudVideoItem) {
  editForm.value = {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    tags: row.tags || '',
    visibility: row.visibility || 'draft',
    rating: row.rating === 'r18' ? 'r18' : 'all_ages',
  }
  editVisible.value = true
}

async function saveEdit() {
  editSaving.value = true
  try {
    await updateAdminCloudVideo(editForm.value.id, {
      title: editForm.value.title,
      description: editForm.value.description,
      tags: editForm.value.tags,
      visibility: editForm.value.visibility,
      rating: editForm.value.rating,
    })
    message.success('已保存')
    editVisible.value = false
    await loadList()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '保存失败')
  }
  finally {
    editSaving.value = false
  }
}

async function handleDelete(row: CloudVideoItem) {
  try {
    await deleteAdminCloudVideo(row.id)
    message.success('已删除')
    await loadList()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '删除失败')
  }
}

const columns = [
  {
    title: '封面',
    key: 'coverUrl',
    width: 120,
    render(row: CloudVideoItem) {
      if (!row.coverUrl)
        return '—'
      return h('img', {
        src: row.coverUrl,
        alt: row.title,
        style: 'width:96px;height:54px;object-fit:cover;border-radius:8px;display:block;',
      })
    },
  },
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render(row: CloudVideoItem) {
      const meta = statusMeta(row.status)
      const progress = row.status === 'encoding' && row.encodeProgress
        ? ` ${row.encodeProgress}%`
        : ''
      return h(NTag, { type: meta.type, size: 'small', round: true }, { default: () => `${meta.label}${progress}` })
    },
  },
  {
    title: '可见性',
    key: 'visibility',
    width: 90,
    render(row: CloudVideoItem) {
      return row.visibility === 'published' ? '已发布' : '草稿'
    },
  },
  {
    title: '分级',
    key: 'rating',
    width: 90,
    render(row: CloudVideoItem) {
      return h(NTag, {
        type: row.rating === 'r18' ? 'error' : 'success',
        size: 'small',
        round: true,
      }, { default: () => cloudVideoRatingLabel(row.rating) })
    },
  },
  {
    title: '时长',
    key: 'durationSeconds',
    width: 80,
    render(row: CloudVideoItem) {
      return formatDuration(row.durationSeconds)
    },
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render(row: CloudVideoItem) {
      return formatDate(row.updatedAt)
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render(row: CloudVideoItem) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', secondary: true, onClick: () => void handleSync(row) }, {
            default: () => '同步',
            icon: () => h(NIcon, null, { default: () => h(RefreshOutline) }),
          }),
          h(NButton, { size: 'small', secondary: true, onClick: () => openEdit(row) }, {
            default: () => '编辑',
            icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
          }),
          h(NPopconfirm, { onPositiveClick: () => handleDelete(row) }, {
            default: () => '确认删除该视频？Bunny 上的源文件也会被删除。',
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, {
              default: () => '删除',
              icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
            }),
          }),
        ],
      })
    },
  },
]

const fileInput = ref<HTMLInputElement | null>(null)

function pickFile() {
  fileInput.value?.click()
}

async function pollBusyVideos() {
  const busy = videos.value.filter(item => item.status === 'uploading' || item.status === 'encoding')
  if (!busy.length || upload.running)
    return
  await Promise.allSettled(busy.map(item => syncAdminCloudVideo(item.id)))
  await loadList({ silent: true })
}

watch(() => upload.completedTick, (tick) => {
  if (tick)
    void loadList({ silent: true })
})

onMounted(() => {
  void loadList()
  syncTimer = window.setInterval(() => {
    void pollBusyVideos()
  }, 15000)
})

onUnmounted(() => {
  if (syncTimer)
    window.clearInterval(syncTimer)
})
</script>

<template>
  <div class="page-container">
    <div class="header-section" :class="{ compact: isCompact }">
      <div>
        <h2 class="title">
          云视频管理
        </h2>
        <p class="subtitle">
          直传到 Bunny Stream，转码完成后发布给登录用户观看。
        </p>
      </div>
      <div class="toolbar">
        <NInput v-model:value="keywords" class="toolbar-field" placeholder="搜索标题 / 标签" @keyup.enter="handleFilter" />
        <NSelect v-model:value="status" class="toolbar-select" :options="statusOptions" @update:value="handleFilter" />
        <NSelect v-model:value="rating" class="toolbar-select" :options="ratingFilterOptions" @update:value="handleFilter" />
        <NButton secondary :loading="loading" @click="loadList">
          刷新
        </NButton>
        <NButton type="primary" @click="pickFile">
          <template #icon>
            <NIcon><CloudUploadOutline /></NIcon>
          </template>
          {{ upload.busy ? '继续添加' : '上传视频' }}
        </NButton>
        <input ref="fileInput" class="hidden-input" type="file" accept="video/*,.mkv,.avi" multiple @change="onFilePicked">
      </div>
    </div>

    <div v-if="upload.busy" class="upload-progress">
      <p>{{ upload.summary }}</p>
      <p class="upload-hint">
        传输在这个浏览器标签里进行。Windows 不休眠也会被锁屏、切走标签或网络卡住中断；卡住时会自动续传当前文件。
      </p>
      <NProgress type="line" :percentage="upload.percent" />
    </div>

    <NDataTable
      v-if="!isCompact"
      :columns="columns"
      :data="videos"
      :loading="loading"
      :pagination="false"
      :bordered="false"
    />
    <div v-else class="mobile-list">
      <NEmpty v-if="!loading && videos.length === 0" description="暂无云视频" />
      <article v-for="row in videos" :key="row.id" class="video-card">
        <img
          v-if="row.coverUrl"
          class="video-cover"
          :src="row.coverUrl"
          :alt="row.title"
        >
        <div v-else class="video-cover is-empty">
          无封面
        </div>
        <div class="video-body">
          <h3>{{ row.title }}</h3>
          <div class="video-meta">
            <NTag :type="statusMeta(row.status).type" size="small" round>
              {{ statusMeta(row.status).label }}{{ row.status === 'encoding' && row.encodeProgress ? ` ${row.encodeProgress}%` : '' }}
            </NTag>
            <NTag :type="row.rating === 'r18' ? 'error' : 'success'" size="small" round>
              {{ cloudVideoRatingLabel(row.rating) }}
            </NTag>
            <span>{{ row.visibility === 'published' ? '已发布' : '草稿' }}</span>
            <span>{{ formatDuration(row.durationSeconds) }}</span>
          </div>
          <p class="video-time">
            {{ formatDate(row.updatedAt) }}
          </p>
          <div class="video-actions">
            <NButton size="small" secondary @click="handleSync(row)">
              同步
            </NButton>
            <NButton size="small" secondary @click="openEdit(row)">
              编辑
            </NButton>
            <NPopconfirm @positive-click="handleDelete(row)">
              <template #trigger>
                <NButton size="small" type="error" ghost>
                  删除
                </NButton>
              </template>
              确认删除该视频？Bunny 上的源文件也会被删除。
            </NPopconfirm>
          </div>
        </div>
      </article>
    </div>
    <div v-if="total > pageSize" class="pagination" :class="{ compact: isCompact }">
      <NPagination :page="page" :page-count="pageCount" :simple="isCompact" @update:page="handlePageChange" />
    </div>

    <NModal v-model:show="editVisible" preset="card" title="编辑云视频" class="edit-modal" :style="{ width: isCompact ? 'calc(100vw - 24px)' : '520px' }">
      <NForm label-placement="top">
        <NFormItem label="标题">
          <NInput v-model:value="editForm.title" maxlength="255" />
        </NFormItem>
        <NFormItem label="简介">
          <NInput v-model:value="editForm.description" type="textarea" :rows="3" maxlength="4000" />
        </NFormItem>
        <NFormItem label="标签">
          <NInput v-model:value="editForm.tags" placeholder="逗号分隔" maxlength="512" />
        </NFormItem>
        <NFormItem label="可见性">
          <NSelect v-model:value="editForm.visibility" :options="visibilityOptions" />
        </NFormItem>
        <NFormItem label="分级">
          <NSelect v-model:value="editForm.rating" :options="ratingOptions" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="editVisible = false">
            取消
          </NButton>
          <NButton type="primary" :loading="editSaving" @click="saveEdit">
            保存
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.header-section {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.header-section.compact {
  flex-direction: column;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.header-section.compact .toolbar {
  width: 100%;
}

.toolbar-field {
  width: 220px;
}

.toolbar-select {
  width: 140px;
}

.header-section.compact .toolbar-field,
.header-section.compact .toolbar-select {
  width: calc(50% - 4px);
  flex: 1 1 140px;
}

.header-section.compact .toolbar-field {
  flex-basis: 100%;
  width: 100%;
}

.title {
  margin: 0;
  font-size: 22px;
}

.subtitle {
  margin: 6px 0 0;
  opacity: 0.72;
}

.upload-progress {
  margin-bottom: 16px;
}

.upload-hint {
  margin: 4px 0 8px;
  font-size: 12px;
  color: #6b7280;
}

.hidden-input {
  display: none;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.pagination.compact {
  justify-content: center;
}

.mobile-list {
  display: grid;
  gap: 12px;
}

.video-card {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid #eceff3;
  border-radius: 12px;
  background: #fff;
}

.video-cover {
  width: 112px;
  height: 63px;
  object-fit: cover;
  border-radius: 8px;
  background: #f3f4f6;
}

.video-cover.is-empty {
  display: grid;
  place-items: center;
  font-size: 12px;
  color: #9ca3af;
}

.video-body {
  min-width: 0;
}

.video-body h3 {
  margin: 0 0 8px;
  font-size: 15px;
  line-height: 1.4;
}

.video-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
}

.video-time {
  margin: 8px 0;
  font-size: 12px;
  color: #9ca3af;
}

.video-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
