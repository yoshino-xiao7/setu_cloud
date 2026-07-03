<script setup lang="ts">
import {
  AlbumsOutline,
  CloseCircleOutline,
  CloudUploadOutline,
  EyeOutline,
  RefreshOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
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
} from 'naive-ui'
import { useGalleryUploadPage } from '@/composables/useGalleryUploadPage'
import { formatDate } from '@/utils/dateFormat'
import {
  formatFileSize,
  getGalleryPidModeLabel,
  getGalleryUploadStatusMeta,
} from '@/utils/galleryUploadStatus'

const {
  activeTab,
  aiTypeOptions,
  canCancel,
  canPickFiles,
  canStartUpload,
  confirmCancel,
  detailData,
  detailLoading,
  detailModal,
  draftRestoredNotice,
  draftRestoreMessage,
  form,
  GALLERY_UPLOAD_MAX_FILES,
  getItemStatusText,
  handleDraftAlertClose,
  handleNativeFileChange,
  handleRecordPageChange,
  handleStartUpload,
  handleStatusChange,
  includeSha256,
  isExpiredUploadStatus,
  loadRecords,
  nativeFileInputRef,
  openDetail,
  openNativeFilePicker,
  pidModeOptions,
  publicImageLabel,
  records,
  recordsLoading,
  recordsPage,
  recordsPageSize,
  recordsStatus,
  recordsTotal,
  removeUploadItem,
  resetUploadForm,
  selectedCount,
  statusOptions,
  submitError,
  totalSize,
  uploadItems,
  uploading,
} = useGalleryUploadPage()
</script>

<template>
  <div class="page-container ui-page" data-testid="gallery-upload-page">
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
                    <NRadioGroup v-model:value="form.pidMode" name="pidMode" :disabled="uploading">
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
                    <NInput v-model:value="form.title" placeholder="标题" maxlength="80" clearable :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="默认作者">
                    <NInput v-model:value="form.author" placeholder="作者" maxlength="80" clearable :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="分级">
                    <NCheckbox v-model:checked="form.r18" :disabled="uploading">
                      R18
                    </NCheckbox>
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="AI 类型">
                    <NSelect v-model:value="form.aiType" :options="aiTypeOptions" :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
                <NGridItem span="2">
                  <NFormItem label="默认标签">
                    <NInput v-model:value="form.tagsText" placeholder="用逗号或换行分隔" clearable :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NForm>
          </NCard>

          <NCard :bordered="false" class="panel-card">
            <NAlert
              v-if="draftRestoredNotice"
              type="info"
              closable
              class="upload-alert"
              @close="handleDraftAlertClose"
            >
              {{ draftRestoreMessage }}
            </NAlert>

            <NAlert
              v-if="submitError"
              type="error"
              class="upload-alert"
            >
              {{ submitError }}
            </NAlert>

            <div
              class="upload-dragger native-upload-trigger"
              data-testid="gallery-upload-picker"
              role="button"
              :tabindex="canPickFiles ? 0 : -1"
              :aria-disabled="!canPickFiles"
              @keydown.enter.stop.prevent="openNativeFilePicker"
              @keydown.space.stop.prevent="openNativeFilePicker"
            >
              <input
                ref="nativeFileInputRef"
                class="native-file-input"
                data-testid="gallery-upload-file-input"
                type="file"
                multiple
                accept="image/jpeg,image/png"
                :disabled="!canPickFiles"
                tabindex="-1"
                aria-label="选择投稿图片"
                @change="handleNativeFileChange"
              >
              <NIcon size="34" color="#f586a9">
                <CloudUploadOutline />
              </NIcon>
              <div class="dragger-title">
                选择投稿图片
              </div>
              <div class="dragger-meta">
                {{ selectedCount }}/{{ GALLERY_UPLOAD_MAX_FILES }} · {{ formatFileSize(totalSize) }} / 100MB
              </div>
            </div>

            <div v-if="uploadItems.length > 0" class="selected-toolbar">
              <NCheckbox v-model:checked="includeSha256" :disabled="uploading">
                上传前计算 SHA-256
              </NCheckbox>
              <NButton tertiary size="small" :disabled="uploading" @click="resetUploadForm">
                清空
              </NButton>
            </div>

            <div v-if="uploadItems.length > 0" class="file-list">
              <div v-for="item in uploadItems" :key="item.id" class="file-row" data-testid="gallery-upload-file-row">
                <div class="file-preview">
                  <img :src="item.previewUrl" :alt="item.filename" loading="lazy" decoding="async">
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
                    <NInput v-model:value="item.title" size="small" placeholder="单图标题（可选）" clearable :disabled="uploading" />
                    <NInput v-model:value="item.author" size="small" placeholder="单图作者（可选）" clearable :disabled="uploading" />
                    <NInputNumber
                      v-if="form.pidMode === 'SINGLE_PID_MULTI_PAGE'"
                      v-model:value="item.pageIndex"
                      size="small"
                      :min="0"
                      :precision="0"
                      placeholder="页码"
                      :disabled="uploading"
                    />
                    <NInput v-model:value="item.tagsText" size="small" placeholder="单图标签（可选）" clearable :disabled="uploading" />
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
                  <div v-if="isExpiredUploadStatus(batch.status)" class="count-line expired-line">
                    上传已过期，请重新投稿
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

            <NAlert
              v-if="isExpiredUploadStatus(detailData.status)"
              type="error"
              title="上传已过期"
              class="detail-alert"
            >
              该投稿批次的上传窗口已过期，后端可能已清理未完成的 OSS 对象。请重新发起投稿。
            </NAlert>

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
                    <NTag size="tiny" :type="getGalleryUploadStatusMeta(item.status).type">
                      {{ getGalleryUploadStatusMeta(item.status).label }}
                    </NTag>
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

.upload-alert {
  margin-bottom: 12px;
}

.upload-dragger {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 8px;
  padding: 28px 18px;
  border: 1px dashed rgba(245, 134, 169, 0.52);
  background: rgba(255, 255, 255, 0.56);
  cursor: pointer;
  overflow: hidden;
  text-align: center;
  touch-action: manipulation;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.upload-dragger:hover,
.upload-dragger:focus-visible {
  border-color: rgba(245, 134, 169, 0.9);
  background: rgba(255, 247, 250, 0.74);
  outline: none;
}

.native-upload-trigger[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.62;
}

.native-file-input {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
}

.native-file-input:disabled {
  cursor: not-allowed;
  pointer-events: none;
}

.native-upload-trigger > :not(.native-file-input) {
  pointer-events: none;
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
  content-visibility: auto;
  contain-intrinsic-size: 116px;
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

.expired-line {
  color: #dc2626;
  font-weight: 700;
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

.detail-alert {
  margin-top: 14px;
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
