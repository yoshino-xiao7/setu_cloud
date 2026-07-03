import type { MessageApi } from 'naive-ui'
import type { AdminBlogStats, AdminUserListResponse, BlacklistIpItem } from '@/api/admin'
import { computed, onMounted, ref } from 'vue'
import {
  fetchAdminBlogStats,
  fetchAdminUserList,
  fetchIpBlacklist,
  syncAdminImageCount,
} from '@/api/admin'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { fetchImageCount, normalizeImageCount } from '@/api/status'
import { getUserInfo } from '@/api/user'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatDate } from '@/utils/dateFormat'

interface AuthStoreLike {
  user: {
    nickname?: string
    email?: string
    role?: number
  } | null
}

export interface UseAdminOverviewOptions {
  auth: AuthStoreLike
  message: MessageApi
}

export function useAdminOverview(options: UseAdminOverviewOptions) {
  const dashboardGuard = useRequestGuard()
  const userInfoGuard = useRequestGuard()
  const loading = ref(false)
  const syncing = ref(false)

  const stats = ref({
    totalCalls: 0,
    updatedAt: '',
    totalUsers: 0,
    blockedIps: 0,
    totalImages: 0,
  })

  const adminName = computed(() => {
    const user = options.auth.user
    return user?.nickname || user?.email?.split('@')[0] || 'Administrator'
  })

  const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 6)
      return '夜深了'
    if (hour < 11)
      return '早上好'
    if (hour < 14)
      return '中午好'
    if (hour < 18)
      return '下午好'
    return '晚上好'
  })

  async function loadDashboardData() {
    const requestId = dashboardGuard.next()
    loading.value = true
    try {
      const [blogRes, userRes, blacklistRes, imgRes] = await Promise.all([
        fetchAdminBlogStats(),
        fetchAdminUserList({ page: 1, pageSize: 1 }),
        fetchIpBlacklist(),
        fetchImageCount({ cacheBust: true }),
      ])
      if (!dashboardGuard.isCurrent(requestId))
        return

      const blogData = unwrapApiData<AdminBlogStats | null>(blogRes, null)
      if (blogData) {
        stats.value.totalCalls = blogData.totalCalls || 0
        stats.value.updatedAt = blogData.updatedAt
      }

      const userData = unwrapApiData<AdminUserListResponse | null>(userRes, null)
      if (userData)
        stats.value.totalUsers = userData.total || 0

      stats.value.blockedIps = unwrapApiList<BlacklistIpItem>(blacklistRes).length

      const imgData = unwrapApiData(imgRes, null)
      stats.value.totalImages = normalizeImageCount(imgData)
    }
    catch {
      if (dashboardGuard.isCurrent(requestId))
        options.message.error('部分数据加载失败')
    }
    finally {
      if (dashboardGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  async function handleManualSync() {
    if (syncing.value)
      return
    syncing.value = true

    try {
      await syncAdminImageCount()
      options.message.success('同步成功，数据已更新')
      await loadDashboardData()
    }
    catch {
      options.message.error('同步失败，请检查网络或权限')
    }
    finally {
      syncing.value = false
    }
  }

  async function refreshUserInfo() {
    const requestId = userInfoGuard.next()
    try {
      const res = await getUserInfo()
      if (!userInfoGuard.isCurrent(requestId))
        return

      if (res && options.auth.user) {
        // Update fields one by one to avoid unnecessary reactive cascades.
        if (res.nickname !== undefined && res.nickname !== options.auth.user.nickname)
          options.auth.user.nickname = res.nickname
        if (res.email !== undefined && res.email !== options.auth.user.email)
          options.auth.user.email = res.email
        if (res.role !== undefined && res.role !== options.auth.user.role)
          options.auth.user.role = res.role
      }
    }
    catch {}
  }

  function formatTimeDisplay(timeStr?: string) {
    return timeStr ? formatDate(timeStr) : '统计中...'
  }

  onMounted(() => {
    void loadDashboardData()
    void refreshUserInfo()
  })

  return {
    adminName,
    formatTimeDisplay,
    greeting,
    handleManualSync,
    loading,
    stats,
    syncing,
  }
}
