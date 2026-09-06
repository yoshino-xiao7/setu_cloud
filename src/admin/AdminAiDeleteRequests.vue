<script setup lang="ts">
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  RefreshOutline,
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
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useAdminAiDeleteRequests } from '@/composables/useAdminAiDeleteRequests'
import {
  AI_DELETE_STATUS_OPTIONS,
  getAiDeleteStatusMeta,
  getAiGenerationStatusMeta,
} from '@/utils/aiGenerationStatus'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const {
  approve,
  loadRequests,
  loading,
  openReject,
  page,
  pageCount,
  pageSize,
  total,
  rejectForm,
  rejectModal,
  requests,
  resetPageAndLoad,
  status,
  submitReject,
  submitting,
} = useAdminAiDeleteRequests({
  message,
})
</script>

<template>
  <UiBoard class="admin-page">
    <div class="board-page-header">
      <div>
        <h1>AI 删除申请</h1>
        <p>独立审核用户提交的 AI 生图删除请求，通过后会隐藏记录并清理 OSS 文件。</p>
      </div>
      <NButton secondary :loading="loading" @click="loadRequests">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard class="panel-card" :bordered="false">
      <div class="toolbar">
        <NSelect v-model:value="status" :options="AI_DELETE_STATUS_OPTIONS" class="filter-select" @update:value="resetPageAndLoad" />
      </div>

      <NSpin :show="loading">
        <UiRecordBoard v-if="requests.length" :items="requests" :item-key="request => request.id">
          <template #default="{ item: request }">
            <UiRecordCard :headline="`删除申请 #${request.id} · 任务 #${request.jobId} · 用户 ${request.userId}`">
              <div class="thumb">
                <NImage
                  v-if="request.job?.imageUrl"
                  :src="request.job.imageUrl"
                  object-fit="cover"
                  lazy
                  :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
                />
                <span v-else>{{ getAiGenerationStatusMeta(request.job?.status).label }}</span>
              </div>
              <div class="main">
                <p>{{ request.job?.promptCn || '任务记录不可用' }}</p>
                <div class="meta">
                  <NTag :type="getAiDeleteStatusMeta(request.status).type" size="small" round>
                    {{ getAiDeleteStatusMeta(request.status).label }}
                  </NTag>
                  <NTag v-if="request.job?.status" :type="getAiGenerationStatusMeta(request.job.status).type" size="small" round>
                    {{ getAiGenerationStatusMeta(request.job.status).label }}
                  </NTag>
                  <span>{{ formatDate(request.createdAt) }}</span>
                </div>
                <div v-if="request.reason" class="note">
                  申请原因：{{ request.reason }}
                </div>
                <div v-if="request.rejectReason" class="error-line">
                  拒绝原因：{{ request.rejectReason }}
                </div>
              </div>

              <template #actions>
                <NButton v-if="request.status === 'WAITING'" type="primary" size="small" :loading="submitting" @click="approve(request)">
                  <template #icon>
                    <NIcon><CheckmarkCircleOutline /></NIcon>
                  </template>
                  通过
                </NButton>
                <NButton v-if="request.status === 'WAITING'" tertiary type="error" size="small" @click="openReject(request)">
                  <template #icon>
                    <NIcon><CloseCircleOutline /></NIcon>
                  </template>
                  拒绝
                </NButton>
              </template>
            </UiRecordCard>
          </template>
        </UiRecordBoard>
        <NEmpty v-else description="暂无 AI 删除申请" class="empty" />
      </NSpin>

      <div v-if="total > pageSize" class="pagination">
        <NPagination :page="page" :page-count="pageCount" @update:page="(next) => { page = next; loadRequests() }" />
      </div>
    </NCard>

    <NModal v-model:show="rejectModal" preset="card" title="拒绝删除申请" :style="{ width: '520px', maxWidth: '92vw' }">
      <NInput
        v-model:value="rejectForm.reason"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 7 }"
        maxlength="300"
        show-count
        placeholder="填写拒绝原因"
      />
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
    </NModal>
  </UiBoard>
</template>

<style scoped>
.admin-page {
  padding: 24px;
}

.board-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.board-page-header h1 {
  margin: 0;
  color: var(--board-text);
  font-size: 26px;
}

.board-page-header p {
  margin: 6px 0 0;
  color: var(--board-text-muted);
}

.panel-card {
  border-radius: 8px;
  background: var(--board-surface);
  box-shadow: 0 16px 38px rgba(31, 41, 55, 0.08);
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.filter-select {
  width: 180px;
}

.thumb {
  display: grid;
  width: 128px;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: var(--board-surface);
  color: var(--board-text-muted);
  font-size: 12px;
}

.thumb :deep(.n-image),
.thumb :deep(img) {
  width: 100%;
  height: 100%;
}

.thumb :deep(img) {
  object-fit: cover;
}

.title {
  color: var(--board-text);
  font-weight: 800;
}

.main p {
  display: -webkit-box;
  margin: 6px 0;
  overflow: hidden;
  color: var(--board-text);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--board-text-muted);
  font-size: 12px;
}

.note,
.error-line {
  margin-top: 6px;
  font-size: 13px;
}

.note {
  color: var(--board-text);
}

.error-line {
  color: #dc2626;
}

.actions {
  display: grid;
  gap: 8px;
}

.empty {
  min-height: 280px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 760px) {
  .admin-page {
    padding: 16px;
  }

  .thumb {
    width: 100%;
    max-height: 240px;
  }

  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-select {
    width: 100%;
  }

  .toolbar {
    flex-direction: column;
  }
}

.board-page-header { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.panel-card, .header { background: var(--board-surface); color: var(--board-text); }
</style>
