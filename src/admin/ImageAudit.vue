<script setup lang="ts">
import {
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCheckbox,
  NDataTable,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui'
import { useImageAuditPage } from '@/composables/useImageAuditPage'
import { formatDateOnly } from '@/utils/dateFormat'

const {
  availabilityStatus,
  availabilityCheckLoading,
  availabilityOptions,
  allCurrentImagesSelected,
  auditScopeOptions,
  auditableImages,
  batchRejectReason,
  bulkAuditLoading,
  checkCurrentPageAvailability,
  checkSelectedAvailability,
  columns,
  currentImagesIndeterminate,
  clearSelectedImages,
  deleteRequestReason,
  fetchData,
  getAvailabilityDetail,
  getAvailabilityMeta,
  getScopeLabel,
  getScopeOptionLabel,
  handleBatchPass,
  handleFilterSearch,
  handlePass,
  handleRequestDelete,
  handleScopeChange,
  handleSubmitBatchReject,
  handleSubmitDeleteRequest,
  handleSubmitReject,
  list,
  loading,
  onlyBroken,
  openBatchRejectModal,
  openRejectModal,
  pFilter,
  pageCount,
  pagination,
  pidFilter,
  rejectReason,
  resetFilters,
  scope,
  isAuditScope,
  selectedAuditableImages,
  selectedImageIds,
  setImageSelected,
  showBatchRejectModal,
  showDeleteRequestModal,
  showRejectModal,
  staleDays,
  submitting,
  toggleCurrentImageSelection,
} = useImageAuditPage()
</script>

<template>
  <div class="page-container" data-testid="image-audit-page">
    <!-- 头部 -->
    <div class="header-section">
      <div>
        <h2 class="title">
          图片库管理
        </h2>
        <p class="subtitle">
          管理数据库中的图片，由于 PID 和 p 唯一索引，支持精确搜索和审核
        </p>
      </div>
      <NButton :loading="loading" @click="fetchData">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar glass-card">
      <div class="scope-filter">
        <NRadioGroup v-model:value="scope" name="imageAuditScope" @update:value="handleScopeChange">
          <NRadioButton
            v-for="option in auditScopeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ getScopeOptionLabel(option.value) }}
          </NRadioButton>
        </NRadioGroup>
      </div>

      <div class="search-inputs">
        <div class="pid-filter-group">
          <NInputNumber
            v-model:value="pidFilter"
            class="pid-input"
            placeholder="PID"
            :min="1"
            :precision="0"
            :show-button="false"
            @keyup.enter="handleFilterSearch"
          />
          <span class="p-separator">_p</span>
          <NInputNumber
            v-model:value="pFilter"
            class="p-input"
            placeholder="p"
            :min="0"
            :precision="0"
            :show-button="false"
            @keyup.enter="handleFilterSearch"
          />
        </div>
        <NInputNumber
          v-if="scope === 'DUE_REVIEW'"
          v-model:value="staleDays"
          class="stale-input"
          placeholder="复审天数"
          :min="1"
          :max="365"
          :precision="0"
          :show-button="false"
          @keyup.enter="handleFilterSearch"
        />
        <NSelect
          v-model:value="availabilityStatus"
          class="availability-select"
          :options="availabilityOptions"
          @update:value="handleFilterSearch"
        />
        <NCheckbox v-model:checked="onlyBroken" :disabled="loading" @update:checked="handleFilterSearch">
          只看失效
        </NCheckbox>
        <div class="filter-actions">
          <NButton type="primary" :disabled="loading" @click="handleFilterSearch">
            <template #icon>
              <NIcon><SearchOutline /></NIcon>
            </template>
            查询
          </NButton>
          <NButton :disabled="loading" @click="resetFilters">
            重置
          </NButton>
          <NButton
            secondary
            :loading="availabilityCheckLoading"
            :disabled="loading || list.length === 0"
            @click="checkCurrentPageAvailability"
          >
            检测当前页
          </NButton>
        </div>
      </div>
      <div class="filter-meta">
        <span>当前 {{ getScopeLabel(scope) }} · 共 {{ pagination.itemCount }} 张</span>
        <span v-if="scope === 'DUE_REVIEW' && dueBefore">复审截止 {{ dueBefore }}</span>
      </div>
    </div>

    <div v-if="isAuditScope && list.length > 0" class="bulk-audit-bar glass-card">
      <div class="bulk-select">
        <NCheckbox
          :checked="allCurrentImagesSelected"
          :indeterminate="currentImagesIndeterminate"
          :disabled="loading || bulkAuditLoading"
          @update:checked="toggleCurrentImageSelection"
        >
          当前页图片
        </NCheckbox>
        <span class="bulk-count">已选 {{ selectedAuditableImages.length }} / {{ auditableImages.length }}</span>
      </div>
      <div class="bulk-actions">
        <NButton size="small" :disabled="loading || bulkAuditLoading || selectedAuditableImages.length === 0" @click="clearSelectedImages">
          清空选择
        </NButton>
        <NButton
          size="small"
          secondary
          :loading="availabilityCheckLoading"
          :disabled="loading || selectedAuditableImages.length === 0"
          @click="checkSelectedAvailability"
        >
          检测已选
        </NButton>
        <NButton
          size="small"
          type="warning"
          secondary
          :loading="bulkAuditLoading"
          :disabled="loading || selectedAuditableImages.length === 0"
          @click="openBatchRejectModal"
        >
          <template #icon>
            <NIcon><CloseCircleOutline /></NIcon>
          </template>
          批量问题
        </NButton>
        <NButton
          size="small"
          type="success"
          secondary
          :loading="bulkAuditLoading"
          :disabled="loading || selectedAuditableImages.length === 0"
          @click="handleBatchPass"
        >
          <template #icon>
            <NIcon><CheckmarkCircleOutline /></NIcon>
          </template>
          批量正常
        </NButton>
      </div>
    </div>

    <!-- 内容区域 -->
    <n-spin :show="loading">
      <!-- 列表模式 (桌面端) -->
      <NDataTable
        v-if="!isMobile"
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        remote
        :bordered="false"
        class="data-table"
        :scroll-x="1000"
      />

      <!-- 列表模式 (移动端卡片视图) -->
      <div v-else class="mobile-list-view" data-testid="image-audit-mobile-list">
        <div v-if="loading && list.length === 0" class="loading-placeholder">
          <!-- Loading handled by n-spin wrapper, but creates space if needed -->
        </div>
        <div v-else-if="list.length === 0" class="empty-state">
          <NIcon size="48" color="#ccc">
            <SearchOutline />
          </NIcon>
          <p style="color: #999">
            暂无数据
          </p>
        </div>

        <div v-else class="img-cards">
          <div
            v-for="row in list"
            :key="row.id"
            class="img-card glass-card"
            data-testid="image-audit-card"
            :class="{ 'selected-card': selectedImageIds.includes(row.id) }"
          >
            <div v-if="isAuditScope" class="mobile-card-select">
              <NCheckbox
                :checked="selectedImageIds.includes(row.id)"
                :disabled="loading || bulkAuditLoading"
                @update:checked="checked => setImageSelected(row, checked)"
              />
            </div>
            <div class="card-top">
              <NImage
                :src="row.urlOriginal"
                width="100%"
                height="200"
                object-fit="cover"
                :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
                style="border-radius: 8px 8px 0 0; display: block;"
                lazy
              />
              <div class="card-badges">
                <NTag :type="row.r18 ? 'error' : 'success'" size="small" style="margin-right: 4px">
                  {{ row.r18 ? 'R18' : '全年龄' }}
                </NTag>
                <NTag v-if="row.aiType === 2" type="warning" size="small">
                  AI
                </NTag>
                <NTag :type="getAvailabilityMeta(row.availabilityStatus).type" size="small">
                  {{ getAvailabilityMeta(row.availabilityStatus).label }}
                </NTag>
              </div>
            </div>

            <div class="card-content">
              <div class="card-pid">
                PID: {{ row.pid }}_p{{ row.p }}
              </div>
              <div class="card-title text-ellipsis">
                {{ row.title }}
              </div>
              <div class="card-author text-ellipsis">
                作者: {{ row.author }}
              </div>
              <div v-if="getAvailabilityDetail(row)" class="card-availability-detail">
                {{ getAvailabilityDetail(row) }}
              </div>

              <!-- Tags are not available in list dto -->

              <div class="card-audit-status" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #eee;">
                <div v-if="row.lastAuditTime">
                  <NTag :type="row.lastAuditStatus === 1 ? 'success' : 'warning'" size="tiny" bordered>
                    {{ row.lastAuditStatus === 1 ? '上次: 正常' : '上次: 问题' }}
                  </NTag>
                  <span style="font-size: 11px; color: #ccc; margin-left: 6px">{{ formatDateOnly(row.lastAuditTime) }}</span>
                </div>
                <div v-else style="font-size: 12px; color: #ccc">
                  未审核
                </div>
              </div>

              <div class="card-actions" :class="scope === 'ALL' ? 'all-actions' : 'audit-actions'">
                <NButton v-if="scope !== 'ALL'" size="small" type="success" secondary @click="handlePass(row)">
                  <template #icon>
                    <NIcon><CheckmarkCircleOutline /></NIcon>
                  </template>
                  正常
                </NButton>
                <NButton v-if="scope !== 'ALL'" size="small" type="warning" secondary @click="openRejectModal(row)">
                  <template #icon>
                    <NIcon><CloseCircleOutline /></NIcon>
                  </template>
                  问题
                </NButton>
                <NButton v-if="scope === 'ALL'" size="small" type="error" tertiary @click="handleRequestDelete(row.pid, row.p)">
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                  申请删除
                </NButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 移动端分页 -->
        <div v-if="list.length > 0" class="mobile-pagination">
          <NPagination
            v-model:page="pagination.page"
            :page-count="pageCount"
            :on-update:page="pagination.onChange"
            simple
          />
          <!-- Simple pagination for mobile to save space, or can use default but it might be too wide -->
        </div>
      </div>
    </n-spin>

    <!-- 问题反馈弹窗 -->
    <NModal
      v-model:show="showRejectModal"
      preset="dialog"
      title="标记为有问题"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="确认提交"
      negative-text="取消"
      :loading="submitting"
      @positive-click="handleSubmitReject"
      @negative-click="showRejectModal = false"
    >
      <NSpace vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          请填写问题描述，提交后将<b>自动创建删除申请</b>，等待二次确认后删除。
        </p>
        <NInput
          v-model:value="rejectReason"
          type="textarea"
          placeholder="例如：图片无法加载、内容不符、低质量等"
          :rows="3"
        />
      </NSpace>
    </NModal>

    <!-- 批量问题反馈弹窗 -->
    <NModal
      v-model:show="showBatchRejectModal"
      preset="dialog"
      title="批量标记为有问题"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="确认提交"
      negative-text="取消"
      :loading="submitting || bulkAuditLoading"
      @positive-click="handleSubmitBatchReject"
      @negative-click="showBatchRejectModal = false"
    >
      <NSpace vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          将批量标记已选 {{ selectedAuditableImages.length }} 张图片为<b>有问题</b>，后端会自动创建或复用待处理删除申请。
        </p>
        <NInput
          v-model:value="batchRejectReason"
          type="textarea"
          placeholder="例如：图片无法加载、内容不符、低质量等"
          :rows="3"
        />
      </NSpace>
    </NModal>

    <!-- 申请删除弹窗 -->
    <NModal
      v-model:show="showDeleteRequestModal"
      preset="dialog"
      title="申请删除图片"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="提交申请"
      negative-text="取消"
      :loading="submitting"
      @positive-click="handleSubmitDeleteRequest"
      @negative-click="showDeleteRequestModal = false"
    >
      <NSpace vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          提交后，该图片将进入“图片删除申请”列表，需管理员二次审核通过后才会从数据库永久移除。<br>
          <span style="color: #f59e0b">此操作将创建审计日志。</span>
        </p>
        <NInput
          v-model:value="deleteRequestReason"
          type="textarea"
          placeholder="请输入删除原因（必填）"
          :rows="3"
        />
      </NSpace>
    </NModal>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-width: 0;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  min-width: 0;
}

