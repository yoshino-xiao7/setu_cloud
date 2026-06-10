<script setup lang="ts">
import type {
  GallerySubmissionBatchDetail,
  GallerySubmissionBatchSummary,
  GalleryUploadStatus,
} from '@/api/galleryUpload'
import {
  AlbumsOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  EyeOutline,
  RefreshOutline,
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
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  approveAdminGallerySubmissionBatch,
  fetchAdminGallerySubmissionBatchDetail,
  fetchAdminGallerySubmissionBatches,
  rejectAdminGallerySubmissionBatch,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'
import {
  formatFileSize,
  GALLERY_UPLOAD_STATUS_OPTIONS,
  getGalleryPidModeLabel,
  getGalleryUploadStatusMeta,
  parseTagsInput,
} from '@/utils/galleryUploadStatus'

type R18Override = 'KEEP' | 'SAFE' | 'R18'

const message = useMessage()

const loading = ref(false)
const list = ref<GallerySubmissionBatchSummary[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const status = ref<GalleryUploadStatus>('WAITING_MANUAL_REVIEW')
const statusOptions = GALLERY_UPLOAD_STATUS_OPTIONS

const detailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref<GallerySubmissionBatchDetail | null>(null)

const approveModal = ref(false)
const rejectModal = ref(false)
const submitting = ref(false)
const currentBatch = ref<GallerySubmissionBatchSummary | GallerySubmissionBatchDetail | null>(null)

const approveForm = reactive({
  remark: '人工审核通过',
  publishNow: true,
  r18: 'KEEP' as R18Override,
  aiType: -1,
  tagsText: '',
})

const rejectForm = reactive({
  reason: '',
  severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
})

const aiTypeOptions = [
  { label: '不覆盖', value: -1 },
  { label: '未知', value: 0 },
  { label: '非 AI', value: 1 },
  { label: 'AI 生成', value: 2 },
]

const r18Options = [
  { label: '不覆盖', value: 'KEEP' },
  { label: '全年龄', value: 'SAFE' },
  { label: 'R18', value: 'R18' },
]

const severityOptions = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' },
]

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function loadData() {
  loading.value = true
  try {
    const queryStatus = status.value === 'ALL' ? undefined : status.value
    const data = unwrapApiData(await fetchAdminGallerySubmissionBatches({
      status: queryStatus,
      page: page.value,
      pageSize,
    }), {
      total: 0,
      page: page.value,
      pageSize,
      list: [],
    })
    list.value = data.list || []
    total.value = data.total || 0
    page.value = data.page || page.value
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '加载投稿审核列表失败'))
  }
  finally {
    loading.value = false
  }
}

function handleStatusChange() {
  page.value = 1
  void loadData()
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadData()
}

async function openDetail(batch: GallerySubmissionBatchSummary) {
  detailModal.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = unwrapApiData(await fetchAdminGallerySubmissionBatchDetail(batch.batchId), null)
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

function openApprove(batch: GallerySubmissionBatchSummary | GallerySubmissionBatchDetail) {
  currentBatch.value = batch
  approveForm.remark = '人工审核通过'
  approveForm.publishNow = true
  approveForm.r18 = 'KEEP'
  approveForm.aiType = -1
  approveForm.tagsText = Array.isArray(batch.tags) ? batch.tags.join(', ') : ''
  approveModal.value = true
}

function openReject(batch: GallerySubmissionBatchSummary | GallerySubmissionBatchDetail) {
  currentBatch.value = batch
  rejectForm.reason = ''
  rejectForm.severity = 'MEDIUM'
  rejectModal.value = true
}

async function submitApprove() {
  if (!currentBatch.value)
    return

  submitting.value = true
  try {
    const tags = parseTagsInput(approveForm.tagsText)
    await approveAdminGallerySubmissionBatch(currentBatch.value.batchId, {
      remark: approveForm.remark.trim() || undefined,
      publishNow: approveForm.publishNow,
      r18: approveForm.r18 === 'KEEP' ? undefined : approveForm.r18 === 'R18',
      aiType: approveForm.aiType < 0 ? undefined : approveForm.aiType,
      normalizedTags: tags.length > 0 ? tags : undefined,
    })
    message.success('已审核通过')
    approveModal.value = false
    detailModal.value = false
    await loadData()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '审核通过失败'))
  }
  finally {
    submitting.value = false
  }
}

