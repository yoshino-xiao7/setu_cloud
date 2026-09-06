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
import { computed, ref, watch } from 'vue'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
import { useAdminPixivCrawl } from '@/composables/useAdminPixivCrawl'
import { formatDate } from '@/utils/dateFormat'

const {
  loadError,
  activeTab,
  currentTask,
  currentTaskLog,
  handleCancelTask,
  healthStatus,
  idsForm,
  loadTasks,
  loadingTasks,
  newMode,
  showDetailModal,
  submitByIds,
  submitByTag,
  submitByUser,
  submitting,
  tagForm,
  taskRows,
  taskTotal,
  userForm,
  viewTaskDetails,
} = useAdminPixivCrawl()
const recordPage = ref(1)
const recordPageSize = ref(10)
watch([taskRows, recordPageSize], () => {
  recordPage.value = Math.min(recordPage.value, Math.max(1, Math.ceil(taskRows.value.length / recordPageSize.value)))
})
const pagedTasks = computed(() => taskRows.value.slice((recordPage.value - 1) * recordPageSize.value, recordPage.value * recordPageSize.value))
</script>

<template>
  <UiBoard class="admin-page">
    <div class="board-page-header">
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

    <NCard class="board-panel" content-style="padding: 0;">
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

            <UiRecordBoard :error="loadError" :items="pagedTasks" :loading="loadingTasks" empty="暂无任务记录" :item-key="task => task.task_id">
              <template #error>
                {{ loadError }}<NButton @click="loadTasks()">
                  重试
                </NButton>
              </template>
              <template #default="{ item: task }">
                <UiRecordCard :headline="`ID: ${task.task_id}`" :supporting="{ by_ids: '按 ID', by_user: '按画师', by_tag: '按标签' }[task.mode] || task.mode" :status="{ text: { pending: '等待中', running: '进行中', completed: '已完成', failed: '失败', cancelled: '已取消' }[task.status] || task.status, tone: task.status === 'completed' ? 'success' : task.status === 'failed' ? 'danger' : task.status === 'running' ? 'info' : 'muted' }" :fields="[{ name: '开始时间', value: formatDate(task.started_at) }, { name: '进度', value: `${task.progress?.done || 0}/${task.progress?.total || 0}` }]" density="compact">
                  <NProgress type="line" :percentage="task.progress?.total ? Math.round(task.progress.done / task.progress.total * 100) : 0" :status="task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'info'" />
                  <template #actions>
                    <NButton v-if="['pending', 'running'].includes(task.status)" type="error" secondary @click="handleCancelTask(task.task_id)">
                      取消任务
                    </NButton><NButton v-else @click="viewTaskDetails(task.task_id)">
                      查看详情
                    </NButton>
                  </template>
                </UiRecordCard>
              </template>
              <template #footer>
                <NPagination v-model:page="recordPage" v-model:page-size="recordPageSize" :item-count="taskRows.length" :page-sizes="[10, 20, 50]" show-size-picker :page-slot="3" @update:page-size="recordPage = 1" />
              </template>
            </UiRecordBoard>
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
        class="board-panel"
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
 .tab-content { padding: 16px; } .mode-selector { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; } .form-wrapper { max-width: 680px; } .form-desc, .list-meta { margin-bottom: 12px; color: var(--board-text-muted); } .flex-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; } .flex-row :deep(.n-input-number) { width: 100px; } .task-detail-content, .log-container { min-width: 0; }
</style>
