<script setup lang="ts">
import type { UploadFileInfo, UploadInst } from 'naive-ui'
import type {
  GalleryPidMode,
  GallerySubmissionBatchDetail,
  GallerySubmissionBatchSummary,
  GalleryUploadCompleteItem,
  GalleryUploadInitItem,
  GalleryUploadStatus,
} from '@/api/galleryUpload'
import {
  AlbumsOutline,
  CloseCircleOutline,
  CloudUploadOutline,
  EyeOutline,
  RefreshOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NProgress,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  NUpload,
  NUploadDragger,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  calculateFileSha256,
  cancelGalleryUploadBatch,
  completeGalleryUploadBatch,
  createGalleryUploadBatch,
  fetchMyGalleryUploadBatchDetail,
  fetchMyGalleryUploadBatches,
  uploadGalleryFileToOss,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'
import {
  formatFileSize,
  GALLERY_PID_MODE_OPTIONS,
  GALLERY_UPLOAD_STATUS_OPTIONS,
  getGalleryPidModeLabel,
  getGalleryUploadStatusMeta,
  parseTagsInput,
} from '@/utils/galleryUploadStatus'

type LocalUploadStatus = 'pending' | 'hashing' | 'uploading' | 'finished' | 'error'

interface LocalUploadItem {
  id: string
  file: File
  filename: string
  contentType: string
  sizeBytes: number
  previewUrl: string
  pageIndex: number
  title: string
  author: string
  tagsText: string
  progress: number
  status: LocalUploadStatus
  sha256?: string
  submissionId?: number
  objectKey?: string
  etag?: string
  error?: string
}

const MAX_FILES = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_BATCH_SIZE = 100 * 1024 * 1024
const ACCEPT_TYPES = ['image/jpeg', 'image/png']

const message = useMessage()
const dialog = useDialog()

const activeTab = ref<'upload' | 'records'>('upload')
const uploadRef = ref<UploadInst | null>(null)
const fileList = ref<UploadFileInfo[]>([])
const uploadItems = ref<LocalUploadItem[]>([])
const includeSha256 = ref(true)
const uploading = ref(false)

const form = reactive({
  pidMode: 'MULTI_PID_P0' as GalleryPidMode,
  title: '',
  author: '',
  r18: false,
  aiType: 0,
  tagsText: '',
})

const aiTypeOptions = [
  { label: '未知', value: 0 },
  { label: '非 AI', value: 1 },
  { label: 'AI 生成', value: 2 },
]

const statusOptions = GALLERY_UPLOAD_STATUS_OPTIONS
const pidModeOptions = GALLERY_PID_MODE_OPTIONS
const totalSize = computed(() => uploadItems.value.reduce((sum, item) => sum + item.sizeBytes, 0))
const selectedCount = computed(() => uploadItems.value.length)
const canStartUpload = computed(() => selectedCount.value > 0 && !uploading.value)
const canPickFiles = computed(() => !uploading.value && selectedCount.value < MAX_FILES)

const recordsLoading = ref(false)
const records = ref<GallerySubmissionBatchSummary[]>([])
const recordsTotal = ref(0)
const recordsPage = ref(1)
const recordsPageSize = 10
const recordsStatus = ref('ALL')

const detailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref<GallerySubmissionBatchDetail | null>(null)

function revokePreviewUrl(url?: string) {
  if (url)
    URL.revokeObjectURL(url)
}

function makeLocalUploadItem(info: UploadFileInfo, index: number, existing?: LocalUploadItem): LocalUploadItem | null {
  const rawFile = info.file
  if (!rawFile)
    return null

  if (existing) {
    existing.pageIndex = Number.isFinite(existing.pageIndex) ? existing.pageIndex : index
    return existing
  }

  return {
    id: info.id,
    file: rawFile,
    filename: rawFile.name,
    contentType: rawFile.type,
    sizeBytes: rawFile.size,
    previewUrl: URL.createObjectURL(rawFile),
    pageIndex: index,
    title: '',
    author: '',
    tagsText: '',
    progress: 0,
    status: 'pending',
  }
}

function syncUploadItems(nextFileList: UploadFileInfo[]) {
  const previous = new Map(uploadItems.value.map(item => [item.id, item]))
  const nextItems = nextFileList
    .map((info, index) => makeLocalUploadItem(info, index, previous.get(info.id)))
    .filter((item): item is LocalUploadItem => !!item)

  const nextIds = new Set(nextItems.map(item => item.id))
  uploadItems.value.forEach((item) => {
    if (!nextIds.has(item.id))
      revokePreviewUrl(item.previewUrl)
  })

  uploadItems.value = nextItems.map((item, index) => ({
    ...item,
    pageIndex: form.pidMode === 'SINGLE_PID_MULTI_PAGE' && item.pageIndex >= 0 ? item.pageIndex : index,
  }))
}

function handleUploadChange(options: { fileList: UploadFileInfo[] }) {
  syncUploadItems(options.fileList)
}

function beforeUpload(options: { file: UploadFileInfo }) {
  const rawFile = options.file.file
  if (!rawFile)
    return false

  if (!ACCEPT_TYPES.includes(rawFile.type)) {
    message.warning('只支持 JPG 和 PNG 图片')
    return false
  }

  if (rawFile.size > MAX_FILE_SIZE) {
    message.warning(`${rawFile.name} 超过 10MB`)
    return false
  }

  return true
}

function removeUploadItem(item: LocalUploadItem) {
  revokePreviewUrl(item.previewUrl)
  uploadItems.value = uploadItems.value.filter(entry => entry.id !== item.id)
  fileList.value = fileList.value.filter(file => file.id !== item.id)
}

function openFilePicker() {
  if (!canPickFiles.value)
    return
  uploadRef.value?.openOpenFileDialog()
}

function resetUploadForm() {
  uploadItems.value.forEach(item => revokePreviewUrl(item.previewUrl))
  fileList.value = []
  uploadItems.value = []
}

function validateBeforeSubmit() {
  if (uploadItems.value.length === 0) {
    message.warning('请选择图片')
    return false
  }

  if (uploadItems.value.length > MAX_FILES) {
    message.warning(`单批次最多 ${MAX_FILES} 张图片`)
    return false
  }

  if (totalSize.value > MAX_BATCH_SIZE) {
    message.warning('单批次总大小不能超过 100MB')
    return false
  }

  const pageIndexes = new Set<number>()
  for (const item of uploadItems.value) {
    const title = item.title.trim() || form.title.trim()
    const author = item.author.trim() || form.author.trim()
    if (!title || !author) {
      message.warning(`${item.filename} 缺少标题或作者`)
      return false
    }

    if (form.pidMode === 'SINGLE_PID_MULTI_PAGE') {
      if (!Number.isInteger(item.pageIndex) || item.pageIndex < 0) {
        message.warning(`${item.filename} 的页码必须是非负整数`)
        return false
      }
      if (pageIndexes.has(item.pageIndex)) {
        message.warning('同一 PID 多页模式下页码不能重复')
        return false
      }
      pageIndexes.add(item.pageIndex)
    }
  }

  return true
}

function buildInitItems(): GalleryUploadInitItem[] {
  return uploadItems.value.map((item) => {
    const tags = parseTagsInput(item.tagsText)
    return {
      filename: item.filename,
      contentType: item.contentType,
      sizeBytes: item.sizeBytes,
      sha256: item.sha256,
      pageIndex: form.pidMode === 'SINGLE_PID_MULTI_PAGE' ? item.pageIndex : undefined,
      title: item.title.trim() || undefined,
      author: item.author.trim() || undefined,
      r18: undefined,
      aiType: undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
  })
}

async function handleStartUpload() {
  if (!validateBeforeSubmit())
    return

  uploading.value = true
  uploadItems.value = uploadItems.value.map(item => ({
    ...item,
    status: 'pending',
    progress: 0,
    error: undefined,
  }))

  try {
    if (includeSha256.value) {
      for (const item of uploadItems.value) {
        item.status = 'hashing'
        item.sha256 = await calculateFileSha256(item.file)
      }
    }

    const initResponse = unwrapApiData(await createGalleryUploadBatch({
      pidMode: form.pidMode,
      defaults: {
        title: form.title.trim() || undefined,
        author: form.author.trim() || undefined,
        r18: form.r18,
        aiType: form.aiType,
        tags: parseTagsInput(form.tagsText),
      },
      items: buildInitItems(),
    }))

    const completedItems: GalleryUploadCompleteItem[] = []
    for (let index = 0; index < uploadItems.value.length; index += 1) {
      const localItem = uploadItems.value[index]
      const preparedItem = initResponse.items.find(item => item.itemIndex === index) || initResponse.items[index]
      if (!localItem || !preparedItem)
        throw new Error('初始化响应缺少上传项')

      localItem.status = 'uploading'
      localItem.progress = 0
      localItem.submissionId = preparedItem.submissionId
      localItem.objectKey = preparedItem.objectKey

      const result = await uploadGalleryFileToOss({
        initResponse,
        uploadItem: preparedItem,
        file: localItem.file,
        onProgress: percent => (localItem.progress = percent),
      })

      localItem.status = 'finished'
      localItem.progress = 100
      localItem.etag = result.etag
      completedItems.push({
        submissionId: result.submissionId,
        objectKey: result.objectKey,
        etag: result.etag,
        sha256: localItem.sha256,
      })
    }

    const completed = unwrapApiData(await completeGalleryUploadBatch(initResponse.batchId, {
      items: completedItems,
    }))

    message.success(completed.message || '上传完成，等待管理员审核')
    resetUploadForm()
    activeTab.value = 'records'
    recordsPage.value = 1
    recordsStatus.value = 'ALL'
    await loadRecords()
  }
  catch (error) {
    const activeItem = uploadItems.value.find(item => item.status === 'hashing' || item.status === 'uploading')
    if (activeItem) {
      activeItem.status = 'error'
      activeItem.error = getApiErrorMessage(error, '上传失败')
    }
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '上传失败'))
  }
  finally {
    uploading.value = false
  }
}

