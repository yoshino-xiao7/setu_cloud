<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserInfo } from '@/api/user'
import { NIcon, NNumberAnimation, NSkeleton, NButton, useMessage, NTooltip } from 'naive-ui'
import {
  TimeOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
  ArrowForwardOutline,
  ServerOutline,
  ImagesOutline,
  RefreshOutline
} from '@vicons/ionicons5'

// ✅ 引入你现有的 http 工具
import http from '@/api/http'
import {
  fetchAdminBlogStats,
  fetchAdminUserList,
  fetchIpBlacklist,
  type AdminBlogStats,
  type AdminUserListResponse,
  type BlacklistIpItem
} from '@/api/admin'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatDate } from '@/utils/dateFormat'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()
const dashboardGuard = useRequestGuard()
const userInfoGuard = useRequestGuard()

const loading = ref(false)
const syncing = ref(false)

const stats = ref({
  totalCalls: 0,
  updatedAt: '',
  totalUsers: 0,
  blockedIps: 0,
  totalImages: 0
})

const adminName = computed(() => {
  const user = auth.user
  return user?.nickname || user?.email?.split('@')[0] || 'Administrator'
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

// 🔥 核心：并行加载真实数据
const loadDashboardData = async () => {
  const requestId = dashboardGuard.next()
  loading.value = true
  try {
    // 💡 加上时间戳 t=... 是为了防止浏览器缓存旧数据（比如缓存了之前的 0）
    const timestamp = new Date().getTime()

    const [blogRes, userRes, blacklistRes, imgRes] = await Promise.all([
      fetchAdminBlogStats(),
      fetchAdminUserList({ page: 1, pageSize: 1 }),
      fetchIpBlacklist(),
      // ✅ 修复点：改用 http.get，并加上时间戳清除缓存
      http.get(`/status/image-count?t=${timestamp}`)
    ])
    if (!dashboardGuard.isCurrent(requestId)) return

    // 1. API 调用量
    const blogData = unwrapApiData<AdminBlogStats | null>(blogRes, null)
    if (blogData) {
      stats.value.totalCalls = blogData.totalCalls || 0
      stats.value.updatedAt = blogData.updatedAt
    }

    // 2. 用户数
    const userData = unwrapApiData<AdminUserListResponse | null>(userRes, null)
    if (userData) stats.value.totalUsers = userData.total || 0

    // 3. 黑名单数
    stats.value.blockedIps = unwrapApiList<BlacklistIpItem>(blacklistRes).length

    // 4. 图片总数 (处理 http.get 返回的数据)
    const imgData = unwrapApiData<number | { count?: number } | null>(imgRes, null)
    // 兼容多种返回格式：
    if (typeof imgData === 'number') {
      // 格式: 378
      stats.value.totalImages = imgData
    } else if (imgData && typeof imgData.count === 'number') {
      // 格式: { count: 378 }
      stats.value.totalImages = imgData.count
    } else if (imgData && typeof imgData.data === 'number') {
      // 格式: { code: 200, data: 378 }
      stats.value.totalImages = imgData.data
    }

  } catch {
    if (!dashboardGuard.isCurrent(requestId)) return
    message.error('部分数据加载失败')
  } finally {
    if (dashboardGuard.isCurrent(requestId)) loading.value = false
  }
}

// 手动同步
const handleManualSync = async () => {
  if (syncing.value) return
  syncing.value = true

  try {
    // 这里使用 http.post，它会带上 token
    await http.post('/admin/sync/image-count')

    message.success('同步成功，数据已更新')
    await loadDashboardData()
  } catch {
    message.error('同步失败，请检查网络或权限')
  } finally {
    syncing.value = false
  }
}

const refreshUserInfo = async () => {
  const requestId = userInfoGuard.next()
  try {
    const res = await getUserInfo()
    if (!userInfoGuard.isCurrent(requestId)) return

    if (res && auth.user) {
      // ✅ 只更新有变化的字段，避免 Object.assign 触发级联响应式更新
      if (res.nickname !== undefined && res.nickname !== auth.user.nickname) auth.user.nickname = res.nickname
      if (res.email !== undefined && res.email !== auth.user.email) auth.user.email = res.email
      if (res.role !== undefined && res.role !== auth.user.role) auth.user.role = res.role
    }
  } catch {}
}

const formatTimeDisplay = (timeStr?: string) => timeStr ? formatDate(timeStr) : '统计中...'
const goUsers = () => router.push('/admin/users')
const goBlacklist = () => router.push('/admin/blacklist')

onMounted(() => {
  loadDashboardData()
  refreshUserInfo()
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <h2 class="title">{{ greeting }}，<span class="highlight">{{ adminName }}</span></h2>
      <p class="subtitle">系统各项服务正在平稳运行中，数据已实时同步。</p>
    </div>

    <div class="stats-grid">
      <div class="glass-card stat-card main-purple">
        <div class="card-bg-icon"><n-icon><ServerOutline /></n-icon></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="header-left">
              <div class="icon-box purple"><n-icon><ServerOutline /></n-icon></div>
              <span class="stat-label">API 总调用</span>
            </div>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="100px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.totalCalls" show-separator />
          </div>
          <div class="stat-footer">
            <n-icon><TimeOutline /></n-icon>
            <span>上次更新: {{ loading ? '...' : formatTimeDisplay(stats.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-content">
          <div class="stat-header space-between">
            <div class="header-left">
              <div class="icon-box orange"><n-icon><ImagesOutline /></n-icon></div>
              <span class="stat-label">图库收录</span>
            </div>
             <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary circle size="small"
                  class="sync-btn"
                  :loading="syncing"
                  @click.stop="handleManualSync"
                >
                  <template #icon>
                    <n-icon><RefreshOutline /></n-icon>
                  </template>
                </n-button>
              </template>
              手动从数据库同步最新统计
            </n-tooltip>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="80px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.totalImages" show-separator />
            <span class="unit" v-if="!loading">张</span>
          </div>
          <div class="stat-footer text-orange">
            <span>{{ syncing ? '正在同步...' : '每日凌晨自动同步' }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card cursor-pointer" role="button" tabindex="0" @click="goUsers" @keydown.enter="goUsers" @keydown.space.prevent="goUsers">
        <div class="stat-content">
          <div class="stat-header">
            <div class="header-left">
              <div class="icon-box blue"><n-icon><PeopleOutline /></n-icon></div>
              <span class="stat-label">注册用户</span>
            </div>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="60px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.totalUsers" />
            <span class="unit" v-if="!loading">人</span>
          </div>
          <div class="stat-footer text-blue">
            <span>管理用户权限</span>
            <n-icon><ArrowForwardOutline /></n-icon>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card cursor-pointer" role="button" tabindex="0" @click="goBlacklist" @keydown.enter="goBlacklist" @keydown.space.prevent="goBlacklist">
        <div class="stat-content">
          <div class="stat-header">
            <div class="header-left">
              <div class="icon-box red"><n-icon><ShieldCheckmarkOutline /></n-icon></div>
              <span class="stat-label">IP 黑名单</span>
            </div>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="50px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.blockedIps" />
            <span class="unit" v-if="!loading">个</span>
          </div>
          <div class="stat-footer text-red">
            <span>{{ stats.blockedIps > 0 ? '系统正在拦截' : '暂无拦截记录' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div class="section-title">快捷管理</div>
      <div class="actions-grid">
        <div class="glass-card action-card" role="button" tabindex="0" @click="goUsers" @keydown.enter="goUsers" @keydown.space.prevent="goUsers">
          <div class="action-icon purple"><n-icon><PeopleOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">用户管理</div>
            <div class="action-desc">管理注册用户与权限</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>

        <div class="glass-card action-card" role="button" tabindex="0" @click="goBlacklist" @keydown.enter="goBlacklist" @keydown.space.prevent="goBlacklist">
          <div class="action-icon red"><n-icon><ShieldCheckmarkOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">IP 黑名单</div>
            <div class="action-desc">管理恶意请求 IP</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>

        <div class="glass-card action-card" role="button" tabindex="0" @click="handleManualSync" @keydown.enter="handleManualSync" @keydown.space.prevent="handleManualSync">
          <div class="action-icon orange"><n-icon><RefreshOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">强制同步</div>
            <div class="action-desc">手动刷新缓存统计数据</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保持原有样式不变 */
.admin-page { display: flex; flex-direction: column; gap: 32px; padding-bottom: 60px; }
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 26px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px; }
.highlight { background: linear-gradient(120deg, #f586a9, #fca5c8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }

.main-purple { background: linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(254, 242, 247, 0.4)) !important; border-color: rgba(245, 134, 169, 0.3); }
.cursor-pointer { cursor: pointer; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
.stat-card {
  padding: 24px; position: relative;
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 160px;
}
.card-bg-icon { position: absolute; right: -20px; bottom: -30px; font-size: 120px; color: rgba(245, 134, 169, 0.06); transform: rotate(-15deg); pointer-events: none; }

.stat-header { display: flex; align-items: center; margin-bottom: 16px; }
.stat-header.space-between { justify-content: space-between; }
.header-left { display: flex; align-items: center; gap: 10px; }

.icon-box { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.icon-box.purple { background: rgba(245, 134, 169, 0.1); color: #f586a9; }
.icon-box.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.icon-box.red { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.icon-box.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.icon-box.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }

.stat-label { font-size: 14px; color: #6b7280; font-weight: 600; }
.stat-value { font-size: 32px; font-weight: 800; color: #1f2937; margin-bottom: 8px; font-family: 'Inter', sans-serif; letter-spacing: -0.5px; }
.stat-value .unit { font-size: 14px; font-weight: 600; color: #6b7280; margin-left: 4px; }

.text-green { color: #10b981; }
.text-blue { color: #3b82f6; }
.text-red { color: #f43f5e; }
.text-orange { color: #f97316; }

.stat-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: #6b7280; margin-top: auto; }

.sync-btn { color: #6b7280; transition: all 0.3s; }
.sync-btn:hover { color: #f97316; background: rgba(249, 115, 22, 0.1); }

.section-container { display: flex; flex-direction: column; gap: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #4b5563; padding-left: 4px; }
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }

.action-card { display: flex; align-items: center; gap: 16px; padding: 24px; cursor: pointer; }
.action-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; transition: transform 0.3s; }
.action-icon.purple { background: rgba(245, 134, 169, 0.1); color: #f586a9; }
.action-icon.red { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.action-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.action-icon.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }

.action-info { flex: 1; min-width: 0; }
.action-name { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 2px; }
.action-desc { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.action-arrow { color: #d1d5db; transition: all 0.3s; }
.action-card:hover .action-icon { transform: scale(1.1) rotate(5deg); }
.action-card:hover .action-arrow { color: #f586a9; transform: translateX(4px); }

@media (max-width: 640px) {
  .admin-page { gap: 24px; }
  .title { font-size: 22px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .actions-grid { grid-template-columns: 1fr; }
}
</style>