async function submitReject() {
  if (!currentBatch.value)
    return
  if (!rejectForm.reason.trim()) {
    message.warning('请填写拒绝原因')
    return
  }

  submitting.value = true
  try {
    await rejectAdminGallerySubmissionBatch(currentBatch.value.batchId, {
      reason: rejectForm.reason.trim(),
      severity: rejectForm.severity,
    })
    message.success('已拒绝投稿')
    rejectModal.value = false
    detailModal.value = false
    await loadData()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      message.error(getApiErrorMessage(error, '拒绝失败'))
  }
  finally {
    submitting.value = false
  }
}

function publicImageLabel(item: { publicPid?: number | null, publicP?: number | null }) {
  if (item.publicPid === null || item.publicPid === undefined)
    return '-'
  return `${item.publicPid}_p${item.publicP ?? 0}`
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1>
          <NIcon size="28" color="#f586a9">
            <AlbumsOutline />
          </NIcon>
          投稿审核
        </h1>
        <p>图库投稿批次</p>
      </div>
      <NButton secondary :loading="loading" @click="loadData">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard :bordered="false" class="panel-card">
      <div class="toolbar">
        <NSelect
          v-model:value="status"
          class="status-select"
          :options="statusOptions"
          @update:value="handleStatusChange"
        />
      </div>

      <NSpin :show="loading">
        <div v-if="list.length > 0" class="batch-list">
          <div v-for="batch in list" :key="batch.batchId" class="batch-card">
            <div class="batch-main">
              <div class="batch-icon">
                <NIcon size="24">
                  <AlbumsOutline />
                </NIcon>
              </div>
              <div class="batch-content">
                <div class="batch-title">
                  {{ batch.title || `投稿批次 #${batch.batchId}` }}
                </div>
                <div class="batch-meta">
                  <span>#{{ batch.batchId }}</span>
                  <span>用户 {{ batch.userId }}</span>
                  <span>{{ getGalleryPidModeLabel(batch.pidMode) }}</span>
                  <span>{{ batch.itemCount }} 张</span>
                  <span>{{ formatDate(batch.createdAt) }}</span>
                </div>
                <div v-if="batch.tags?.length" class="tag-row">
                  <NTag v-for="tag in batch.tags.slice(0, 8)" :key="tag" size="small">
                    {{ tag }}
                  </NTag>
                </div>
              </div>
            </div>

            <div class="batch-status">
              <NTag :type="getGalleryUploadStatusMeta(batch.status).type" round>
                {{ getGalleryUploadStatusMeta(batch.status).label }}
              </NTag>
              <span>{{ batch.uploadedCount }}/{{ batch.itemCount }} 已上传</span>
            </div>

            <div class="batch-actions">
              <NButton secondary size="small" @click="openDetail(batch)">
                <template #icon>
                  <NIcon><EyeOutline /></NIcon>
                </template>
                详情
              </NButton>
              <NButton
                v-if="batch.status === 'WAITING_MANUAL_REVIEW'"
                type="primary"
                size="small"
                @click="openApprove(batch)"
              >
                <template #icon>
                  <NIcon><CheckmarkCircleOutline /></NIcon>
                </template>
                通过
              </NButton>
              <NButton
                v-if="batch.status === 'WAITING_MANUAL_REVIEW'"
                type="error"
                tertiary
                size="small"
                @click="openReject(batch)"
              >
                <template #icon>
                  <NIcon><CloseCircleOutline /></NIcon>
                </template>
                拒绝
              </NButton>
            </div>
          </div>
        </div>
        <div v-else class="empty-box">
          <NEmpty description="暂无投稿批次" />
        </div>
      </NSpin>

      <div v-if="total > pageSize" class="pagination-wrapper">
        <NPagination :page="page" :page-count="pageCount" @update:page="handlePageChange" />
      </div>
    </NCard>

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
                  #{{ detailData.batchId }} · 用户 {{ detailData.userId }} · {{ getGalleryPidModeLabel(detailData.pidMode) }}
                </div>
              </div>
              <NTag :type="getGalleryUploadStatusMeta(detailData.status).type" round>
                {{ getGalleryUploadStatusMeta(detailData.status).label }}
              </NTag>
            </div>

            <div class="detail-grid">
              <div v-for="item in detailData.items" :key="item.submissionId" class="detail-item">
                <div class="preview-box">
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
                    <span>{{ item.contentType || '-' }}</span>
                  </div>
                  <div class="detail-item-meta">
                    <span>{{ item.width || '-' }} × {{ item.height || '-' }}</span>
                    <span>发布 PID：{{ publicImageLabel(item) }}</span>
                  </div>
                  <div v-if="item.rejectReason" class="reject-reason">
                    {{ item.rejectReason }}
                  </div>
                  <div v-if="item.tags?.length" class="tag-row">
                    <NTag v-for="tag in item.tags.slice(0, 8)" :key="tag" size="small">
                      {{ tag }}
                    </NTag>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="detailData.status === 'WAITING_MANUAL_REVIEW'" class="detail-actions">
              <NButton type="primary" @click="openApprove(detailData)">
                <template #icon>
                  <NIcon><CheckmarkCircleOutline /></NIcon>
                </template>
                通过并发布
              </NButton>
              <NButton type="error" tertiary @click="openReject(detailData)">
                <template #icon>
                  <NIcon><CloseCircleOutline /></NIcon>
                </template>
                拒绝
              </NButton>
            </div>
          </div>
          <div v-else-if="!detailLoading" class="empty-box">
            <NEmpty description="未找到详情" />
          </div>
        </NSpin>
      </NCard>
    </NModal>

    <NModal v-model:show="approveModal">
      <NCard class="review-card" title="审核通过" :bordered="false">
        <NForm label-placement="top">
          <NGrid :cols="2" :x-gap="14" :y-gap="6" responsive="screen">
            <NGridItem span="2">
              <NFormItem label="审核备注">
                <NInput v-model:value="approveForm.remark" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="发布">
                <NCheckbox v-model:checked="approveForm.publishNow">
                  立即发布
                </NCheckbox>
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="R18 覆盖">
                <NSelect v-model:value="approveForm.r18" :options="r18Options" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="AI 类型覆盖">
                <NSelect v-model:value="approveForm.aiType" :options="aiTypeOptions" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="规范化标签">
                <NInput v-model:value="approveForm.tagsText" placeholder="用逗号或换行分隔" clearable />
              </NFormItem>
            </NGridItem>
          </NGrid>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="approveModal = false">
              取消
            </NButton>
            <NButton type="primary" :loading="submitting" @click="submitApprove">
              确认通过
            </NButton>
          </NSpace>
        </template>
      </NCard>
    </NModal>

    <NModal v-model:show="rejectModal">
      <NCard class="review-card" title="拒绝投稿" :bordered="false">
        <NForm label-placement="top">
          <NFormItem label="拒绝原因">
            <NInput
              v-model:value="rejectForm.reason"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 7 }"
              maxlength="300"
              show-count
            />
          </NFormItem>
          <NFormItem label="严重程度">
            <NSelect v-model:value="rejectForm.severity" :options="severityOptions" />
          </NFormItem>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="rejectModal = false">
              取消
            </NButton>
            <NButton type="error" :loading="submitting" @click="submitReject">
              确认拒绝
            </NButton>
          </NSpace>
        </template>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #263247;
  font-size: 26px;
}