async function loadRecords() {
  recordsLoading.value = true
  try {
    const status = recordsStatus.value === 'ALL' ? undefined : recordsStatus.value
    const data = unwrapApiData(await fetchMyGalleryUploadBatches({
      status: status as GalleryUploadStatus | undefined,
      page: recordsPage.value,
      pageSize: recordsPageSize,
    }), {
      total: 0,
      page: recordsPage.value,
      pageSize: recordsPageSize,
      list: [],
    })
    records.value = data.list || []
    recordsTotal.value = data.total || 0
    recordsPage.value = data.page || recordsPage.value
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '加载投稿记录失败'))
  }
  finally {
    recordsLoading.value = false
  }
}

function handleStatusChange() {
  recordsPage.value = 1
  void loadRecords()
}

function handleRecordPageChange(page: number) {
  recordsPage.value = page
  void loadRecords()
}

async function openDetail(batch: GallerySubmissionBatchSummary) {
  detailModal.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = unwrapApiData(await fetchMyGalleryUploadBatchDetail(batch.batchId), null)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '加载投稿详情失败'))
    detailModal.value = false
  }
  finally {
    detailLoading.value = false
  }
}

function canCancel(batch: GallerySubmissionBatchSummary) {
  return batch.status === 'UPLOADING' || batch.status === 'WAITING_MANUAL_REVIEW'
}

