<script setup lang="ts">
import type { ImageDeleteRequestDetail, ImageDeleteRequestItem, PageResult } from '@/api/imageDeleteRequest'
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  EyeOutline,
  FilterOutline,
  RefreshOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NBadge,
  NButton,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpin,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import {
  fetchAdminDeleteRequestDetail,
  fetchAdminDeleteRequestList,

  REQUEST_STATUS,
  reviewDeleteRequest,
  STATUS_CONFIG,
} from '@/api/imageDeleteRequest'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const dialog = useDialog()
const listGuard = useRequestGuard()
const detailGuard = useRequestGuard()
const detailCache = new Map<number, ImageDeleteRequestDetail>()
const imageFallbackSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22240%22%20height%3D%22240%22%20viewBox%3D%220%200%20240%20240%22%3E%3Crect%20width%3D%22240%22%20height%3D%22240%22%20rx%3D%2216%22%20fill%3D%22%23f1f5f9%22/%3E%3Cpath%20d%3D%22M66%20162l36-42%2027%2030%2018-21%2027%2033H66z%22%20fill%3D%22%23cbd5e1%22/%3E%3Ccircle%20cx%3D%2294%22%20cy%3D%2288%22%20r%3D%2217%22%20fill%3D%22%23cbd5e1%22/%3E%3C/svg%3E'

// ============ 筛选与列表 ============
const loading = ref(false)
const list = shallowRef<ImageDeleteRequestItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const statusFilter = ref<number | undefined>(undefined)

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '待审核', value: REQUEST_STATUS.PENDING },
  { label: '已批准', value: REQUEST_STATUS.APPROVED },
  { label: '已拒绝', value: REQUEST_STATUS.REJECTED },
]

const pendingCount = computed(() => {
  return list.value.filter(item => item.status === REQUEST_STATUS.PENDING).length
})

