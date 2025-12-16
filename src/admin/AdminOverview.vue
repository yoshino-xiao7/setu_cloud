<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserInfo } from '@/api/user'
import { NIcon, NNumberAnimation, NSkeleton } from 'naive-ui'
import {
  BarChartOutline,
  TimeOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
  ArrowForwardOutline,
  ServerOutline,
  SpeedometerOutline,
  PulseOutline
} from '@vicons/ionicons5'

// ✅ 引入你刚才发给我的真实 API 定义
import {
  fetchAdminBlogStats,
  fetchAdminUserList,
  fetchIpBlacklist
} from '@/api/admin'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)

// 定义仪表盘数据
const stats = ref({
  totalCalls: 0,
  updatedAt: '',
  totalUsers: 0,    // 真实数据
  blockedIps: 0,    // 真实数据
  latency: 0        // 前端测速
})

// 管理员名称
const adminName = computed(() => {
  const user = auth.user as any
  return user?.nickname || user?.email?.split('@')[0] || 'Administrator'
})

// 问候语
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
  loading.value = true
  const start = performance.now() // ⏱️ 开始计时

  try {
    // 并行请求三个接口，速度最快
    const [statsRes, usersRes, blacklistRes] = await Promise.all([
      // 1. 获取博客统计 (调用量)
      fetchAdminBlogStats(),

      // 2. 获取用户列表 (我们要的是 total)
      // ⚠️ 注意：你的接口定义是 pageSize，不是 size
      fetchAdminUserList({ page: 1, pageSize: 1 }),

      // 3. 获取黑名单列表 (我们要的是数组长度)
      fetchIpBlacklist()
    ])

    // ⏱️ 计算延迟 (ms)
    const end = performance.now()
    stats.value.latency = Math.round(end - start)

    // --- 1. 处理调用量 ---
    const statsData = (statsRes as any).data || statsRes
    stats.value.totalCalls = statsData.totalCalls || 0
    stats.value.updatedAt = statsData.updatedAt

    // --- 2. 处理用户数 ---
    // 根据 AdminUserListResponse 定义，直接取 total
    const userData = (usersRes as any).data || usersRes
    stats.value.totalUsers = userData.total || 0

    // --- 3. 处理黑名单数 ---
    // 根据 fetchIpBlacklist 定义，返回的是 BlacklistIpItem[] 数组
    const blackList = (blacklistRes as any).data || blacklistRes
    if (Array.isArray(blackList)) {
      stats.value.blockedIps = blackList.length
    } else {
      stats.value.blockedIps = 0
    }

  } catch (e) {
    console.error('加载仪表盘数据失败', e)
  } finally {
    loading.value = false
  }
}

// 刷新用户信息 (头像/昵称)
const refreshUserInfo = async () => {
  try {
    const res = await getUserInfo()
    const userData = (res as any).data || res
    if (auth.user) Object.assign(auth.user, userData)
    else auth.user = userData
  } catch (e) { console.warn(e) }
}

const formatTime = (timeStr?: string) => timeStr ? new Date(timeStr).toLocaleString() : '统计中...'
const goUsers = () => router.push('/admin/users')
const goBlacklist = () => router.push('/admin/blacklist')
const goStatus = () => router.push('/admin/status')

onMounted(() => {
  loadDashboardData()
  refreshUserInfo()
})
</script>