.page-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.panel-card,
.detail-card,
.review-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 16px 38px rgba(31, 41, 55, 0.08);
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.status-select {
  width: 240px;
}

.batch-list,
.detail-grid {
  display: grid;
  gap: 12px;
}

.batch-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
}

.batch-main,
.detail-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.batch-icon {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: #f26d99;
  background: rgba(245, 134, 169, 0.14);
}

.batch-content {
  min-width: 0;
  flex: 1;
}

.batch-title,
.detail-name,
.detail-item-title {
  color: #263247;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.batch-meta,
.detail-meta,
.detail-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.batch-status,
.batch-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.empty-box {
  display: grid;
  min-height: 240px;
  place-items: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-card {
  width: min(960px, 94vw);
  max-height: 86vh;
  overflow: auto;
}

.review-card {
  width: min(620px, 94vw);
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

.detail-grid {
  margin-top: 16px;
}

.detail-item {
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.preview-box {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
}

.preview-box :deep(.n-image),
.preview-box :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-box :deep(img) {
  object-fit: cover;
}

.no-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #94a3b8;
}

.reject-reason {
  margin-top: 8px;
  color: #dc2626;
  font-size: 13px;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .batch-card {
    grid-template-columns: 1fr;
  }

  .batch-status,
  .batch-actions {
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .admin-page {
    padding: 16px;
  }

  .page-header,
  .detail-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .status-select {
    width: 100%;
  }

  .toolbar {
    justify-content: stretch;
  }

  .detail-item {
    grid-template-columns: 1fr;
  }

  .preview-box {
    max-height: 240px;
  }
}
</style>