function confirmCancel(batch: GallerySubmissionBatchSummary) {
  dialog.warning({
    title: '取消投稿',
    content: `确认取消批次 #${batch.batchId} 吗？`,
    positiveText: '确认取消',
    negativeText: '保留',
    onPositiveClick: async () => {
      try {
        await cancelGalleryUploadBatch(batch.batchId)
        message.success('已取消投稿批次')
        await loadRecords()
      }
      catch (error) {
        if (!shouldIgnoreApiError(error))
          message.error(getApiErrorMessage(error, '取消失败'))
      }
    },
  })
}

function getItemStatusText(status: LocalUploadStatus) {
  if (status === 'hashing')
    return '计算 SHA-256'
  if (status === 'uploading')
    return '上传 OSS'
  if (status === 'finished')
    return '已上传'
  if (status === 'error')
    return '失败'
  return '待上传'
}

function publicImageLabel(item: { publicPid?: number | null, publicP?: number | null }) {
  if (item.publicPid === null || item.publicPid === undefined)
    return '-'
  return `${item.publicPid}_p${item.publicP ?? 0}`
}

onMounted(() => {
  void loadRecords()
})

onUnmounted(() => {
  uploadItems.value.forEach(item => revokePreviewUrl(item.previewUrl))
})
</script>

