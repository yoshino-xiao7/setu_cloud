<script setup lang="ts">
import {
  CloseOutline,
  CloudDownloadOutline,
  ImagesOutline,
  PersonOutline,
  PlayOutline,
  PricetagOutline,
  PulseOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NLog,
  NModal,
  NPagination,
  NProgress,
  NSelect,
  NSpin,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import { useAdminPixivCrawl } from '@/composables/useAdminPixivCrawl'
import { formatDate } from '@/utils/dateFormat'

const {
  activeTab,
  columns,
  currentTask,
  currentTaskLog,
  handleCancelTask,
  healthStatus,
  idsForm,
  isCompact,
  loadTasks,
  loadingTasks,
  mobilePage,
  mobilePageSize,
  newMode,
  pagedMobileTasks,
  showDetailModal,
  submitByIds,
  submitByTag,
  submitByUser,
  submitting,
  tablePagination,
  tagForm,
  taskRowKey,
  taskRows,
  taskTotal,
  userForm,
  viewTaskDetails,
} = useAdminPixivCrawl()
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <NIcon size="28" color="#f586a9">
            <CloudDownloadOutline />
          </NIcon>
          新增图片
        </h1>
      </div>
      <div class="header-right">
        <NTag :type="healthStatus ? 'success' : 'error'" round>
          <template #icon>
            <NIcon><PulseOutline /></NIcon>
          </template>
          {{ healthStatus ? '服务在线' : '服务离线' }}
        </NTag>
      </div>
    </div>

    <NCard class="glass-card" content-style="padding: 0;">
      <NTabs v-model:value="activeTab" type="line" size="large" :tabs-padding="20">
        <!-- Tab 1: Create Task -->
        <NTabPane name="new" tab="新建任务">
          <div class="tab-content">
            <div class="mode-selector">
              <NButton
                :type="newMode === 'ids' ? 'primary' : 'default'"
                class="mode-btn"
                @click="newMode = 'ids'"
              >
                <template #icon>
                  <NIcon><ImagesOutline /></NIcon>
                </template>
                按 ID 抓取
              </NButton>
              <NButton
                :type="newMode === 'user' ? 'primary' : 'default'"
                class="mode-btn"
                @click="newMode = 'user'"
              >
                <template #icon>
                  <NIcon><PersonOutline /></NIcon>
                </template>
                按画师抓取
              </NButton>
              <NButton
                :type="newMode === 'tag' ? 'primary' : 'default'"
                class="mode-btn"
                @click="newMode = 'tag'"
              >
                <template #icon>
                  <NIcon><PricetagOutline /></NIcon>
                </template>
                按标签抓取
              </NButton>
            </div>

            <!-- Form: IDs -->
            <div v-if="newMode === 'ids'" class="form-wrapper">
              <div class="form-desc">
                批量抓取指定 PID 的作品。
              </div>
              <NForm label-placement="left" label-width="100">
                <NFormItem label="作品 ID">
                  <NInput
                    v-model:value="idsForm.input"
                    type="textarea"
                    placeholder="输入 PID，多个用逗号或换行分隔"
                    :rows="5"
                  />
                </NFormItem>
                <NFormItem label="跳过已存在">
                  <NSwitch v-model:value="idsForm.skipExisting" />
                </NFormItem>
                <NFormItem>
                  <NButton type="primary" :loading="submitting" @click="submitByIds">
                    <template #icon>
                      <NIcon><PlayOutline /></NIcon>
                    </template>
                    开始抓取
                  </NButton>
                </NFormItem>
              </NForm>
            </div>

            <!-- Form: User -->
            <div v-if="newMode === 'user'" class="form-wrapper">
              <div class="form-desc">
                抓取指定画师的所有作品。
              </div>
              <NForm label-placement="left" label-width="100">
                <NFormItem label="画师 UID">
                  <NInput v-model:value="userForm.userId" placeholder="输入画师 ID" />
                </NFormItem>
                <NFormItem label="跳过已存在">
                  <NSwitch v-model:value="userForm.skipExisting" />
                </NFormItem>
                <NFormItem>
                  <NButton type="primary" :loading="submitting" @click="submitByUser">
                    <template #icon>
                      <NIcon><PlayOutline /></NIcon>
                    </template>
                    开始抓取
                  </NButton>
                </NFormItem>
              </NForm>
            </div>

            <!-- Form: Tag -->
            <div v-if="newMode === 'tag'" class="form-wrapper">
              <div class="form-desc">
                搜索并抓取标签下的热门或最新作品。
              </div>
              <NForm label-placement="left" label-width="100">
                <NFormItem label="搜索标签">
                  <NInput v-model:value="tagForm.tag" placeholder="如：原神" />
                </NFormItem>
                <NFormItem label="排序模式">
                  <NSelect
                    v-model:value="tagForm.mode" :options="[
                      { label: '热门 (Popular)', value: 'popular' },
                      { label: '最新 (Latest)', value: 'latest' },
                    ]"
                  />
                </NFormItem>
                <NFormItem label="页码范围">
                  <div class="flex-row">
                    <NInputNumber v-model:value="tagForm.pageFrom" :min="1" />
                    <span class="mx-2">至</span>
                    <NInputNumber v-model:value="tagForm.pageTo" :min="tagForm.pageFrom" />
                  </div>
                </NFormItem>
                <NFormItem label="跳过已存在">
                  <NSwitch v-model:value="tagForm.skipExisting" />
                </NFormItem>
                <NFormItem>
                  <NButton type="primary" :loading="submitting" @click="submitByTag">
                    <template #icon>
                      <NIcon><PlayOutline /></NIcon>
                    </template>
                    开始抓取
                  </NButton>
                </NFormItem>
              </NForm>
            </div>
          </div>
        </NTabPane>

        <!-- Tab 2: Task History -->
        <NTabPane name="list" tab="任务历史">
          <div class="tab-content">
            <div class="list-toolbar">
              <NButton size="small" :loading="loadingTasks" @click="loadTasks()">
                <template #icon>
                  <NIcon><RefreshOutline /></NIcon>
                </template>
                刷新
              </NButton>
            </div>
            <div v-if="taskTotal > taskRows.length" class="list-meta">
              仅展示最近 {{ taskRows.length }} / {{ taskTotal }} 个任务
            </div>

            <!-- Desktop Table -->
            <NDataTable
              v-if="!isCompact"
              :columns="columns"
              :data="taskRows"
              :loading="loadingTasks"
              :pagination="tablePagination"
              :row-key="taskRowKey"
            />

            <!-- Mobile Card List -->
            <div v-else class="mobile-task-list">
              <div v-if="loadingTasks && taskRows.length === 0" class="py-4 text-center">
                <NSpin size="small" />
              </div>
              <NEmpty v-else-if="taskRows.length === 0" description="暂无任务记录" class="py-8" />

              <div v-for="task in pagedMobileTasks" v-else :key="task.task_id" class="mobile-task-card">
                <div class="task-card-header">
                  <span class="task-id">ID: {{ task.task_id.substring(0, 8) }}...</span>
                  <NTag
                    :type="({
                      pending: 'default',
                      running: 'info',
                      completed: 'success',
                      failed: 'error',
                      cancelled: 'warning',
                    } as Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'>)[task.status] || 'default'" size="small"
                  >
                    {{ {
                      pending: '等待中',
                      running: '进行中',
                      completed: '已完成',
                      failed: '失败',
                      cancelled: '已取消',
                    }[task.status] || task.status }}
                  </NTag>
                </div>

                <div class="task-card-body">
                  <div class="info-row">
                    <span class="label">模式:</span>
                    <span>{{ { by_ids: '按 ID', by_user: '按画师', by_tag: '按标签' }[task.mode] || task.mode }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">进度:</span>
                    <NProgress
                      type="line"
                      :percentage="task.progress && task.progress.total ? Math.round((task.progress.done / task.progress.total) * 100) : 0"
                      :status="task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'info'"
                      :height="12"
                      style="flex: 1; max-width: 150px;"
                    />
                  </div>
                  <div class="info-row">
                    <span class="label">时间:</span>
                    <span class="time">{{ formatDate(task.started_at) }}</span>
                  </div>
                </div>

                <div class="task-card-actions">
                  <NButton
                    v-if="['pending', 'running'].includes(task.status)"
                    size="small" type="error" secondary block
                    @click="handleCancelTask(task.task_id)"
                  >
                    取消任务
                  </NButton>
                  <NButton
                    v-else
                    size="small" secondary block
                    @click="viewTaskDetails(task.task_id)"
                  >
                    查看详情
                  </NButton>
                </div>
              </div>

              <NPagination
                v-if="taskRows.length > mobilePageSize"
                v-model:page="mobilePage"
                :page-size="mobilePageSize"
                :item-count="taskRows.length"
                size="small"
                simple
                class="mobile-pagination"
              />
            </div>
          </div>
        </NTabPane>
      </NTabs>
    </NCard>

    <!-- Task Detail Modal -->
    <NModal v-model:show="showDetailModal">
      <NCard
        style="width: 100%; max-width: 600px; height: 80vh; display: flex; flex-direction: column;"
        title="任务详情"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        class="glass-card"
        content-style="flex: 1; overflow: hidden; display: flex; flex-direction: column;"
      >
        <template #header-extra>
          <NIcon size="20" class="cursor-pointer" @click="showDetailModal = false">
            <CloseOutline />
          </NIcon>
        </template>

        <div v-if="currentTask" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
          <div class="task-info-grid">
            <div>
              <span class="label">Task ID:</span> {{ currentTask.task_id }}
            </div>
            <div>
              <span class="label">状态:</span>
              <NTag :type="currentTask.status === 'completed' ? 'success' : currentTask.status === 'failed' ? 'error' : 'info'" size="small">
                {{ {
                  pending: '等待中',
                  running: '进行中',
                  completed: '已完成',
                  failed: '失败',
                  cancelled: '已取消',
                }[currentTask.status] || currentTask.status }}
              </NTag>
            </div>
            <div>
              <span class="label">模式:</span> {{
                {
                  by_ids: '按 ID',
                  by_user: '按画师',
                  by_tag: '按标签',
                }[currentTask.mode] || currentTask.mode
              }}
            </div>
            <div>
              <span class="label">开始时间:</span> {{ formatDate(currentTask.started_at) }}
            </div>
            <div v-if="currentTask.progress">
              <span class="label">进度:</span>
              完成 {{ currentTask.progress.done }} / {{ currentTask.progress.total }}
              (新增: {{ currentTask.progress.new }}, 失败: {{ currentTask.progress.failed }})
            </div>
          </div>

          <div class="logs-container" style="flex: 1; border: 1px solid #eee; border-radius: 4px; padding: 8px; background: #fafafa; overflow: hidden;">
            <NLog
              :log="currentTaskLog"
              :loading="false"
              trim
              style="height: 100%;"
            />
          </div>
        </div>
        <div v-else class="flex justify-center items-center h-full">
          <NSpin show />
        </div>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.task-info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;
}
.label { color: #888; margin-right: 4px; }
.cursor-pointer { cursor: pointer; }

.admin-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
}
.page-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 24px; font-weight: 700; color: #1f2937; margin: 0;
}

