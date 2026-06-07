<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onUnmounted, h } from 'vue'
import {
  NCard, NButton, NIcon, NTag, NSpin, NTabs, NTabPane,
  NForm, NFormItem, NInput, NInputNumber, NSwitch, NSelect,
  NDataTable, type DataTableColumns, NProgress, NEmpty, NPagination,
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
  type PixivHealthResponse,
  type TaskListResponse
} from '@/api/pixiv'
import { unwrapApiData } from '@/api/response'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { getApiErrorMessage } from '@/composables/useApiError'

const message = useMessage()
const dialog = useDialog()
const { isCompact } = useBreakpoint()

// ============ Health Check ============
const healthStatus = ref<PixivHealthResponse | null>(null)
const checkingHealth = ref(false)

const checkHealth = async () => {
  checkingHealth.value = true
  try {
    const res = await checkCrawlerHealth()
    healthStatus.value = unwrapApiData<PixivHealthResponse | null>(res, null)
  } catch (e) {
    healthStatus.value = null
  } finally {
    checkingHealth.value = false
  }
}

// ============ Task List ============
const TASK_HISTORY_LIMIT = 100
const TASK_LOG_LINE_LIMIT = 1200
const TASK_LOG_CHAR_LIMIT = 120_000
const TASK_POLL_INTERVAL = 5000

const tasks = shallowRef<CrawlerTask[]>([])
const taskTotal = ref(0)
const loadingTasks = ref(false)
let pollTimer: number | null = null
let loadingTaskInFlight = false

const taskRows = computed(() => tasks.value.slice(0, TASK_HISTORY_LIMIT))
const mobilePage = ref(1)
const mobilePageSize = 10
const pagedMobileTasks = computed(() => {
  const start = (mobilePage.value - 1) * mobilePageSize
  return taskRows.value.slice(start, start + mobilePageSize)
})
const tablePagination = {
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
}
const taskRowKey = (row: CrawlerTask) => row.task_id
const taskCandidateLimit = TASK_HISTORY_LIMIT * 3

const normalizeTaskListPayload = (res: unknown): TaskListResponse => {
  const payload = unwrapApiData<TaskListResponse | CrawlerTask[]>(res, { total: 0, tasks: [] })
  if (Array.isArray(payload)) return { total: payload.length, tasks: payload }
  return {
    total: Number(payload?.total || payload?.tasks?.length || 0),
    tasks: Array.isArray(payload?.tasks) ? payload.tasks : []
  }
}

const normalizeTaskSummary = (task: CrawlerTask): CrawlerTask => {
  const { logs: _logs, ...summary } = task
  return {
    ...summary,
    task_id: String(task.task_id || ''),
    progress: task.progress ? { ...task.progress } : undefined
  }
}

const parseTaskTime = (task: CrawlerTask) => {
  const rawTime = task.server_timestamp || task.started_at || task.finished_at || ''
  return Date.parse(rawTime.replace(' ', 'T')) || 0
}

const mergeTaskCandidates = (batches: CrawlerTask[][]) => {
  const map = new Map<string, CrawlerTask>()
  for (const batch of batches) {
    for (const task of batch) {
      const summary = normalizeTaskSummary(task)
      if (!summary.task_id) continue
      map.set(summary.task_id, summary)
    }
  }
  return [...map.values()]
}