.header-section > div {
  min-width: 0;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 6px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.search-bar {
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.scope-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
  width: 100%;
}

.scope-filter :deep(.n-radio-group) {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;
}

.pid-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pid-input {
  width: 140px;
}

.p-input {
  width: 80px;
}

.p-separator {
  color: #c7ccd5;
}

.stale-input {
  width: 120px;
}

.availability-select {
  width: 150px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.filter-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: #6b7280;
}

.bulk-audit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.bulk-select {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bulk-count {
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 表格样式微调 */
:deep(.n-data-table .n-data-table-td) {
  vertical-align: middle;
}

/* 移动端卡片样式 */
.mobile-list-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.img-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 16px;
  min-width: 0;
}

@media (max-width: 600px) {
  .img-cards {
    grid-template-columns: 1fr;
  }
}

.img-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  border: 1px solid transparent;
  content-visibility: auto;
  contain-intrinsic-size: 360px;
}

.selected-card {
  border-color: rgba(245, 134, 169, 0.72) !important;
  box-shadow: 0 10px 28px rgba(245, 134, 169, 0.16) !important;
}

.mobile-card-select {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
}

.card-top {
  position: relative;
}

.card-top :deep(.n-image) {
  display: block;
  width: 100%;
  height: 200px;
}

.card-top :deep(.n-image img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.card-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.card-pid {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.card-title {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.card-author {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.card-availability-detail {
  color: #f59e0b;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  height: 22px; /* Fixed height for one line of tags approx */
  overflow: hidden;
}

.card-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
  min-width: 0;
}

.card-actions :deep(.n-button) {
  min-width: 0;
}

.mobile-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-bottom: 40px;
}

@media (max-width: 768px) {
  .page-container {
    padding: 0;
    max-width: 100%;
    width: 100%;
  }

  .header-section {
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .header-section .n-button {
    flex-shrink: 0;
  }

  .search-bar {
    padding: 14px;
    margin-bottom: 16px;
    overflow: hidden;
  }

  .scope-filter :deep(.n-radio-group) {
    width: 100%;
  }

  .scope-filter :deep(.n-radio-group--button-group) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    height: auto;
    line-height: normal;
    white-space: normal;
  }

  .scope-filter :deep(.n-radio-group__splitor) {
    display: none;
  }

  .scope-filter :deep(.n-radio-button) {
    width: 100%;
    min-width: 0;
    height: auto !important;
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
    border: 1px solid var(--n-button-border-color) !important;
    text-align: center;
    line-height: 1.25 !important;
    white-space: normal;
    border-radius: 8px !important;
  }

  .scope-filter :deep(.n-radio-button__state-border) {
    border-radius: 8px !important;
  }

  .search-inputs {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .pid-filter-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 84px);
    width: 100%;
    gap: 8px;
  }

  .pid-input,
  .p-input,
  .stale-input,
  .availability-select {
    width: 100%;
  }

  .filter-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 8px;
  }

  .filter-actions :deep(.n-button) {
    width: 100%;
  }

  .bulk-audit-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .bulk-select {
    justify-content: space-between;
    width: 100%;
  }

  .bulk-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .bulk-actions :deep(.n-button) {
    width: 100%;
  }

  .bulk-actions :deep(.n-button:first-child) {
    grid-column: 1 / -1;
  }

  .card-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .card-actions :deep(.n-button) {
    width: 100%;
  }

  .card-actions.all-actions :deep(.n-button) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 430px) {
  .header-section {
    flex-direction: column;
  }

  .header-section .n-button {
    width: 100%;
  }

  .title {
    font-size: 22px;
  }

  .subtitle {
    font-size: 13px;
  }

  .filter-meta {
    flex-direction: column;
    gap: 4px;
  }
}

@media (max-width: 360px) {
  .scope-filter :deep(.n-radio-group--button-group) {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .img-card {
    transition: none;
  }
}
</style>