<template>
  <div class="page-container ui-page">
    <div class="page-header ui-page-header">
      <h1 class="page-title ui-page-title">
        <NIcon size="28" color="#f586a9">
          <CloudUploadOutline />
        </NIcon>
        图库投稿
      </h1>
      <NButton secondary :loading="recordsLoading" @click="loadRecords">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NTabs v-model:value="activeTab" type="segment" animated class="gallery-tabs">
      <NTabPane name="upload" tab="新投稿">
        <div class="upload-layout">
          <NCard :bordered="false" class="panel-card">
            <NForm label-placement="top" class="upload-form">
              <NGrid :cols="2" :x-gap="16" :y-gap="8" responsive="screen">
                <NGridItem span="2 m:1">
                  <NFormItem label="投稿模式">
                    <NRadioGroup v-model:value="form.pidMode" name="pidMode">
                      <NRadioButton
                        v-for="option in pidModeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="默认标题">
                    <NInput v-model:value="form.title" placeholder="标题" maxlength="80" clearable />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="默认作者">
                    <NInput v-model:value="form.author" placeholder="作者" maxlength="80" clearable />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="分级">
                    <NCheckbox v-model:checked="form.r18">
                      R18
                    </NCheckbox>
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="AI 类型">
                    <NSelect v-model:value="form.aiType" :options="aiTypeOptions" />
                  </NFormItem>
                </NGridItem>
                <NGridItem span="2">
                  <NFormItem label="默认标签">
                    <NInput v-model:value="form.tagsText" placeholder="用逗号或换行分隔" clearable />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NForm>
          </NCard>

          <NCard :bordered="false" class="panel-card">
            <NUpload
              ref="uploadRef"
              v-model:file-list="fileList"
              multiple
              :max="MAX_FILES"
              accept="image/jpeg,image/png"
              :default-upload="false"
              :show-file-list="false"
              :disabled="uploading"
              @before-upload="beforeUpload"
              @change="handleUploadChange"
            >
              <NUploadDragger
                class="upload-dragger"
                role="button"
                :tabindex="canPickFiles ? 0 : -1"
                @click.stop.prevent="openFilePicker"
                @keydown.enter.stop.prevent="openFilePicker"
                @keydown.space.stop.prevent="openFilePicker"
              >
                <NIcon size="34" color="#f586a9">
                  <CloudUploadOutline />
                </NIcon>
                <div class="dragger-title">
                  选择投稿图片
                </div>
                <div class="dragger-meta">
                  {{ selectedCount }}/20 · {{ formatFileSize(totalSize) }} / 100MB
                </div>
              </NUploadDragger>
            </NUpload>

            <div v-if="uploadItems.length > 0" class="selected-toolbar">
              <NCheckbox v-model:checked="includeSha256" :disabled="uploading">
                上传前计算 SHA-256
              </NCheckbox>
              <NButton tertiary size="small" :disabled="uploading" @click="resetUploadForm">
                清空
              </NButton>
            </div>

            <div v-if="uploadItems.length > 0" class="file-list">
              <div v-for="item in uploadItems" :key="item.id" class="file-row">
                <div class="file-preview">
                  <img :src="item.previewUrl" :alt="item.filename">
                </div>
                <div class="file-editor">
                  <div class="file-head">
                    <div>
                      <div class="file-name">
                        {{ item.filename }}
                      </div>
                      <div class="file-meta">
                        {{ item.contentType }} · {{ formatFileSize(item.sizeBytes) }}
                      </div>
                    </div>
                    <NButton
                      quaternary
                      circle
                      size="small"
                      :disabled="uploading"
                      @click="removeUploadItem(item)"
                    >
                      <template #icon>
                        <NIcon><TrashOutline /></NIcon>
                      </template>
                    </NButton>
                  </div>

                  <div class="item-fields">
                    <NInput v-model:value="item.title" size="small" placeholder="单图标题（可选）" clearable />
                    <NInput v-model:value="item.author" size="small" placeholder="单图作者（可选）" clearable />
                    <NInputNumber
                      v-if="form.pidMode === 'SINGLE_PID_MULTI_PAGE'"
                      v-model:value="item.pageIndex"
                      size="small"
                      :min="0"
                      :precision="0"
                      placeholder="页码"
                    />
                    <NInput v-model:value="item.tagsText" size="small" placeholder="单图标签（可选）" clearable />
                  </div>

                  <div v-if="item.status !== 'pending'" class="progress-row">
                    <span>{{ getItemStatusText(item.status) }}</span>
                    <NProgress
                      type="line"
                      :percentage="item.status === 'hashing' ? 0 : item.progress"
                      :status="item.status === 'error' ? 'error' : item.status === 'finished' ? 'success' : 'default'"
                      :processing="item.status === 'hashing' || item.status === 'uploading'"
                    />
                  </div>
                  <div v-if="item.error" class="item-error">
                    {{ item.error }}
                  </div>
                </div>
              </div>
            </div>

            <div class="submit-bar">
              <NButton
                type="primary"
                size="large"
                :loading="uploading"
                :disabled="!canStartUpload"
                @click="handleStartUpload"
              >
                <template #icon>
                  <NIcon><CloudUploadOutline /></NIcon>
                </template>
                提交投稿
              </NButton>
            </div>
          </NCard>
        </div>
      </NTabPane>

      <NTabPane name="records" tab="我的投稿">
        <NCard :bordered="false" class="panel-card records-panel">
          <div class="records-toolbar">
            <NSelect
              v-model:value="recordsStatus"
              class="status-select"
              :options="statusOptions"
              @update:value="handleStatusChange"
            />
            <NButton secondary :loading="recordsLoading" @click="loadRecords">
              <template #icon>
                <NIcon><RefreshOutline /></NIcon>
              </template>
              刷新
            </NButton>
          </div>

          <NSpin :show="recordsLoading">
            <div v-if="records.length > 0" class="record-list">
              <div v-for="batch in records" :key="batch.batchId" class="record-card">
                <div class="record-main">
                  <div class="record-icon">
                    <NIcon size="24">
                      <AlbumsOutline />
                    </NIcon>
                  </div>
                  <div class="record-content">
                    <div class="record-title">
                      {{ batch.title || `投稿批次 #${batch.batchId}` }}
                    </div>
                    <div class="record-meta">
                      <span>#{{ batch.batchId }}</span>
                      <span>{{ getGalleryPidModeLabel(batch.pidMode) }}</span>
                      <span>{{ batch.itemCount }} 张</span>
                      <span>{{ formatDate(batch.createdAt) }}</span>
                    </div>
                    <div v-if="batch.tags?.length" class="tag-row">
                      <NTag v-for="tag in batch.tags.slice(0, 6)" :key="tag" size="small" round>
                        {{ tag }}
                      </NTag>
                    </div>
                  </div>
                </div>

                <div class="record-stats">
                  <NTag :type="getGalleryUploadStatusMeta(batch.status).type" round>
                    {{ getGalleryUploadStatusMeta(batch.status).label }}
                  </NTag>
                  <div class="count-line">
                    {{ batch.uploadedCount }}/{{ batch.itemCount }} 已上传
                  </div>
                  <div v-if="batch.publishedCount > 0" class="count-line">
                    {{ batch.publishedCount }} 已发布
                  </div>
                </div>

                <div class="record-actions">
                  <NButton secondary size="small" @click="openDetail(batch)">
                    <template #icon>
                      <NIcon><EyeOutline /></NIcon>
                    </template>
                    详情
                  </NButton>
                  <NButton
                    v-if="canCancel(batch)"
                    tertiary
                    type="error"
                    size="small"
                    @click="confirmCancel(batch)"
                  >
                    <template #icon>
                      <NIcon><CloseCircleOutline /></NIcon>
                    </template>
                    取消
                  </NButton>
                </div>
              </div>
            </div>
            <div v-else class="empty-box">
              <NEmpty description="暂无投稿记录" />
            </div>
          </NSpin>

          <div v-if="recordsTotal > recordsPageSize" class="pagination-wrapper">
            <NPagination
              :page="recordsPage"
              :page-count="Math.ceil(recordsTotal / recordsPageSize)"
              @update:page="handleRecordPageChange"
            />
          </div>
        </NCard>
      </NTabPane>
    </NTabs>

    <NModal v-model:show="detailModal">
      <NCard class="detail-card" :bordered="false">
        <template #header>
          <div class="modal-title">
            <NIcon size="22" color="#f586a9">
              <EyeOutline />
            </NIcon>
            投稿详情
          </div>
        </template>

        <NSpin :show="detailLoading">
          <div v-if="detailData" class="detail-content">
            <div class="detail-summary">
              <div>
                <div class="detail-name">
                  {{ detailData.title || `投稿批次 #${detailData.batchId}` }}
                </div>
                <div class="detail-meta">
                  #{{ detailData.batchId }} · {{ getGalleryPidModeLabel(detailData.pidMode) }} · {{ formatDate(detailData.createdAt) }}
                </div>
              </div>
              <NTag :type="getGalleryUploadStatusMeta(detailData.status).type" round>
                {{ getGalleryUploadStatusMeta(detailData.status).label }}
              </NTag>
            </div>

            <div class="detail-grid">
              <div v-for="item in detailData.items" :key="item.submissionId" class="detail-item">
                <div class="detail-image">
                  <NImage
                    v-if="item.previewUrl"
                    :src="item.previewUrl"
                    object-fit="cover"
                    :img-props="{ referrerpolicy: 'no-referrer' }"
                  />
                  <div v-else class="no-preview">
                    <NIcon size="24">
                      <AlbumsOutline />
                    </NIcon>
                  </div>
                </div>
                <div class="detail-item-body">
                  <div class="detail-item-title">
                    {{ item.title || detailData.title || item.objectKey }}
                  </div>
                  <div class="detail-item-meta">
                    <span>submission {{ item.submissionId }}</span>
                    <span v-if="item.pageIndex !== null && item.pageIndex !== undefined">p{{ item.pageIndex }}</span>
                    <span>{{ formatFileSize(item.sizeBytes) }}</span>
                  </div>
                  <div class="detail-item-meta">
                    <span>发布 PID：{{ publicImageLabel(item) }}</span>
                  </div>
                  <div v-if="item.rejectReason" class="reject-reason">
                    {{ item.rejectReason }}
                  </div>
                  <div v-if="item.tags?.length" class="tag-row">
                    <NTag v-for="tag in item.tags.slice(0, 6)" :key="tag" size="small">
                      {{ tag }}
                    </NTag>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!detailLoading" class="empty-box">
            <NEmpty description="未找到详情" />
          </div>
        </NSpin>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.gallery-tabs {
  margin-top: 18px;
}