async function loadData() {
  const requestId = listGuard.next()
  loading.value = true
  try {
    const res = await fetchAdminDeleteRequestList(statusFilter.value, page.value, pageSize.value)
    if (!listGuard.isCurrent(requestId))
      return

    const data = unwrapApiData<PageResult<ImageDeleteRequestItem>>(res, {
      list: [],
      total: 0,
      page: page.value,
      pageSize: pageSize.value,
    })
    list.value = data.list || []
    total.value = data.total || 0
  }
  catch (error) {
    if (!listGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
      return
    message.error(getApiErrorMessage(error, '加载失败'))
  }
  finally {
    if (listGuard.isCurrent(requestId))
      loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

function handleFilterChange() {
  page.value = 1
  loadData()
}

// ============ 详情弹窗 ============
const detailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref<ImageDeleteRequestDetail | null>(null)
const reviewRemark = ref('')
const reviewLoading = ref(false)

async function showDetail(item: ImageDeleteRequestItem) {
  detailModal.value = true
  reviewRemark.value = ''
  const cached = detailCache.get(item.id)
  if (cached) {
    detailData.value = cached
    detailLoading.value = false
    return
  }

  const requestId = detailGuard.next()
  detailLoading.value = true
  detailData.value = null
  try {
    const res = await fetchAdminDeleteRequestDetail(item.id)
    if (!detailGuard.isCurrent(requestId))
      return

    const data = unwrapApiData<ImageDeleteRequestDetail | null>(res, null)
    detailData.value = data
    if (data)
      detailCache.set(item.id, data)
  }
  catch (error) {
    if (!detailGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
      return
    message.error(getApiErrorMessage(error, '加载详情失败'))
    detailModal.value = false
  }
  finally {
    if (detailGuard.isCurrent(requestId))
      detailLoading.value = false
  }
}

function handleReview(approve: boolean) {
  if (!detailData.value)
    return

  const action = approve ? '批准删除' : '拒绝'
  const content = approve
    ? `确定批准删除图片 PID: ${detailData.value.pid}_p${detailData.value.p} 吗？此操作将永久删除该图片！`
    : `确定拒绝此删除申请吗？`

  dialog.warning({
    title: `确认${action}`,
    content,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      reviewLoading.value = true
      try {
        await reviewDeleteRequest(detailData.value!.id, approve, reviewRemark.value)
        message.success(approve ? '已批准删除，图片已从数据库移除' : '已拒绝删除申请')
        detailCache.delete(detailData.value!.id)
        detailModal.value = false
        loadData()
      }
      catch (e: unknown) {
        if (shouldIgnoreApiError(e))
          return
        message.error(getApiErrorMessage(e, '操作失败'))
      }
      finally {
        reviewLoading.value = false
      }
    },
  })
}

// ============ 快速审核 ============
function quickReview(item: ImageDeleteRequestItem, approve: boolean, e: Event) {
  e.stopPropagation()
  const action = approve ? '批准删除' : '拒绝'

  dialog.warning({
    title: `确认${action}`,
    content: approve
      ? `确定批准删除图片 PID: ${item.pid}_p${item.p} 吗？`
      : `确定拒绝此删除申请吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await reviewDeleteRequest(item.id, approve, '')
        message.success(approve ? '已批准删除' : '已拒绝')
        detailCache.delete(item.id)
        loadData()
      }
      catch (e: unknown) {
        if (shouldIgnoreApiError(e))
          return
        message.error(getApiErrorMessage(e, '操作失败'))
      }
    },
  })
}

// ============ 辅助函数 ============
function getStatusConfig(status: number) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[REQUEST_STATUS.PENDING]
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="admin-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <NIcon size="28" color="#f586a9">
            <TrashOutline />
          </NIcon>
          图片删除申请管理
        </h1>
        <NBadge v-if="pendingCount > 0" :value="pendingCount" type="warning" />
      </div>
      <NButton secondary :loading="loading" @click="loadData">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar glass-card">
      <div class="filter-item">
        <NIcon size="18" color="#6b7280">
          <FilterOutline />
        </NIcon>
        <span class="filter-label">状态筛选：</span>
        <NSelect
          v-model:value="statusFilter"
          :options="statusOptions"
          style="width: 140px;"
          @update:value="handleFilterChange"
        />
      </div>
      <div class="filter-stats">
        共 {{ total }} 条记录
      </div>
    </div>

    <!-- 列表区域 -->
    <NSpin :show="loading">
      <div v-if="list.length > 0" class="request-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="request-card glass-card"
          :class="{ 'approved-card': item.status === REQUEST_STATUS.APPROVED, 'rejected-card': item.status === REQUEST_STATUS.REJECTED }"
          @click="showDetail(item)"
        >
          <!-- 状态标识 -->
          <div class="card-status-bar" :style="{ backgroundColor: `${getStatusConfig(item.status).color}20` }">
            <NTag :type="getStatusConfig(item.status).type" size="small" round>
              #{{ item.id }} · {{ getStatusConfig(item.status).text }}
            </NTag>
            <!-- 已处理的显示已删除标识 -->
            <NTag v-if="item.status === REQUEST_STATUS.APPROVED" type="default" size="tiny" round style="margin-left: 8px; opacity: 0.7;">
              🗑️ 图片已删除
            </NTag>
          </div>

          <div class="card-body">
            <!-- 缩略图 - 仅在有图片且未被批准删除时显示 -->
            <div v-if="item.thumbnailUrl && item.status !== REQUEST_STATUS.APPROVED" class="card-image">
              <NImage
                :src="item.thumbnailUrl"
                object-fit="cover"
                :preview-disabled="true"
                lazy
                :fallback-src="imageFallbackSrc"
                :img-props="{ referrerpolicy: 'no-referrer' }"
              />
            </div>
            <!-- 已删除时显示占位符 -->
            <div v-else-if="item.status === REQUEST_STATUS.APPROVED" class="card-image deleted-placeholder">
              <NIcon size="28" color="#52c41a">
                <CheckmarkCircleOutline />
              </NIcon>
              <span>已删除</span>
            </div>
            <!-- 无图片时不显示 -->

            <!-- 信息区域 -->
            <div class="card-info">
              <div class="info-main">
                <div class="card-title">
                  {{ item.imageTitle || `PID: ${item.pid}_p${item.p}` }}
                </div>
                <div v-if="item.imageAuthor" class="card-author">
                  作者：{{ item.imageAuthor }}
                </div>
              </div>
              <div class="info-meta">
                <div class="meta-item">
                  <span class="meta-label">申请人：</span>
                  <span>{{ item.userNickname || item.userEmail }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">时间：</span>
                  <span>{{ formatDate(item.createdAt) }}</span>
                </div>
                <div v-if="item.reason" class="meta-item reason">
                  <span class="meta-label">原因：</span>
                  <span>{{ item.reason }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 - 仅待审核显示 -->
            <div v-if="item.status === REQUEST_STATUS.PENDING" class="card-actions">
              <NButton size="small" secondary round @click="showDetail(item)">
                <template #icon>
                  <NIcon><EyeOutline /></NIcon>
                </template>
                详情
              </NButton>
              <NButton size="small" type="success" round @click="(e) => quickReview(item, true, e)">
                <template #icon>
                  <NIcon><CheckmarkCircleOutline /></NIcon>
                </template>
                批准
              </NButton>
              <NButton size="small" type="error" round @click="(e) => quickReview(item, false, e)">
                <template #icon>
                  <NIcon><CloseCircleOutline /></NIcon>
                </template>
                拒绝
              </NButton>
            </div>
          </div>
        </div>
      </div>

      <NEmpty v-else-if="!loading" description="暂无删除申请记录" />
    </NSpin>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <NPagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 详情弹窗 - 重新设计 -->
    <NModal v-model:show="detailModal" :mask-closable="false">
      <div class="detail-modal-wrapper">
        <!-- 头部 -->
        <div class="modal-header-new">
          <div class="header-title">
            <NIcon size="22" color="#f586a9">
              <EyeOutline />
            </NIcon>
            <span>申请详情 #{{ detailData?.id }}</span>
          </div>
          <NButton quaternary circle @click="detailModal = false">
            <template #icon>
              <NIcon><CloseCircleOutline /></NIcon>
            </template>
          </NButton>
        </div>

        <!-- 可滚动内容区 -->
        <div class="modal-body-scroll">
          <NSpin :show="detailLoading">
            <div v-if="detailData" class="detail-blocks">
              <!-- 申请信息块 -->
              <div class="info-block">
                <div class="block-title">
                  📋 申请信息
                </div>
                <div class="block-content">
                  <div class="info-line">
                    <span class="info-label">申请人:</span>
                    <span class="info-value">{{ detailData.userNickname }} ({{ detailData.userEmail }})</span>
                  </div>
                  <div class="info-line">
                    <span class="info-label">申请时间:</span>
                    <span class="info-value">{{ formatDate(detailData.createdAt) }}</span>
                  </div>
                  <div class="info-line">
                    <span class="info-label">当前状态:</span>
                    <NTag :type="getStatusConfig(detailData.status).type" size="small" round>
                      {{ getStatusConfig(detailData.status).text }}
                    </NTag>
                  </div>
                  <div class="info-line">
                    <span class="info-label">申请原因:</span>
                    <span class="info-value">{{ detailData.reason || '无' }}</span>
                  </div>
                </div>
              </div>

              <!-- 图片信息块 -->
              <div class="info-block">
                <div class="block-title">
                  🖼️ 图片信息
                </div>
                <div class="block-content">
                  <!-- 已批准删除时显示删除提示 -->
                  <div v-if="detailData.status === REQUEST_STATUS.APPROVED" class="deleted-notice">
                    <NIcon size="32" color="#52c41a">
                      <CheckmarkCircleOutline />
                    </NIcon>
                    <span>该图片已被删除</span>
                  </div>

                  <!-- 预览图 - 仅未删除时显示 -->
                  <div v-else-if="detailData.urlOriginal" class="preview-box">
                    <NImage
                      :src="detailData.urlOriginal"
                      width="180"
                      height="180"
                      object-fit="contain"
                      lazy
                      :fallback-src="imageFallbackSrc"
                      :img-props="{ referrerpolicy: 'no-referrer' }"
                      style="border-radius: 8px; background: #f3f4f6;"
                    />
                    <div style="margin-top: 8px; text-align: center;">
                      <NButton
                        text
                        tag="a"
                        :href="detailData.urlOriginal"
                        target="_blank"
                        type="primary"
                        style="font-size: 13px;"
                      >
                        <template #icon>
                          <NIcon><EyeOutline /></NIcon>
                        </template>
                        查看原图
                      </NButton>
                    </div>
                  </div>

                  <div class="info-line">
                    <span class="info-label">PID:</span><span class="info-value">{{ detailData.pid }}_p{{ detailData.p }}</span>
                  </div>
                  <div v-if="detailData.title" class="info-line">
                    <span class="info-label">标题:</span><span class="info-value">{{ detailData.title }}</span>
                  </div>
                  <div v-if="detailData.author" class="info-line">
                    <span class="info-label">作者:</span><span class="info-value">{{ detailData.author }}<template v-if="detailData.uid"> (UID: {{ detailData.uid }})</template></span>
                  </div>
                  <div v-if="detailData.width && detailData.height" class="info-line">
                    <span class="info-label">尺寸:</span><span class="info-value">{{ detailData.width }} × {{ detailData.height }}</span>
                  </div>
                  <div v-if="detailData.ext" class="info-line">
                    <span class="info-label">格式:</span><span class="info-value">{{ detailData.ext?.toUpperCase() }}</span>
                  </div>
                  <div v-if="detailData.r18 !== undefined" class="info-line">
                    <span class="info-label">R18:</span>
                    <NTag :type="detailData.r18 ? 'error' : 'default'" size="tiny">
                      {{ detailData.r18 ? '是' : '否' }}
                    </NTag>
                  </div>
                  <div v-if="detailData.aiType !== undefined" class="info-line">
                    <span class="info-label">AI生成:</span>
                    <NTag :type="detailData.aiType === 2 ? 'warning' : 'default'" size="tiny">
                      {{ detailData.aiType === 2 ? '是' : detailData.aiType === 1 ? '否' : '未知' }}
                    </NTag>
                  </div>
                  <div v-if="detailData.tags?.length" class="info-line">
                    <span class="info-label">标签:</span>
                    <div class="tags-wrap">
                      <NTag v-for="tag in detailData.tags.slice(0, 10)" :key="tag" size="tiny" round style="margin: 2px;">
                        {{ tag }}
                      </NTag>
                      <span v-if="detailData.tags.length > 10" style="color: #999; font-size: 12px;">+{{ detailData.tags.length - 10 }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 审核操作块 -->
              <div v-if="detailData.status === REQUEST_STATUS.PENDING" class="info-block">
                <div class="block-title">
                  ⚖️ 审核操作
                </div>
                <div class="block-content">
                  <NInput
                    v-model:value="reviewRemark"
                    type="textarea"
                    placeholder="审核备注（可选）"
                    :rows="2"
                    style="margin-bottom: 12px;"
                  />
                  <div class="warning-box">
                    ⚠️ 批准后将永久删除该图片及其所有关联数据
                  </div>
                </div>
              </div>

              <!-- 已审核记录块 -->
              <div v-if="detailData.status !== REQUEST_STATUS.PENDING && detailData.adminEmail" class="info-block">
                <div class="block-title">
                  📝 审核记录
                </div>
                <div class="block-content">
                  <div class="info-line">
                    <span class="info-label">审核人:</span><span class="info-value">{{ detailData.adminEmail }}</span>
                  </div>
                  <div class="info-line">
                    <span class="info-label">审核时间:</span><span class="info-value">{{ formatDate(detailData.reviewedAt || '') }}</span>
                  </div>
                  <div v-if="detailData.adminRemark" class="info-line">
                    <span class="info-label">备注:</span><span class="info-value">{{ detailData.adminRemark }}</span>
                  </div>
                </div>
              </div>
            </div>
          </NSpin>
        </div>

        <!-- 底部按钮 -->
        <div class="modal-footer-new">
          <NButton round @click="detailModal = false">
            关闭
          </NButton>
          <template v-if="detailData?.status === REQUEST_STATUS.PENDING">
            <NButton round type="error" :loading="reviewLoading" @click="handleReview(false)">
              <template #icon>
                <NIcon><CloseCircleOutline /></NIcon>
              </template>
              拒绝申请
            </NButton>
            <NButton round type="success" :loading="reviewLoading" @click="handleReview(true)">
              <template #icon>
                <NIcon><CheckmarkCircleOutline /></NIcon>
              </template>
              批准删除
            </NButton>
          </template>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 12px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #6b7280;
}

.filter-stats {
  font-size: 14px;
  color: #6b7280;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-status-bar {
  padding: 8px 16px;
}

.card-body {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.card-image {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f3f4f6;
}

.card-image :deep(.n-image),
.card-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 已删除占位符 */
.deleted-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(82, 196, 26, 0.1);
}

.deleted-placeholder span {
  font-size: 12px;
  color: #52c41a;
  font-weight: 500;
}

/* 已批准卡片样式 */
.approved-card {
  opacity: 0.75;
}

.approved-card:hover {
  opacity: 0.9;
}

/* 已拒绝卡片样式 */
.rejected-card {
  opacity: 0.75;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.info-main {
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.card-author {
  font-size: 13px;
  color: #6b7280;
}

.info-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  font-size: 13px;
  color: #6b7280;
}

.meta-item.reason {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-label {
  color: #6b7280;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* ============ 新版详情弹窗样式 ============ */
.detail-modal-wrapper {
  width: 700px;
  max-width: 95vw;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-header-new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-body-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-height: calc(90vh - 140px);
}

.modal-body-scroll::-webkit-scrollbar {
  width: 8px;
}

.modal-body-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body-scroll::-webkit-scrollbar-thumb {
  background: #f586a9;
  border-radius: 4px;
}

.detail-blocks {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-block {
  background: #f9fafb;
  border-radius: 12px;
  overflow: hidden;
}

.block-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  padding: 12px 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.block-content {
  padding: 16px;
}

.info-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 10px;
}

.info-line:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #6b7280;
  flex-shrink: 0;
  min-width: 70px;
}

.info-value {
  color: #1f2937;
}

.preview-box {
  margin-bottom: 16px;
}

/* 已删除提示 */
.deleted-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  margin-bottom: 16px;
  background: rgba(82, 196, 26, 0.1);
  border-radius: 12px;
  border: 1px dashed rgba(82, 196, 26, 0.3);
}

.deleted-notice span {
  font-size: 15px;
  color: #52c41a;
  font-weight: 500;
}

.no-image {
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.warning-box {
  font-size: 13px;
  color: #dc2626;
  padding: 12px;
  background: rgba(220, 38, 38, 0.08);
  border-radius: 8px;
}

.modal-footer-new {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

/* 旧样式保留备用 */
.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(80vh - 140px);
  overflow-y: auto;
  padding-right: 8px;
}

/* 自定义滚动条样式 */
.detail-content::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb {
  background: #f586a9;
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb:hover {
  background: #e5729a;
}

.detail-section {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.section-body {
  padding: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #6b7280;
}

.info-item > span:last-child,
.info-item > .n-tag {
  font-size: 14px;
  color: #1f2937;
}

.reason-box {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 14px;
}

.reason-box .label {
  color: #6b7280;
}

.image-preview-area {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.preview-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
}

.preview-image :deep(.n-image),
.preview-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-meta {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  font-size: 14px;
  color: #4b5563;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.meta-row .label {
  color: #6b7280;
  flex-shrink: 0;
  min-width: 50px;
}

.meta-row.tags {
  flex-wrap: wrap;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.more-tags {
  font-size: 12px;
  color: #6b7280;
}

.review-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warning-text {
  font-size: 13px;
  color: #dc2626;
  padding: 10px 12px;
  background: rgba(220, 38, 38, 0.08);
  border-radius: 8px;
}

@media (max-width: 768px) {
  .card-body {
    flex-wrap: wrap;
  }

  .card-actions {
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
  }

  .image-preview-area {
    flex-direction: column;
  }

  .preview-image {
    width: 100%;
  }
}
</style>