const loadTasks = async (options: { silent?: boolean } = {}) => {
  if (loadingTaskInFlight) return
  loadingTaskInFlight = true
  if (!options.silent) loadingTasks.value = true
  try {
    const firstRes = await fetchCrawlerTasks({ limit: TASK_HISTORY_LIMIT, offset: 0 })
    const firstData = normalizeTaskListPayload(firstRes)
    taskTotal.value = firstData.total

    const batches = [firstData.tasks]
    if (firstData.total > TASK_HISTORY_LIMIT) {
      const latestWindowOffset = Math.max(0, firstData.total - taskCandidateLimit)
      const latestRes = await fetchCrawlerTasks({ limit: taskCandidateLimit, offset: latestWindowOffset })
      const latestData = normalizeTaskListPayload(latestRes)
      taskTotal.value = Math.max(taskTotal.value, latestData.total)
      batches.push(latestData.tasks)
    }

    tasks.value = mergeTaskCandidates(batches)
      .sort((a: CrawlerTask, b: CrawlerTask) => parseTaskTime(b) - parseTaskTime(a))
      .slice(0, TASK_HISTORY_LIMIT)
  } catch (e: unknown) {
    if (!options.silent) message.error('加载任务列表失败')
  } finally {
    loadingTaskInFlight = false
    loadingTasks.value = false
  }
}

const startTaskPolling = () => {
  if (pollTimer || document.hidden) return
  pollTimer = window.setInterval(() => {
    if (activeTab.value === 'list') {
      loadTasks({ silent: true })
    }
  }, TASK_POLL_INTERVAL)
}

const stopTaskPolling = () => {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopTaskPolling()
    return
  }

  if (activeTab.value === 'list') {
    loadTasks({ silent: true })
    startTaskPolling()
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

const renderMode = (row: CrawlerTask) => {
  const modeMap: Record<string, string> = {
    by_ids: '按 ID',
    by_user: '按画师',
    by_tag: '按标签'
  }
  return modeMap[row.mode] || row.mode
}

const renderProgress = (row: CrawlerTask) => {
  if (!row.progress || row.progress.total === 0) return '0/0'
  const percent = Math.round((row.progress.done / row.progress.total) * 100)
  return h('div', { style: 'display: flex; flex-direction: column; gap: 2px;' }, [
    h('span', { style: 'font-size: 12px; color: #666;' }, `${row.progress.done}/${row.progress.total}`),
    h(NProgress, {
      type: 'line',
      percentage: percent,
      status: row.status === 'failed' ? 'error' : row.status === 'completed' ? 'success' : 'info',
      height: 10,
      showIndicator: false
    })
  ])
}

const columns: DataTableColumns<CrawlerTask> = [
  { title: 'ID', key: 'task_id', width: 100, ellipsis: true },
  { title: '模式', key: 'mode', width: 100, render: renderMode },
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
      } catch (e: unknown) {
        message.error('取消失败')
      }
    }
  })
}

// ============ Task Details ============
const showDetailModal = ref(false)
const currentTask = shallowRef<CrawlerTask | null>(null)

const currentTaskLog = computed(() => {
  const logs = currentTask.value?.logs
  if (!logs?.length) return 'No logs available'

  const latestLogs = logs.slice(-TASK_LOG_LINE_LIMIT).map((line) => String(line))
  let logText = latestLogs.join('\n')
  const omittedLines = logs.length - latestLogs.length
  const omittedChars = Math.max(0, logText.length - TASK_LOG_CHAR_LIMIT)

  if (logText.length > TASK_LOG_CHAR_LIMIT) {
    logText = logText.slice(-TASK_LOG_CHAR_LIMIT)
  }

  const notices: string[] = []
  if (omittedLines > 0) notices.push(`仅展示最近 ${latestLogs.length} 条日志，已省略 ${omittedLines} 条。`)
  if (omittedChars > 0) notices.push(`日志文本过长，已截断前部 ${omittedChars} 个字符。`)

  return notices.length ? `${notices.join('\n')}\n\n${logText}` : logText
})

