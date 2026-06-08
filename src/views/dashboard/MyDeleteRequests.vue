<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NCard, NButton, NIcon, NTag, NEmpty, NSpin, NPagination, NImage,
  useMessage, NModal, NSpace
} from 'naive-ui'
import {
  TrashOutline, TimeOutline, CheckmarkCircleOutline, CloseCircleOutline,
  RefreshOutline, EyeOutline
} from '@vicons/ionicons5'
import {
  fetchMyDeleteRequests, fetchMyDeleteRequestDetail,
  REQUEST_STATUS, STATUS_CONFIG,
  type ImageDeleteRequestItem, type ImageDeleteRequestDetail
} from '@/api/imageDeleteRequest'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()

// ============ 列表数据 ============
const loading = ref(false)
const list = ref<ImageDeleteRequestItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const loadData = async () => {
  loading.value = true
  try {
    const res = await fetchMyDeleteRequests(page.value, pageSize.value)
    const data = res.data
    list.value = data.list || []
    total.value = data.total || 0
  } catch (e) {
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (p: number) => {
  page.value = p
  loadData()
}

// ============ 详情弹窗 ============
const detailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref<ImageDeleteRequestDetail | null>(null)

const showDetail = async (item: ImageDeleteRequestItem) => {
  detailModal.value = true
  detailLoading.value = true
  try {
    const res = await fetchMyDeleteRequestDetail(item.id)
    detailData.value = res.data
  } catch (e) {
    message.error('加载详情失败')
    detailModal.value = false
  } finally {
    detailLoading.value = false
  }
}

// ============ 辅助函数 ============
const getStatusConfig = (status: number) => {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[REQUEST_STATUS.PENDING]
}



onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container ui-page">
    <!-- 页面标题 -->
    <div class="page-header ui-page-header">
      <h1 class="page-title ui-page-title">
        <n-icon size="28" color="#f586a9"><TrashOutline /></n-icon>
        我的删除申请
      </h1>
      <n-button secondary @click="loadData" :loading="loading">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        刷新
      </n-button>
    </div>

    <!-- 列表区域 -->
    <n-spin :show="loading">
      <div v-if="list.length > 0" class="request-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="request-card ui-card ui-card-hover"
          :class="{ 'approved-card': item.status === REQUEST_STATUS.APPROVED, 'rejected-card': item.status === REQUEST_STATUS.REJECTED }"
          @click="showDetail(item)"
        >
          <!-- 缩略图 - 已批准时显示删除标识 -->
          <div class="card-image" v-if="item.status === REQUEST_STATUS.APPROVED">
            <div class="deleted-placeholder">
              <n-icon size="24" color="#52c41a"><CheckmarkCircleOutline /></n-icon>
              <span>已删除</span>
            </div>
          </div>
          <div class="card-image" v-else-if="item.thumbnailUrl">
            <n-image
              :src="item.thumbnailUrl"
              object-fit="cover"
              :preview-disabled="true"
              :img-props="{ referrerpolicy: 'no-referrer' }"
            />
          </div>

          <!-- 信息区域 -->
          <div class="card-info">
            <div class="card-title">{{ item.imageTitle || `PID: ${item.pid}` }}</div>
            <div class="card-meta">
              <span v-if="item.imageAuthor">{{ item.imageAuthor }}</span>
              <span v-if="item.imageAuthor" class="separator">·</span>
              <span>{{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="card-reason" v-if="item.reason">{{ item.reason }}</div>
          </div>

          <!-- 状态标签 -->
          <div class="card-status">
            <n-tag
              :type="getStatusConfig(item.status).type"
              round
              size="small"
            >
              <template #icon>
                <n-icon v-if="item.status === REQUEST_STATUS.PENDING"><TimeOutline /></n-icon>
                <n-icon v-else-if="item.status === REQUEST_STATUS.APPROVED"><CheckmarkCircleOutline /></n-icon>
                <n-icon v-else><CloseCircleOutline /></n-icon>
              </template>
              {{ getStatusConfig(item.status).text }}
            </n-tag>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-box ui-card">
        <n-empty description="暂无删除申请记录" />
      </div>
    </n-spin>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 详情弹窗 -->
    <n-modal v-model:show="detailModal">
      <n-card
        style="width: 560px; max-width: 95vw;"
        :bordered="false"
        class="detail-modal-card"
      >
        <template #header>
          <div class="modal-header">
            <n-icon size="22" color="#f586a9"><EyeOutline /></n-icon>
            <span>申请详情</span>
          </div>
        </template>

        <n-spin :show="detailLoading">
          <div v-if="detailData" class="detail-content">
            <!-- 状态信息 -->
            <div class="detail-section">
              <div class="section-title">申请状态</div>
              <div class="status-row">
                <n-tag :type="getStatusConfig(detailData.status).type" round>
                  {{ getStatusConfig(detailData.status).text }}
                </n-tag>
                <span class="submit-time">提交于 {{ formatDate(detailData.createdAt) }}</span>
              </div>
            </div>

            <!-- 图片信息 -->
            <div class="detail-section">
              <div class="section-title">图片信息</div>
              <div class="image-detail">
                <!-- 已批准删除时显示删除提示 -->
                <div v-if="detailData.status === REQUEST_STATUS.APPROVED" class="deleted-notice">
                  <n-icon size="32" color="#52c41a"><CheckmarkCircleOutline /></n-icon>
                  <span>该图片已被删除</span>
                </div>
                <!-- 预览图 -->
                <div v-else-if="detailData.urlOriginal" class="detail-image">
                  <n-image
                    :src="detailData.urlOriginal"
                    object-fit="contain"
                    :img-props="{ referrerpolicy: 'no-referrer' }"
                  />
                </div>
                <div class="detail-meta">
                  <div class="meta-row"><span class="label">PID:</span> {{ detailData.pid }}_p{{ detailData.p }}</div>
                  <div class="meta-row" v-if="detailData.title"><span class="label">标题:</span> {{ detailData.title }}</div>
                  <div class="meta-row" v-if="detailData.author"><span class="label">作者:</span> {{ detailData.author }}</div>
                  <div class="meta-row" v-if="detailData.width && detailData.height"><span class="label">尺寸:</span> {{ detailData.width }} × {{ detailData.height }}</div>
                </div>
              </div>
            </div>

            <!-- 申请原因 -->
            <div class="detail-section">
              <div class="section-title">申请原因</div>
              <div class="reason-text">{{ detailData.reason || '无' }}</div>
            </div>

            <!-- 审核信息（如果已处理） -->
            <div v-if="detailData.status !== REQUEST_STATUS.PENDING" class="detail-section">
              <div class="section-title">审核信息</div>
              <div class="review-info">
                <div class="meta-row"><span class="label">审核人:</span> {{ detailData.adminEmail || '-' }}</div>
                <div class="meta-row"><span class="label">审核时间:</span> {{ formatDate(detailData.reviewedAt || '') }}</div>
                <div class="meta-row" v-if="detailData.adminRemark">
                  <span class="label">备注:</span> {{ detailData.adminRemark }}
                </div>
              </div>
            </div>
          </div>
        </n-spin>

        <template #footer>
          <n-space justify="end">
            <n-button @click="detailModal = false">关闭</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
.page-container { max-width: 900px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 22px 24px;
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
}

.request-card:hover {
  transform: translateY(-2px);
}

.card-image {
  width: 80px;
  height: 80px;
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
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(82, 196, 26, 0.1);
}

.deleted-placeholder span {
  font-size: 11px;
  color: #52c41a;
  font-weight: 500;
}

/* 详情弹窗已删除提示 */
.deleted-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: rgba(82, 196, 26, 0.1);
  border-radius: 12px;
  border: 1px dashed rgba(82, 196, 26, 0.3);
}

.deleted-notice span {
  font-size: 15px;
  color: #52c41a;
  font-weight: 500;
}

/* 已批准/已拒绝卡片样式 */
.approved-card {
  opacity: 0.8;
}

.rejected-card {
  opacity: 0.8;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  font-size: 13px;
  color: var(--ui-muted);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.separator {
  color: #d1d5db;
}

.card-reason {
  font-size: 13px;
  color: var(--ui-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-status {
  flex-shrink: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 详情弹窗 */
.detail-modal-card {
  background: #fff;
  border-radius: 16px;
}

.empty-box {
  min-height: 280px;
  display:flex;
  align-items:center;
  justify-content:center;
}

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
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.submit-time {
  font-size: 13px;
  color: #6b7280;
}

.image-detail {
  display: flex;
  gap: 16px;
}

.detail-image {
  width: 150px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
}

.detail-image :deep(.n-image),
.detail-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detail-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  font-size: 14px;
  color: #4b5563;
}

.meta-row .label {
  color: #6b7280;
  margin-right: 6px;
}

.reason-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.review-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 640px) {
  .request-card {
    flex-wrap: wrap;
  }
  
  .card-image {
    width: 60px;
    height: 60px;
  }
  
  .card-status {
    width: 100%;
    margin-top: 8px;
  }
  
  .image-detail {
    flex-direction: column;
  }
  
  .detail-image {
    width: 100%;
    height: 200px;
  }
}
</style>
