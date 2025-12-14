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
  PulseOutline
} from '@vicons/ionicons5'
import { fetchAdminBlogStats, type AdminBlogStats } from '@/api/admin'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const stats = ref<AdminBlogStats | null>(null)

// 2. 获取管理员显示名称
const adminName = computed(() => {
  const user = auth.user as any
  return user?.nickname || user?.email?.split('@')[0] || 'Administrator'
})

// 3. 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

// 4. 加载统计数据
const loadStats = async () => {
  loading.value = true
  try {
    const res = await fetchAdminBlogStats()
    // 这里 admin 接口通常比较规范，可能有 data
    stats.value = (res as any).data || res
  } catch (e) {
    console.error('加载统计失败', e)
  } finally {
    loading.value = false
  }
}

// ✅ 5. 修复报错的核心函数
const refreshUserInfo = async () => {
  try {
    const res = await getUserInfo()

    // 🔥 强制把 res 当作 any 类型处理，解决 TS 报错
    // 并且兼容 "res是数据本身" 和 "res.data是数据" 两种情况
    const userData = (res as any).data || res

    if (auth.user) {
      Object.assign(auth.user, userData)
    } else {
      auth.user = userData
    }
  } catch (e) {
    console.warn('获取管理员信息失败', e)
  }
}

// 格式化时间
const formatTime = (timeStr?: string) => {
  if (!timeStr) return '暂无数据'
  return new Date(timeStr).toLocaleString()
}

const goUsers = () => router.push('/admin/users')
const goBlacklist = () => router.push('/admin/blacklist')

onMounted(() => {
  loadStats()
  refreshUserInfo()
})
</script>

<template>
  <div class="admin-page">

    <div class="page-header">
      <h2 class="title">
        {{ greeting }}，<span class="highlight">{{ adminName }}</span>
      </h2>
      <p class="subtitle">系统各项服务正在平稳运行中，随时准备为您效劳。</p>
    </div>

    <div class="stats-grid">
      <div class="glass-card stat-card main-stat">
        <div class="card-bg-icon"><n-icon><BarChartOutline /></n-icon></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="icon-box purple"><n-icon><ServerOutline /></n-icon></div>
            <span class="stat-label">博客 API 总调用</span>
          </div>
          <div class="stat-value">
            <n-skeleton v-if="loading" width="100px" height="36px" round />
            <n-number-animation v-else ref="numberAnimation" :from="0" :to="stats?.totalCalls || 0" :duration="1500"/>
          </div>
          <div class="stat-footer">
            <n-icon><TimeOutline /></n-icon>
            <span>上次更新: {{ loading ? '...' : formatTime(stats?.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-content">
          <div class="stat-header">
            <div class="icon-box green"><n-icon><PulseOutline /></n-icon></div>
            <span class="stat-label">系统健康度</span>
          </div>
          <div class="stat-value text-green">正常运行</div>
          <div class="stat-footer">所有节点在线，负载良好</div>
        </div>
        <div class="status-pulse">
          <div class="pulse-ring"></div>
          <div class="pulse-dot"></div>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div class="section-title">快捷管理</div>
      <div class="actions-grid">
        <div class="glass-card action-card" @click="goUsers">
          <div class="action-icon purple"><n-icon><PeopleOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">用户管理</div>
            <div class="action-desc">查看列表、搜索用户或封禁账号</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>
        <div class="glass-card action-card" @click="goBlacklist">
          <div class="action-icon red"><n-icon><ShieldCheckmarkOutline /></n-icon></div>
          <div class="action-info">
            <div class="action-name">IP 黑名单</div>
            <div class="action-desc">管理被拦截的恶意 IP 地址</div>
          </div>
          <div class="action-arrow"><n-icon><ArrowForwardOutline /></n-icon></div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 样式部分保持不变 */
.admin-page { display: flex; flex-direction: column; gap: 32px; padding-bottom: 60px; }
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 26px; font-weight: 700; color: #1f2937; letter-spacing: -0.5px; }
.highlight { background: linear-gradient(120deg, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
.glass-card { background: rgba(255, 255, 255, 0.65) !important; backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 20px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
.glass-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(139, 92, 246, 0.1); background: rgba(255, 255, 255, 0.8) !important; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.stat-card { position: relative; padding: 24px; display: flex; flex-direction: column; justify-content: center; min-height: 160px; }
.main-stat { background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(243, 232, 255, 0.5)) !important; border-color: rgba(139, 92, 246, 0.2); }
.card-bg-icon { position: absolute; right: -20px; bottom: -30px; font-size: 140px; color: rgba(139, 92, 246, 0.05); transform: rotate(-15deg); pointer-events: none; }
.stat-content { position: relative; z-index: 1; width: 100%; }
.stat-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.icon-box { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.icon-box.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.icon-box.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.stat-label { font-size: 14px; color: #6b7280; font-weight: 600; }
.stat-value { font-size: 36px; font-weight: 800; color: #1f2937; font-family: 'Inter', sans-serif; letter-spacing: -1px; margin-bottom: 12px; }
.text-green { color: #10b981; font-size: 24px; letter-spacing: 0; }
.stat-footer { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #9ca3af; }
.status-pulse { position: absolute; top: 24px; right: 24px; display: flex; align-items: center; justify-content: center; }
.pulse-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; z-index: 2; }
.pulse-ring { position: absolute; width: 24px; height: 24px; background: rgba(16, 185, 129, 0.2); border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
.section-container { display: flex; flex-direction: column; gap: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #4b5563; padding-left: 4px; }
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.action-card { display: flex; align-items: center; gap: 16px; padding: 20px; cursor: pointer; }
.action-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; transition: transform 0.3s; }
.action-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.action-icon.red { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.action-info { flex: 1; min-width: 0; }
.action-name { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
.action-desc { font-size: 13px; color: #6b7280; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.action-arrow { color: #d1d5db; transition: all 0.3s; }
.action-card:hover .action-icon { transform: scale(1.1) rotate(5deg); }
.action-card:hover .action-arrow { color: #8b5cf6; transform: translateX(4px); }
@media (max-width: 640px) {
  .admin-page { gap: 24px; }
  .title { font-size: 22px; }
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card { padding: 20px; min-height: 140px; }
  .stat-value { font-size: 32px; }
  .actions-grid { grid-template-columns: 1fr; }
  .action-desc { white-space: normal; }
}
</style>