const viewTaskDetails = async (taskId: string) => {
  showDetailModal.value = true
  currentTask.value = null
  try {
    const res = await fetchCrawlerTask(taskId)
    const task = unwrapApiData<CrawlerTask | null>(res, null)
    if (!task) throw new Error('Empty task detail')
    currentTask.value = task
  } catch (e: unknown) {
    showDetailModal.value = false
    message.error(getApiErrorMessage(e, '加载任务详情失败'))
  }
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

watch(activeTab, (tab) => {
  if (tab === 'list') {
    mobilePage.value = 1
    loadTasks()
    startTaskPolling()
  } else {
    stopTaskPolling()
  }
})

watch(taskRows, (rows) => {
  const maxPage = Math.max(1, Math.ceil(rows.length / mobilePageSize))
  if (mobilePage.value > maxPage) mobilePage.value = maxPage
})

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
    const data = unwrapApiData<{ task_id: string }>(res, { task_id: '' })
    message.success(`任务创建成功: ${data.task_id}`)
    idsForm.value.input = ''
    activeTab.value = 'list'
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '创建任务失败'))
  } finally {
    submitting.value = false
  }
}

const submitByUser = async () => {
  if (!userForm.value.userId) return message.warning('请输入画师 ID')
  
  submitting.value = true
  try {
    const res = await crawlByUser(userForm.value.userId, userForm.value.skipExisting)
    const data = unwrapApiData<{ task_id: string }>(res, { task_id: '' })
    message.success(`任务创建成功: ${data.task_id}`)
    userForm.value.userId = ''
    activeTab.value = 'list'
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '创建任务失败'))
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
    const data = unwrapApiData<{ task_id: string }>(res, { task_id: '' })
    message.success(`任务创建成功: ${data.task_id}`)
    tagForm.value.tag = ''
    activeTab.value = 'list'
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '创建任务失败'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  checkHealth()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopTaskPolling()
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
              <n-button size="small" @click="loadTasks()" :loading="loadingTasks">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                刷新
              </n-button>
            </div>
            <div v-if="taskTotal > taskRows.length" class="list-meta">
              仅展示最近 {{ taskRows.length }} / {{ taskTotal }} 个任务
            </div>
            
            <!-- Desktop Table -->
            <n-data-table
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
                <n-spin size="small" />
              </div>
              <n-empty v-else-if="taskRows.length === 0" description="暂无任务记录" class="py-8" />
              
              <div v-else v-for="task in pagedMobileTasks" :key="task.task_id" class="mobile-task-card">
                <div class="task-card-header">
                  <span class="task-id">ID: {{ task.task_id.substring(0, 8) }}...</span>
                  <n-tag :type="{
                    pending: 'default',
                    running: 'info',
                    completed: 'success',
                    failed: 'error',
                    cancelled: 'warning'
                  }[task.status] as any || 'default'" size="small">
                    {{ {
                      pending: '等待中',
                      running: '进行中',
                      completed: '已完成',
                      failed: '失败',
                      cancelled: '已取消'
                    }[task.status] || task.status }}
                  </n-tag>
                </div>
                
                <div class="task-card-body">
                  <div class="info-row">
                    <span class="label">模式:</span>
                    <span>{{ { by_ids: '按 ID', by_user: '按画师', by_tag: '按标签' }[task.mode] || task.mode }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">进度:</span>
                    <n-progress
                      type="line"
                      :percentage="task.progress && task.progress.total ? Math.round((task.progress.done / task.progress.total) * 100) : 0"
                      :status="task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'info'"
                      :height="12"
                      style="flex: 1; max-width: 150px;"
                    />
                  </div>
                  <div class="info-row">
                    <span class="label">时间:</span>
                    <span class="time">{{ task.started_at?.split('T')[1]?.split('.')[0] || '-' }}</span>
                  </div>
                </div>

                <div class="task-card-actions">
                  <n-button 
                    v-if="['pending', 'running'].includes(task.status)" 
                    size="small" type="error" secondary block
                    @click="handleCancelTask(task.task_id)"
                  >
                    取消任务
                  </n-button>
                  <n-button 
                    v-else 
                    size="small" secondary block
                    @click="viewTaskDetails(task.task_id)"
                  >
                    查看详情
                  </n-button>
                </div>
              </div>

              <n-pagination
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
        </n-tab-pane>

      </n-tabs>
    </n-card>

    <!-- Task Detail Modal -->
    <n-modal v-model:show="showDetailModal">
      <n-card
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
              :log="currentTaskLog"
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
