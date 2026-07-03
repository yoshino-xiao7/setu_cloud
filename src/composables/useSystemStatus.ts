import type { ServiceHealthData, StatusData, StatusOverviewData } from '@/api/status'
import {
  CheckmarkCircle,
  CloseCircleOutline,
  HelpCircleOutline,
  WarningOutline,
} from '@vicons/ionicons5'
import { graphic } from 'echarts/core'
import { useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { unwrapApiData } from '@/api/response'
import { fetchStatusOverview } from '@/api/status'
import { useSeo } from '@/composables/useSeo'
import { useVisibilityPolling } from '@/composables/useVisibilityPolling'
import { formatTimeHM, formatTimeOnly } from '@/utils/dateFormat'

const STATUS_POLL_INTERVAL_MS = 15000
const CHART_POINT_COUNT = 20

const areaGradient = new graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: 'rgba(245, 134, 169, 0.4)' },
  { offset: 1, color: 'rgba(245, 134, 169, 0)' },
])

export function useSystemStatus() {
  const message = useMessage()

  useSeo({
    title: '系统状态',
    description: '查看雪涼云 API 服务的实时运行状态和性能指标。',
  })

  const loading = ref(true)
  const lastUpdatedTime = ref(formatTimeOnly())
  const systemData = ref<StatusData>({
    status: '检查中...',
    availability: 1.0,
    avgLatencyMs: 0,
    callsToday: 0,
  })
  const serviceHealth = ref<ServiceHealthData | null>(null)
  const chartData = ref<{ time: string, value: number }[]>([])

  const currentStatus = computed(() => serviceHealth.value?.status || systemData.value.status)

  const statusColor = computed(() => {
    const status = currentStatus.value
    if (status === '正常')
      return '#10b981'
    if (status === '降级')
      return '#f59e0b'
    if (status === '故障')
      return '#ef4444'
    return '#6b7280'
  })

  const StatusIcon = computed(() => {
    const status = currentStatus.value
    if (status === '正常')
      return CheckmarkCircle
    if (status === '降级')
      return WarningOutline
    if (status === '故障')
      return CloseCircleOutline
    return HelpCircleOutline
  })

  const hasRecentData = computed(() => {
    return typeof systemData.value.availability === 'number'
      && Number.isFinite(systemData.value.availability)
  })

  const availabilityText = computed(() => {
    if (!hasRecentData.value)
      return '暂无样本'
    return `${((systemData.value.availability ?? 0) * 100).toFixed(1)}%`
  })

  const availabilityPercent = computed(() => {
    if (!hasRecentData.value)
      return 0
    return Math.max(0, Math.min(100, (systemData.value.availability ?? 0) * 100))
  })

  const latencyText = computed(() => {
    if (!hasRecentData.value || !systemData.value.avgLatencyMs)
      return '无近期调用'
    return `${Math.round(systemData.value.avgLatencyMs)}ms`
  })

  const timeRangeStart = computed(() => formatTimeHM(Date.now() - 5 * 60 * 1000))
  const timeRangeEnd = computed(() => formatTimeHM())

  function initChartData() {
    const now = Date.now()
    for (let i = 0; i < CHART_POINT_COUNT; i++) {
      chartData.value.push({
        time: formatTimeOnly(now - (CHART_POINT_COUNT - i) * 5000),
        value: 0,
      })
    }
  }

  async function fetchStatus() {
    try {
      const overview = unwrapApiData<StatusOverviewData>(
        await fetchStatusOverview(),
      )
      const json = overview.status

      systemData.value = json
      serviceHealth.value = overview.health ?? null

      const nowStr = formatTimeOnly()
      lastUpdatedTime.value = nowStr
      chartData.value.push({
        time: nowStr,
        value: json.avgLatencyMs ?? 0,
      })
      if (chartData.value.length > CHART_POINT_COUNT)
        chartData.value.shift()

      loading.value = false
    }
    catch {
      // 只有首次加载失败才提示，避免后台轮询持续打扰用户。
      if (loading.value)
        message.error('状态监控服务连接失败')
    }
  }

  const statusPolling = useVisibilityPolling(fetchStatus, {
    intervalMs: STATUS_POLL_INTERVAL_MS,
  })

  onMounted(() => {
    initChartData()
    void fetchStatus()
    statusPolling.start()
  })

  onUnmounted(() => {
    statusPolling.stop()
  })

  const chartOption = computed(() => ({
    backgroundColor: 'transparent',
    grid: { top: 30, right: 20, bottom: 20, left: 50, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'transparent',
      textStyle: { color: '#333' },
    },
    xAxis: {
      type: 'category',
      data: chartData.value.map(i => i.time),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { show: true, lineStyle: { type: 'dashed', color: 'rgba(0,0,0,0.05)' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    series: [
      {
        name: '响应延迟',
        type: 'line',
        data: chartData.value.map(i => i.value),
        smooth: true,
        showSymbol: false,
        itemStyle: { color: '#f586a9' },
        areaStyle: {
          color: areaGradient,
        },
        lineStyle: { width: 3, shadowColor: 'rgba(245, 134, 169, 0.3)', shadowBlur: 10 },
      },
    ],
  }))

  return {
    availabilityPercent,
    availabilityText,
    chartOption,
    currentStatus,
    lastUpdatedTime,
    latencyText,
    statusColor,
    StatusIcon,
    systemData,
    timeRangeEnd,
    timeRangeStart,
  }
}
