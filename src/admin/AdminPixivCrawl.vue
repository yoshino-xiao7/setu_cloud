<script setup lang="ts">
import { ref, onMounted, onUnmounted, h } from 'vue'
import {
  NCard, NButton, NIcon, NTag, NSpin, NTabs, NTabPane,
  NForm, NFormItem, NInput, NInputNumber, NSwitch, NSelect,
  NDataTable, type DataTableColumns, NProgress,
  useMessage, useDialog, NModal, NLog
} from 'naive-ui'
import {
  CloudDownloadOutline,
  PulseOutline,
  RefreshOutline,
  PlayOutline,
  ImagesOutline,
  PersonOutline,
  PricetagOutline,
  CloseOutline
} from '@vicons/ionicons5'
import {
  checkCrawlerHealth,
  crawlByIds,
  crawlByUser,
  crawlByTag,
  fetchCrawlerTasks,
  fetchCrawlerTask,
  cancelCrawlerTask,
  type CrawlerTask,
  type PixivHealthResponse
} from '@/api/pixiv'

const message = useMessage()
const dialog = useDialog()

// ============ Health Check ============
const healthStatus = ref<PixivHealthResponse | null>(null)
const checkingHealth = ref(false)

const checkHealth = async () => {
  checkingHealth.value = true
  try {
    const res = await checkCrawlerHealth()
    healthStatus.value = (res as any)?.data || res
  } catch (e) {
    healthStatus.value = null
  } finally {
    checkingHealth.value = false
  }
}

// ============ Task List ============
const tasks = ref<CrawlerTask[]>([])
const loadingTasks = ref(false)
let pollTimer: number | null = null

const loadTasks = async () => {
  loadingTasks.value = true
  try {
    const res = await fetchCrawlerTasks()
    tasks.value = (res as any)?.data?.tasks || (res as any).tasks || []
  } catch (e: any) {
    message.error('加载任务列表失败')
  } finally {
    loadingTasks.value = false
  }
}

const renderStatus = (row: CrawlerTask) => {
  const typeMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    pending: 'default',
    running: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning'
  }
  const textMap: Record<string, string> = {
    pending: '等待中',
    running: '进行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return h(NTag, { type: typeMap[row.status] || 'default', size: 'small' }, { default: () => textMap[row.status] || row.status })
}

const renderProgress = (row: CrawlerTask) => {
  if (!row.progress || row.progress.total === 0) return '0%'
  const percent = Math.round((row.progress.done / row.progress.total) * 100)
  return h(NProgress, {
    type: 'line',
    percentage: percent,
    status: row.status === 'failed' ? 'error' : row.status === 'completed' ? 'success' : 'info',
    height: 12
  })
}

const columns: DataTableColumns<CrawlerTask> = [
  { title: 'ID', key: 'task_id', width: 100, ellipsis: true },
  { title: '模式', key: 'mode', width: 100 },
  { title: '状态', key: 'status', width: 100, render: renderStatus },
  { title: '进度', key: 'progress', width: 150, render: renderProgress },
  { title: '开始时间', key: 'started_at', width: 180 },
  { 
    title: '操作', 
    key: 'actions',
    width: 100,
    render(row) {
      if (['pending', 'running'].includes(row.status)) {
        return h(NButton, {
          size: 'small',
          type: 'error',
          secondary: true,
          onClick: () => handleCancelTask(row.task_id)
        }, { default: () => '取消' })
      }
      return h(NButton, {
         size: 'small',
         secondary: true,
         onClick: () => viewTaskDetails(row.task_id)
      }, { default: () => '详情' })
    }
  }
]

const handleCancelTask = (taskId: string) => {
  dialog.warning({
    title: '取消任务',
    content: '确定要取消该任务吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await cancelCrawlerTask(taskId)
        message.success('任务已取消')
        loadTasks()
      } catch (e: any) {
        message.error('取消失败')
      }
    }
  })
}

// ============ Task Details ============
const showDetailModal = ref(false)
const currentTask = ref<CrawlerTask | null>(null)
const viewingTaskId = ref<string | null>(null)

const viewTaskDetails = async (taskId: string) => {
  viewingTaskId.value = taskId
  showDetailModal.value = true
  const res = await fetchCrawlerTask(taskId)
  currentTask.value = (res as any)?.data || res
}

// ============ Create Task Forms ============
const activeTab = ref('new')
const newMode = ref('ids') // ids, user, tag

// Form Models
const idsForm = ref({
  input: '',
  skipExisting: true
})
const userForm = ref({
  userId: '',
  skipExisting: true
})
const tagForm = ref({
  tag: '',
  mode: 'popular',
  pageFrom: 1,
  pageTo: 5,
  skipExisting: true
})

