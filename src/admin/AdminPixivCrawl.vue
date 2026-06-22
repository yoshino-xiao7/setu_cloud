<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { CrawlerTask, PixivHealthResponse, TaskListResponse } from '@/api/pixiv'
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
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import {
  cancelCrawlerTask,
  checkCrawlerHealth,
  crawlByIds,
  crawlByTag,
  crawlByUser,

  fetchCrawlerTask,
  fetchCrawlerTasks,

} from '@/api/pixiv'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { formatDate, parseDate } from '@/utils/dateFormat'

const message = useMessage()
const dialog = useDialog()
const { isCompact } = useBreakpoint()

// ============ Health Check ============
const healthStatus = ref<PixivHealthResponse | null>(null)
const checkingHealth = ref(false)
const activeTab = ref('new')

async function checkHealth() {
  checkingHealth.value = true
  try {
    const res = await checkCrawlerHealth()
    healthStatus.value = unwrapApiData<PixivHealthResponse | null>(res, null)
  }
  catch {
    healthStatus.value = null
  }
  finally {
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
  pageSizes: [10, 20, 50],
}
const taskRowKey = (row: CrawlerTask) => row.task_id
const taskCandidateLimit = TASK_HISTORY_LIMIT * 3

function normalizeTaskListPayload(res: unknown): TaskListResponse {
  const payload = unwrapApiData<TaskListResponse | CrawlerTask[]>(res, { total: 0, tasks: [] })
  if (Array.isArray(payload))
    return { total: payload.length, tasks: payload }
  return {
    total: Number(payload?.total || payload?.tasks?.length || 0),
    tasks: Array.isArray(payload?.tasks) ? payload.tasks : [],
  }
}

function normalizeTaskSummary(task: CrawlerTask): CrawlerTask {
  const { logs: _logs, ...summary } = task
  return {
    ...summary,
    task_id: String(task.task_id || ''),
    progress: task.progress ? { ...task.progress } : undefined,
  }
}

function parseTaskTime(task: CrawlerTask) {
  const rawTime = task.server_timestamp || task.started_at || task.finished_at || ''
  return parseDate(rawTime)
}

function mergeTaskCandidates(batches: CrawlerTask[][]) {
  const map = new Map<string, CrawlerTask>()
  for (const batch of batches) {
    for (const task of batch) {
      const summary = normalizeTaskSummary(task)
      if (!summary.task_id)
        continue
      map.set(summary.task_id, summary)
    }
  }
  return [...map.values()]
}

async function loadTasks(options: { silent?: boolean } = {}) {
  if (loadingTaskInFlight)
    return
  loadingTaskInFlight = true
  if (!options.silent)
    loadingTasks.value = true
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
  }
  catch {
    if (!options.silent)
      message.error('加载任务列表失败')
  }
  finally {
    loadingTaskInFlight = false
    loadingTasks.value = false
  }
}

function startTaskPolling() {
  if (pollTimer || document.hidden)
    return
  pollTimer = window.setInterval(() => {
    if (activeTab.value === 'list') {
      loadTasks({ silent: true })
    }
  }, TASK_POLL_INTERVAL)
}

function stopTaskPolling() {
  if (!pollTimer)
    return
  clearInterval(pollTimer)
  pollTimer = null
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopTaskPolling()
    return
  }

  if (activeTab.value === 'list') {
    loadTasks({ silent: true })
    startTaskPolling()
  }
}

function renderStatus(row: CrawlerTask) {
  const typeMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    pending: 'default',
    running: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning',
  }
  const textMap: Record<string, string> = {
    pending: '等待中',
    running: '进行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  }
  return h(NTag, { type: typeMap[row.status] || 'default', size: 'small' }, { default: () => textMap[row.status] || row.status })
}

function renderMode(row: CrawlerTask) {
  const modeMap: Record<string, string> = {
    by_ids: '按 ID',
    by_user: '按画师',
    by_tag: '按标签',
  }
  return modeMap[row.mode] || row.mode
}

function renderProgress(row: CrawlerTask) {
  if (!row.progress || row.progress.total === 0)
    return '0/0'
  const percent = Math.round((row.progress.done / row.progress.total) * 100)
  return h('div', { style: 'display: flex; flex-direction: column; gap: 2px;' }, [
    h('span', { style: 'font-size: 12px; color: #666;' }, `${row.progress.done}/${row.progress.total}`),
    h(NProgress, {
      type: 'line',
      percentage: percent,
      status: row.status === 'failed' ? 'error' : row.status === 'completed' ? 'success' : 'info',
      height: 10,
      showIndicator: false,
    }),
  ])
}

