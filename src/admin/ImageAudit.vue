<script setup lang="ts">
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  RefreshOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCheckbox,
  NIcon,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
} from 'naive-ui'
import { UiBoard, UiMosaic, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useImageAuditPage } from '@/composables/useImageAuditPage'
import { formatDateOnly } from '@/utils/dateFormat'

const {
  loadError,
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
  dueBefore,
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
  <UiBoard class="page-container" data-testid="image-audit-page">
    <!-- 头部 -->
    <div class="board-header-section">
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
    <div class="search-bar">
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

    <div v-if="isAuditScope && list.length > 0" class="bulk-audit-bar">
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

    <section v-if="list.length" class="board__section" aria-label="图片预览">
      <h3>图片预览</h3>
      <UiMosaic :items="list" :item-key="row => row.id" :aspect-ratio="row => row.width / row.height">
        <template #item="{ item: row }">
          <figure class="audit-preview">
            <NImage :src="row.urlOriginal" width="100%" object-fit="contain" :img-props="{ alt: row.title, referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }" :previewed-img-props="{ style: { maxHeight: '90vh' } }" lazy />
            <figcaption>{{ row.pid }}_p{{ row.p }} · {{ row.title }}</figcaption>
          </figure>
        </template>
      </UiMosaic>
    </section>
    <UiRecordBoard :error="loadError" :items="list" :loading="loading" empty="暂无数据" :item-key="row => row.id" data-testid="image-audit-mobile-list">
      <template #error>
        {{ loadError }}<NButton @click="fetchData()">
          重试
        </NButton>
      </template>
      <template #default="{ item: row }">
        <UiRecordCard :headline="row.title || `${row.pid}_p${row.p}`" :supporting="`PID: ${row.pid}_p${row.p} · 作者: ${row.author}`" :status="{ text: getAvailabilityMeta(row.availabilityStatus).label, tone: getAvailabilityMeta(row.availabilityStatus).type === 'error' ? 'danger' : getAvailabilityMeta(row.availabilityStatus).type === 'success' ? 'success' : 'warning' }" :fields="[{ name: '尺寸 / 格式', value: `${row.width} × ${row.height} · ${row.ext.toUpperCase()}` }, { name: '内容', value: `${row.r18 === 1 ? 'R18' : '全年龄'}${row.aiType === 2 ? ' · AI生成' : ''}` }, { name: '上传时间', value: formatDateOnly(row.uploadDate) }, { name: '上次审核', value: row.lastAuditTime ? `${row.lastAuditStatus === 1 ? '正常' : '有问题'} · ${formatDateOnly(row.lastAuditTime)}` : '未审核' }, { name: '审核备注', value: row.lastAuditRemark || '-' }, { name: '审核员', value: row.lastAuditAdminEmail || '-' }]" density="compact" data-testid="image-audit-card" :class="{ 'selected-card': selectedImageIds.includes(row.id) }">
          <p v-if="getAvailabilityDetail(row)">
            {{ getAvailabilityDetail(row) }}
          </p>
          <template #actions>
            <NCheckbox v-if="isAuditScope" :checked="selectedImageIds.includes(row.id)" :disabled="loading || bulkAuditLoading" :aria-label="`选择 ${row.pid}_p${row.p}`" @update:checked="checked => setImageSelected(row, checked)">
              选择
            </NCheckbox>
            <NButton tag="a" :href="row.urlOriginal" target="_blank" rel="noopener noreferrer">
              查看原图链接
            </NButton>
            <NButton v-if="scope !== 'ALL'" type="success" secondary @click="handlePass(row)">
              正常
            </NButton>
            <NButton v-if="scope !== 'ALL'" type="warning" secondary @click="openRejectModal(row)">
              问题
            </NButton>
            <NButton v-if="scope === 'ALL'" type="error" tertiary @click="handleRequestDelete(row.pid, row.p)">
              申请删除
            </NButton>
          </template>
        </UiRecordCard>
      </template>
      <template #footer>
        <NPagination :page="pagination.page" :page-count="pageCount" :page-slot="3" show-quick-jumper @update:page="pagination.onChange" />
      </template>
    </UiRecordBoard>

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
  </UiBoard>
</template>

<style scoped>
.board-panel { padding: 16px; border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); background: var(--board-surface); color: var(--board-text); }
.page-container, .admin-page, .operation-log-page { width: 100%; min-width: 0; padding-bottom: 80px; }
.board-page-header, .board-header-section, .section-header, .list-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.title, .page-title, .board-page-header h2, .section-title { margin: 0; color: var(--board-text); }
.subtitle, .board-page-header p, .section-subtitle { margin: 4px 0 0; color: var(--board-text-muted); }
.toolbar, .filter-card, .search-bar, .temp-block-wrapper { padding: 16px; border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); background: var(--board-surface); }
.toolbar, .header-actions, .actions-box, .filter-actions, .bulk-actions, .bulk-select, .token-buttons, .token-check { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.search-box { flex: 1; min-width: min(180px, 100%); }
.header-actions, .probe-input { min-width: 0; max-width: 100%; }
.probe-input { width: 180px; }
.filter-grid, .search-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.filter-actions { margin-top: 12px; }
:deep(.n-pagination) { flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 100%; }
:deep(.n-button) { min-height: 44px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
 .scope-filter { overflow-x: auto; max-width: 100%; margin-bottom: 12px; } .search-inputs { margin-top: 12px; } .pid-filter-group { display: flex; align-items: center; gap: 8px; min-width: 0; } .pid-input { flex: 1; min-width: 0; } .p-input { width: 70px; } .filter-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; color: var(--board-text-muted); } .bulk-audit-bar { padding: 16px; background: var(--board-surface); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; } .selected-card { border-color: var(--ui-primary); } .audit-preview { margin: 0; min-width: 0; } .audit-preview figcaption { padding: 8px; overflow-wrap: anywhere; color: var(--board-text-muted); } .audit-preview :deep(img) { height: auto; }
</style>