<template>
  <div class="admin-page">

    <div class="page-header">
      <h2 class="title">
        {{ greeting }}，<span class="highlight">{{ adminName }}</span>
      </h2>
      <p class="subtitle">系统各项服务正在平稳运行中，数据已实时同步。</p>
    </div>

    <div class="stats-grid">

      <div class="glass-card stat-card main-purple">
        <div class="card-bg-icon"><n-icon><BarChartOutline /></n-icon></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="icon-box purple"><n-icon><ServerOutline /></n-icon></div>
            <span class="stat-label">API 总调用</span>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="100px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.totalCalls" show-separator />
          </div>
          <div class="stat-footer">
            <n-icon><TimeOutline /></n-icon>
            <span>更新于: {{ loading ? '...' : formatTime(stats.updatedAt).split(' ')[1] }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card" @click="goUsers">
        <div class="stat-content">
          <div class="stat-header">
            <div class="icon-box blue"><n-icon><PeopleOutline /></n-icon></div>
            <span class="stat-label">注册用户</span>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="60px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.totalUsers" />
          </div>
          <div class="stat-footer text-blue">
            <span>管理 {{ stats.totalUsers }} 位用户</span>
            <n-icon><ArrowForwardOutline /></n-icon>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card" @click="goBlacklist">
        <div class="stat-content">
          <div class="stat-header">
            <div class="icon-box red"><n-icon><ShieldCheckmarkOutline /></n-icon></div>
            <span class="stat-label">安全拦截 IP</span>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="50px" height="36px" round />
            <n-number-animation v-else :from="0" :to="stats.blockedIps" />
          </div>
          <div class="stat-footer text-red">
            <span>{{ stats.blockedIps > 0 ? '系统正在保护中' : '暂无拦截记录' }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card cursor-pointer" @click="goStatus">
        <div class="stat-content">
          <div class="stat-header">
            <div class="icon-box green"><n-icon><SpeedometerOutline /></n-icon></div>
            <span class="stat-label">当前延迟</span>
          </div>
          <div class="stat-value text-green">
            <n-skeleton v-if="loading" width="60px" height="36px" round />
            <span v-else>{{ stats.latency }}<span class="unit">ms</span></span>
          </div>
          <div class="stat-footer">
            <div class="status-indicator">
              <div class="pulse-dot"></div>
              <span>系统响应正常</span>
            </div>
          </div>
        </div>
        <div class="pulse-ring"></div>
      </div>
    </div>

    <div class="section-container">
      <div class="section-title">快捷管理</div>
      <div class="actions-grid">
        <div class="glass-card action-card" @click="goUsers">
          <div class="action-icon purple"><n-icon><PeopleOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">用户管理</div>
            <div class="action-desc">管理注册用户与权限</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>

        <div class="glass-card action-card" @click="goBlacklist">
          <div class="action-icon red"><n-icon><ShieldCheckmarkOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">IP 黑名单</div>
            <div class="action-desc">管理恶意请求 IP</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>

        <div class="glass-card action-card" @click="goStatus">
          <div class="action-icon green"><n-icon><PulseOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">实时监控</div>
            <div class="action-desc">查看 API QPS 波动图表</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 样式与之前保持一致 */
.admin-page { display: flex; flex-direction: column; gap: 32px; padding-bottom: 60px; }
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 26px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px; }
.highlight { background: linear-gradient(120deg, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }

.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden; cursor: default;
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(139, 92, 246, 0.1);
  background: rgba(255, 255, 255, 0.8) !important;
}
.main-purple { background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(243, 232, 255, 0.7)) !important; border-color: rgba(139, 92, 246, 0.2); }
.cursor-pointer { cursor: pointer; }

/* 4格网格 */
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
.card-bg-icon { position: absolute; right: -20px; bottom: -30px; font-size: 120px; color: rgba(139, 92, 246, 0.06); transform: rotate(-15deg); pointer-events: none; }

.stat-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.icon-box { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.icon-box.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.icon-box.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.icon-box.red { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.icon-box.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.stat-label { font-size: 14px; color: #6b7280; font-weight: 600; }
.stat-value { font-size: 32px; font-weight: 800; color: #1f2937; margin-bottom: 8px; font-family: 'Inter', sans-serif; letter-spacing: -0.5px; }
.stat-value .unit { font-size: 14px; font-weight: 600; color: #9ca3af; margin-left: 4px; }
.text-green { color: #10b981; }
.text-blue { color: #3b82f6; }
.text-red { color: #f43f5e; }

.stat-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: #9ca3af; margin-top: auto; }

.status-indicator { display: flex; align-items: center; gap: 6px; color: #10b981; font-weight: 600; }
.pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulse-green 2s infinite; }
.pulse-ring { position: absolute; top: 24px; right: 24px; width: 10px; height: 10px; border-radius: 50%; background: rgba(16, 185, 129, 0.5); animation: pulse-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0; }

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
@keyframes pulse-ping { 75%, 100% { transform: scale(2); opacity: 0; } }

/* 快捷操作 */
.section-container { display: flex; flex-direction: column; gap: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #4b5563; padding-left: 4px; }
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }

.action-card { display: flex; align-items: center; gap: 16px; padding: 24px; cursor: pointer; }
.action-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; transition: transform 0.3s; }
.action-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.action-icon.red { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.action-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.action-info { flex: 1; min-width: 0; }
.action-name { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 2px; }
.action-desc { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.action-arrow { color: #d1d5db; transition: all 0.3s; }
.action-card:hover .action-icon { transform: scale(1.1) rotate(5deg); }
.action-card:hover .action-arrow { color: #8b5cf6; transform: translateX(4px); }

@media (max-width: 640px) {
  .admin-page { gap: 24px; }
  .title { font-size: 22px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .actions-grid { grid-template-columns: 1fr; }
}
</style>