const submitting = ref(false)

const submitByIds = async () => {
  if (!idsForm.value.input) return message.warning('请输入图片 ID')
  
  const ids = idsForm.value.input.split(/[,，\s\n]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  if (ids.length === 0) return message.warning('未找到有效的 ID')

  submitting.value = true
  try {
    const res = await crawlByIds({
      illustIds: ids,
      skipExisting: idsForm.value.skipExisting
    })
    const data = (res as any)?.data || res
    message.success(`任务创建成功: ${data.task_id}`)
    idsForm.value.input = ''
    activeTab.value = 'list'
    loadTasks()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '创建任务失败')
  } finally {
    submitting.value = false
  }
}

const submitByUser = async () => {
  if (!userForm.value.userId) return message.warning('请输入画师 ID')
  
  submitting.value = true
  try {
    const res = await crawlByUser(userForm.value.userId, userForm.value.skipExisting)
    const data = (res as any)?.data || res
    message.success(`任务创建成功: ${data.task_id}`)
    userForm.value.userId = ''
    activeTab.value = 'list'
    loadTasks()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '创建任务失败')
  } finally {
    submitting.value = false
  }
}

const submitByTag = async () => {
  if (!tagForm.value.tag) return message.warning('请输入搜索标签')
  
  submitting.value = true
  try {
    const res = await crawlByTag({
      tag: tagForm.value.tag,
      mode: tagForm.value.mode as 'popular' | 'latest',
      pageFrom: tagForm.value.pageFrom,
      pageTo: tagForm.value.pageTo,
      skipExisting: tagForm.value.skipExisting
    })
    const data = (res as any)?.data || res
    message.success(`任务创建成功: ${data.task_id}`)
    tagForm.value.tag = ''
    activeTab.value = 'list'
    loadTasks()
  } catch (e: any) {
    message.error(e?.response?.data?.message || '创建任务失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  checkHealth()
  loadTasks()
  pollTimer = window.setInterval(loadTasks, 5000) // Poll every 5s
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <n-icon size="28" color="#f586a9"><CloudDownloadOutline /></n-icon>
          新增图片
        </h1>
      </div>
      <div class="header-right">
        <n-tag :type="healthStatus ? 'success' : 'error'" round>
          <template #icon><n-icon><PulseOutline /></n-icon></template>
          {{ healthStatus ? '服务在线' : '服务离线' }}
        </n-tag>
      </div>
    </div>

    <n-card class="glass-card" content-style="padding: 0;">
      <n-tabs type="line" size="large" :tabs-padding="20" v-model:value="activeTab">
        
        <!-- Tab 1: Create Task -->
        <n-tab-pane name="new" tab="新建任务">
          <div class="tab-content">
            <div class="mode-selector">
              <n-button 
                :type="newMode === 'ids' ? 'primary' : 'default'" 
                @click="newMode = 'ids'"
                class="mode-btn"
              >
                <template #icon><n-icon><ImagesOutline /></n-icon></template>
                按 ID 抓取
              </n-button>
              <n-button 
                :type="newMode === 'user' ? 'primary' : 'default'" 
                @click="newMode = 'user'"
                class="mode-btn"
              >
                <template #icon><n-icon><PersonOutline /></n-icon></template>
                按画师抓取
              </n-button>
              <n-button 
                :type="newMode === 'tag' ? 'primary' : 'default'" 
                @click="newMode = 'tag'"
                class="mode-btn"
              >
                <template #icon><n-icon><PricetagOutline /></n-icon></template>
                按标签抓取
              </n-button>
            </div>

            <!-- Form: IDs -->
            <div v-if="newMode === 'ids'" class="form-wrapper">
              <div class="form-desc">批量抓取指定 PID 的作品。</div>
              <n-form label-placement="left" label-width="100">
                <n-form-item label="作品 ID">
                  <n-input 
                    v-model:value="idsForm.input" 
                    type="textarea" 
                    placeholder="输入 PID，多个用逗号或换行分隔" 
                    :rows="5"
                  />
                </n-form-item>
                <n-form-item label="跳过已存在">
                  <n-switch v-model:value="idsForm.skipExisting" />
                </n-form-item>
                <n-form-item>
                  <n-button type="primary" :loading="submitting" @click="submitByIds">
                    <template #icon><n-icon><PlayOutline /></n-icon></template>
                    开始抓取
                  </n-button>
                </n-form-item>
              </n-form>
            </div>

            <!-- Form: User -->
            <div v-if="newMode === 'user'" class="form-wrapper">
              <div class="form-desc">抓取指定画师的所有作品。</div>
              <n-form label-placement="left" label-width="100">
                <n-form-item label="画师 UID">
                  <n-input v-model:value="userForm.userId" placeholder="输入画师 ID" />
                </n-form-item>
                <n-form-item label="跳过已存在">
                  <n-switch v-model:value="userForm.skipExisting" />
                </n-form-item>
                <n-form-item>
                  <n-button type="primary" :loading="submitting" @click="submitByUser">
                    <template #icon><n-icon><PlayOutline /></n-icon></template>
                    开始抓取
                  </n-button>
                </n-form-item>
              </n-form>
            </div>

            <!-- Form: Tag -->
            <div v-if="newMode === 'tag'" class="form-wrapper">
              <div class="form-desc">搜索并抓取标签下的热门或最新作品。</div>
              <n-form label-placement="left" label-width="100">
                <n-form-item label="搜索标签">
                  <n-input v-model:value="tagForm.tag" placeholder="如：原神" />
                </n-form-item>
                <n-form-item label="排序模式">
                  <n-select v-model:value="tagForm.mode" :options="[
                    { label: '热门 (Popular)', value: 'popular' },
                    { label: '最新 (Latest)', value: 'latest' }
                  ]" />
                </n-form-item>
                <n-form-item label="页码范围">
                  <div class="flex-row">
                    <n-input-number v-model:value="tagForm.pageFrom" :min="1" />
                    <span class="mx-2">至</span>
                    <n-input-number v-model:value="tagForm.pageTo" :min="tagForm.pageFrom" />
                  </div>
                </n-form-item>
                <n-form-item label="跳过已存在">
                  <n-switch v-model:value="tagForm.skipExisting" />
                </n-form-item>
                <n-form-item>
                  <n-button type="primary" :loading="submitting" @click="submitByTag">
                    <template #icon><n-icon><PlayOutline /></n-icon></template>
                    开始抓取
                  </n-button>
                </n-form-item>
              </n-form>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 2: Task History -->
        <n-tab-pane name="list" tab="任务历史">
          <div class="tab-content">
            <div class="list-toolbar">
              <n-button size="small" @click="loadTasks" :loading="loadingTasks">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                刷新
              </n-button>
            </div>
            
            <n-data-table
              :columns="columns"
              :data="tasks"
              :loading="loadingTasks"
              :pagination="{ pageSize: 10 }"
            />
          </div>
        </n-tab-pane>

      </n-tabs>
    </n-card>

    <!-- Task Detail Modal -->
    <n-modal v-model:show="showDetailModal">
      <n-card
        style="width: 600px; max-width: 90vw; height: 80vh; display: flex; flex-direction: column;"
        title="任务详情"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        class="glass-card"
        content-style="flex: 1; overflow: hidden; display: flex; flex-direction: column;"
      >
        <template #header-extra>
          <n-icon size="20" class="cursor-pointer" @click="showDetailModal = false"><CloseOutline /></n-icon>
        </template>
        
        <div v-if="currentTask" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
          <div class="task-info-grid">
            <div>
              <span class="label">Task ID:</span> {{ currentTask.task_id }}
            </div>
            <div>
              <span class="label">状态:</span>
              <n-tag :type="currentTask.status === 'completed' ? 'success' : currentTask.status === 'failed' ? 'error' : 'info'" size="small">
                {{ {
                  pending: '等待中',
                  running: '进行中',
                  completed: '已完成',
                  failed: '失败',
                  cancelled: '已取消'
                }[currentTask.status] || currentTask.status }}
              </n-tag>
            </div>
            <div>
              <span class="label">模式:</span> {{ 
                {
                  by_ids: '按 ID',
                  by_user: '按画师',
                  by_tag: '按标签'
                }[currentTask.mode] || currentTask.mode 
              }}
            </div>
             <div>
              <span class="label">开始时间:</span> {{ currentTask.started_at || '-' }}
            </div>
            <div v-if="currentTask.progress">
              <span class="label">进度:</span>
              完成 {{ currentTask.progress.done }} / {{ currentTask.progress.total }} 
              (新增: {{ currentTask.progress.new }}, 失败: {{ currentTask.progress.failed }})
            </div>
          </div>

          <div class="logs-container" style="flex: 1; border: 1px solid #eee; border-radius: 4px; padding: 8px; background: #fafafa; overflow: hidden;">
            <n-log
              :log="currentTask.logs?.join('\n') || 'No logs available'"
              :loading="false"
              trim
              style="height: 100%;"
            />
          </div>
        </div>
        <div v-else class="flex justify-center items-center h-full">
          <n-spin show />
        </div>
      </n-card>
    </n-modal>
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

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .mode-selector { flex-direction: column; }
  .mode-btn { width: 100%; }
}
</style>