.tab-content {
  padding: 20px 24px 30px;
}

.mode-selector {
  display: flex; gap: 12px; margin-bottom: 24px;
}
.mode-btn { min-width: 120px; }

.form-wrapper {
  max-width: 500px;
  animation: fadeIn 0.3s ease;
}
.form-desc {
  color: #6b7280; font-size: 14px; margin-bottom: 16px;
}

.flex-row { display: flex; align-items: center; }
.mx-2 { margin: 0 8px; }
.list-toolbar { margin-bottom: 12px; display: flex; justify-content: flex-end; }
.list-meta {
  margin: -4px 0 12px;
  color: #8a8f9f;
  font-size: 12px;
  text-align: right;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .mode-selector { flex-direction: column; }
  .mode-btn { width: 100%; }
  .admin-page { padding: 16px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-right { align-self: flex-end; }
  .tab-content { padding: 16px; }
}

.mobile-task-list { display: flex; flex-direction: column; gap: 12px; }
.mobile-task-card {
  background: #f9fafb; border-radius: 8px; padding: 12px;
  border: 1px solid #eee;
}
.task-card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;
}
.task-id { font-family: monospace; font-size: 12px; color: #666; }
.task-card-body { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.info-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.task-card-actions { display: grid; grid-template-columns: 1fr; gap: 8px; }
.time { font-size: 12px; color: #999; }
.mobile-pagination { justify-content: center; margin-top: 4px; }
</style>