const columns: DataTableColumns<CrawlerTask> = [
  { title: 'ID', key: 'task_id', width: 100, ellipsis: true },
  { title: '模式', key: 'mode', width: 100, render: renderMode },
  { title: '状态', key: 'status', width: 100, render: renderStatus },
  { title: '进度', key: 'progress', width: 150, render: renderProgress },
  { title: '开始时间', key: 'started_at', width: 180, render: row => formatDate(row.started_at) },
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
          onClick: () => handleCancelTask(row.task_id),
        }, { default: () => '取消' })
      }
      return h(NButton, {
        size: 'small',
        secondary: true,
        onClick: () => viewTaskDetails(row.task_id),
      }, { default: () => '详情' })
    },
  },
]

function handleCancelTask(taskId: string) {
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
      }
      catch {
        message.error('取消失败')
      }
    },
  })
}

// ============ Task Details ============
const showDetailModal = ref(false)
const currentTask = shallowRef<CrawlerTask | null>(null)

const currentTaskLog = computed(() => {
  const logs = currentTask.value?.logs
  if (!logs?.length)
    return 'No logs available'

  const latestLogs = logs.slice(-TASK_LOG_LINE_LIMIT).map(line => String(line))
  let logText = latestLogs.join('\n')
  const omittedLines = logs.length - latestLogs.length
  const omittedChars = Math.max(0, logText.length - TASK_LOG_CHAR_LIMIT)

  if (logText.length > TASK_LOG_CHAR_LIMIT) {
    logText = logText.slice(-TASK_LOG_CHAR_LIMIT)
  }

  const notices: string[] = []
  if (omittedLines > 0)
    notices.push(`仅展示最近 ${latestLogs.length} 条日志，已省略 ${omittedLines} 条。`)
  if (omittedChars > 0)
    notices.push(`日志文本过长，已截断前部 ${omittedChars} 个字符。`)

  return notices.length ? `${notices.join('\n')}\n\n${logText}` : logText
})

async function viewTaskDetails(taskId: string) {
  showDetailModal.value = true
  currentTask.value = null
  try {
    const res = await fetchCrawlerTask(taskId)
    const task = unwrapApiData<CrawlerTask | null>(res, null)
    if (!task)
      throw new Error('Empty task detail')
    currentTask.value = task
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showDetailModal.value = false
    showApiError(message, e, '加载任务详情失败')
  }
}

// ============ Create Task Forms ============
const newMode = ref('ids') // ids, user, tag

// Form Models
const idsForm = ref({
  input: '',
  skipExisting: true,
})
const userForm = ref({
  userId: '',
  skipExisting: true,
})
const tagForm = ref({
  tag: '',
  mode: 'popular',
  pageFrom: 1,
  pageTo: 5,
  skipExisting: true,
})

const submitting = ref(false)

watch(activeTab, (tab) => {
  if (tab === 'list') {
    mobilePage.value = 1
    loadTasks()
    startTaskPolling()
  }
  else {
    stopTaskPolling()
  }
})

watch(taskRows, (rows) => {
  const maxPage = Math.max(1, Math.ceil(rows.length / mobilePageSize))
  if (mobilePage.value > maxPage)
    mobilePage.value = maxPage
})

async function submitByIds() {
  if (!idsForm.value.input)
    return message.warning('请输入图片 ID')

  const ids = idsForm.value.input.split(/[,，\s]+/).map(s => Number.parseInt(s.trim())).filter(n => !Number.isNaN(n))
  if (ids.length === 0)
    return message.warning('未找到有效的 ID')

  submitting.value = true
  try {
    const res = await crawlByIds({
      illustIds: ids,
      skipExisting: idsForm.value.skipExisting,
    })
    const data = unwrapApiData<{ task_id: string }>(res, { task_id: '' })
    message.success(`任务创建成功: ${data.task_id}`)
    idsForm.value.input = ''
    activeTab.value = 'list'
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '创建任务失败')
  }
  finally {
    submitting.value = false
  }
}

async function submitByUser() {
  if (!userForm.value.userId)
    return message.warning('请输入画师 ID')

  submitting.value = true
  try {
    const res = await crawlByUser(userForm.value.userId, userForm.value.skipExisting)
    const data = unwrapApiData<{ task_id: string }>(res, { task_id: '' })
    message.success(`任务创建成功: ${data.task_id}`)
    userForm.value.userId = ''
    activeTab.value = 'list'
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '创建任务失败')
  }
  finally {
    submitting.value = false
  }
}

async function submitByTag() {
  if (!tagForm.value.tag)
    return message.warning('请输入搜索标签')

  submitting.value = true
  try {
    const res = await crawlByTag({
      tag: tagForm.value.tag,
      mode: tagForm.value.mode as 'popular' | 'latest',
      pageFrom: tagForm.value.pageFrom,
      pageTo: tagForm.value.pageTo,
      skipExisting: tagForm.value.skipExisting,
    })
    const data = unwrapApiData<{ task_id: string }>(res, { task_id: '' })
    message.success(`任务创建成功: ${data.task_id}`)
    tagForm.value.tag = ''
    activeTab.value = 'list'
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    showApiError(message, e, '创建任务失败')
  }
  finally {
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
