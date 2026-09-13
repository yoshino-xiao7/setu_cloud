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
import * as tus from 'tus-js-client'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import {
  createCloudVideoUploadSession,
  deleteAdminCloudVideo,
  fetchAdminCloudVideos,
  syncAdminCloudVideo,
  updateAdminCloudVideo,
} from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const loading = ref(false)
const videos = ref<CloudVideoItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const status = ref<string>('ALL')
const keywords = ref('')
const uploading = ref(false)
const uploadPercent = ref(0)
const uploadLabel = ref('')
let currentUpload: tus.Upload | null = null
let syncTimer: number | null = null

const editVisible = ref(false)
const editSaving = ref(false)
const editForm = ref({
  id: 0,
  title: '',
  description: '',
  tags: '',
  visibility: 'draft',
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

async function uploadFile(file: File) {
  uploading.value = true
  uploadPercent.value = 0
  uploadLabel.value = `正在创建 ${file.name}`
  try {
    const session = unwrapApiData(await createCloudVideoUploadSession(file.name.replace(/\.[^.]+$/, '') || file.name))
    await new Promise<void>((resolve, reject) => {
      currentUpload = new tus.Upload(file, {
        endpoint: session.tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: {
          AuthorizationSignature: session.authorizationSignature,
          AuthorizationExpire: String(session.authorizationExpire),
          LibraryId: String(session.libraryId),
          VideoId: session.bunnyVideoId,
        },
        metadata: {
          filename: file.name,
          filetype: file.type || 'video/mp4',
          title: session.title,
        },
        onError: error => reject(error),
        onProgress: (bytesUploaded, bytesTotal) => {
          uploadPercent.value = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0
          uploadLabel.value = `正在上传 ${file.name}（${uploadPercent.value}%）`
        },
        onSuccess: () => resolve(),
      })
      currentUpload.start()
    })
    uploadLabel.value = '正在同步转码状态'
    await syncAdminCloudVideo(session.id)
    message.success('上传完成，转码完成后即可发布')
    await loadList()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '上传云视频失败')
  }
  finally {
    currentUpload = null
    uploading.value = false
    uploadPercent.value = 0
    uploadLabel.value = ''
  }
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file)
    await uploadFile(file)
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
  if (!busy.length || uploading.value)
    return
  await Promise.allSettled(busy.map(item => syncAdminCloudVideo(item.id)))
  await loadList({ silent: true })
}

onMounted(() => {
  void loadList()
  syncTimer = window.setInterval(() => {
    void pollBusyVideos()
  }, 15000)
})

onUnmounted(() => {
  if (syncTimer)
    window.clearInterval(syncTimer)
  currentUpload?.abort(true)
})
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <div>
        <h2 class="title">
          云视频管理
        </h2>
        <p class="subtitle">
          直传到 Bunny Stream，转码完成后发布给登录用户观看。
        </p>
      </div>
      <NSpace>
        <NInput v-model:value="keywords" placeholder="搜索标题 / 标签" style="width: 220px" @keyup.enter="handleFilter" />
        <NSelect v-model:value="status" :options="statusOptions" style="width: 140px" @update:value="handleFilter" />
        <NButton secondary :loading="loading" @click="loadList">
          刷新
        </NButton>
        <NButton type="primary" :disabled="uploading" @click="pickFile">
          <template #icon>
            <NIcon><CloudUploadOutline /></NIcon>
          </template>
          上传视频
        </NButton>
        <input ref="fileInput" class="hidden-input" type="file" accept="video/*" @change="onFilePicked">
      </NSpace>
    </div>

    <div v-if="uploading" class="upload-progress">
      <p>{{ uploadLabel }}</p>
      <NProgress type="line" :percentage="uploadPercent" />
    </div>

    <NDataTable
      :columns="columns"
      :data="videos"
      :loading="loading"
      :pagination="false"
      :bordered="false"
    />
    <div v-if="total > pageSize" class="pagination">
      <NPagination :page="page" :page-count="pageCount" @update:page="handlePageChange" />
    </div>

    <NModal v-model:show="editVisible" preset="card" title="编辑云视频" style="width: 520px">
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
</style>