.upload-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.3fr);
  gap: 18px;
}

.panel-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 38px rgba(31, 41, 55, 0.08);
}

.upload-form :deep(.n-form-item) {
  margin-bottom: 2px;
}

.upload-dragger {
  border-radius: 8px;
  padding: 28px 18px;
}

.dragger-title {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #263247;
}

.dragger-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.selected-toolbar,
.records-toolbar,
.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.file-list,
.record-list,
.detail-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.file-row {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.file-preview,
.detail-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
}

.file-preview img,
.detail-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-editor {
  min-width: 0;
}

.file-head,
.record-main,
.detail-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.file-name,
.record-title,
.detail-name,
.detail-item-title {
  font-weight: 700;
  color: #263247;
  overflow-wrap: anywhere;
}

.file-meta,
.record-meta,
.detail-meta,
.detail-item-meta,
.count-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.item-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.progress-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
}

.item-error,
.reject-reason {
  margin-top: 8px;
  color: #dc2626;
  font-size: 13px;
}

.records-panel {
  min-height: 360px;
}

.status-select {
  width: 220px;
}

.record-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 16px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
}

.record-icon {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: #f26d99;
  background: rgba(245, 134, 169, 0.14);
}

.record-content {
  min-width: 0;
  flex: 1;
}

.record-stats,
.record-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.empty-box {
  display: grid;
  place-items: center;
  min-height: 220px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-card {
  width: min(920px, 94vw);
  max-height: 86vh;
  overflow: auto;
  border-radius: 8px;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-summary {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.detail-item {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.no-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #94a3b8;
}

@media (max-width: 980px) {
  .upload-layout,
  .record-card {
    grid-template-columns: 1fr;
  }

  .record-stats,
  .record-actions {
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .file-row,
  .detail-item {
    grid-template-columns: 1fr;
  }

  .file-preview,
  .detail-image {
    max-height: 220px;
  }

  .item-fields,
  .progress-row {
    grid-template-columns: 1fr;
  }

  .selected-toolbar,
  .records-toolbar,
  .submit-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .status-select {
    width: 100%;
  }
}
</style>
