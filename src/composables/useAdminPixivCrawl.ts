import type { DataTableColumns } from 'naive-ui'
import type { CrawlerTask, PixivHealthResponse, TaskListResponse } from '@/api/pixiv'
import { NButton, NProgress, NTag, useDialog, useMessage } from 'naive-ui'
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

const TASK_HISTORY_LIMIT = 100
const TASK_LOG_LINE_LIMIT = 1200
const TASK_LOG_CHAR_LIMIT = 120_000
const TASK_POLL_INTERVAL = 5000
const MOBILE_PAGE_SIZE = 10
const TASK_CANDIDATE_LIMIT = TASK_HISTORY_LIMIT * 3

export function useAdminPixivCrawl() {
  const message = useMessage()
  const dialog = useDialog()
  const { isCompact } = useBreakpoint()

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

  const tasks = shallowRef<CrawlerTask[]>([])
  const taskTotal = ref(0)
  const loadingTasks = ref(false)
  let pollTimer: number | null = null
  let loadingTaskInFlight = false

  const taskRows = computed(() => tasks.value.slice(0, TASK_HISTORY_LIMIT))
  const mobilePage = ref(1)
  const pagedMobileTasks = computed(() => {
    const start = (mobilePage.value - 1) * MOBILE_PAGE_SIZE
    return taskRows.value.slice(start, start + MOBILE_PAGE_SIZE)
  })
  const tablePagination = {
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  }
  const taskRowKey = (row: CrawlerTask) => row.task_id

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
        const latestWindowOffset = Math.max(0, firstData.total - TASK_CANDIDATE_LIMIT)
        const latestRes = await fetchCrawlerTasks({ limit: TASK_CANDIDATE_LIMIT, offset: latestWindowOffset })
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
      if (activeTab.value === 'list')
        void loadTasks({ silent: true })
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
      void loadTasks({ silent: true })
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
          void loadTasks()
        }
        catch {
          message.error('取消失败')
        }
      },
    })
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

    if (logText.length > TASK_LOG_CHAR_LIMIT)
      logText = logText.slice(-TASK_LOG_CHAR_LIMIT)

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

  const newMode = ref('ids')
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
      void loadTasks()
      startTaskPolling()
    }
    else {
      stopTaskPolling()
    }
  })

  watch(taskRows, (rows) => {
    const maxPage = Math.max(1, Math.ceil(rows.length / MOBILE_PAGE_SIZE))
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
    void checkHealth()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stopTaskPolling()
  })

  return {
    activeTab,
    checkingHealth,
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
    mobilePageSize: MOBILE_PAGE_SIZE,
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
  }
}
