<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NSpin, NNumberAnimation } from 'naive-ui'
import {
  BarChartOutline,
  TimeOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
  ArrowForwardOutline
} from '@vicons/ionicons5'
import { fetchAdminBlogStats, type AdminBlogStats } from '@/api/admin'

const router = useRouter()
const loading = ref(false)
const stats = ref<AdminBlogStats | null>(null)

// 加载数据
const loadStats = async () => {
  loading.value = true
  try {
    const res = await fetchAdminBlogStats()
    stats.value = res.data
  } catch (e) {
    console.error('加载统计失败', e)
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (timeStr?: string) => {
  if (!timeStr) return '暂无数据'
  return new Date(timeStr).toLocaleString()
}

// 快捷跳转
const goUsers = () => router.push('/admin/users')
const goBlacklist = () => router.push('/admin/blacklist')

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="admin-page">

    <div class="page-header">
      <h2 class="title">后台概览</h2>
      <p class="subtitle">欢迎回来，Administrator。系统正在平稳运行中。</p>
    </div>

    <div class="stats-grid">

      <div class="glass-card stat-card main-stat">
        <div class="card-icon-bg">
          <n-icon><BarChartOutline /></n-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">博客 API 总调用</div>
          <div class="stat-value">
            <n-spin v-if="loading" size="small" />
            <n-number-animation
              v-else
              ref="numberAnimation"
              :from="0"
              :to="stats?.totalCalls || 0"
            />
          </div>
          <div class="stat-footer">
            <n-icon><TimeOutline /></n-icon>
            <span>更新于: {{ formatTime(stats?.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-content">
          <div class="stat-label">系统状态</div>
          <div class="stat-value text-green">正常运行</div>
          <div class="stat-footer">
             所有服务节点在线
          </div>
        </div>
        <div class="pulse-circle"></div>
      </div>
    </div>

    <div class="section-title">快捷管理</div>
    <div class="actions-grid">

      <div class="glass-card action-card" @click="goUsers">
        <div class="action-icon purple">
          <n-icon><PeopleOutline /></n-icon>
        </div>
        <div class="action-info">
          <div class="action-name">用户管理</div>
          <div class="action-desc">查看、搜索用户或封禁违规账号</div>
        </div>
        <div class="action-arrow">
          <n-icon><ArrowForwardOutline /></n-icon>
        </div>
      </div>

      <div class="glass-card action-card" @click="goBlacklist">
        <div class="action-icon red">
          <n-icon><ShieldCheckmarkOutline /></n-icon>
        </div>
        <div class="action-info">
          <div class="action-name">IP 黑名单</div>
          <div class="action-desc">防御恶意攻击，管理被拦截的 IP</div>
        </div>
        <div class="action-arrow">
          <n-icon><ArrowForwardOutline /></n-icon>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.page-header { padding: 0 4px; }
.title { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; }
.subtitle { margin: 4px 0 0; font-size: 14px; color: #6b7280; }

/* 核心毛玻璃卡片基础样式 */
.glass-card {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

/* --- 统计卡片区域 --- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.stat-card {
  position: relative;
  padding: 24px;
  display: flex;
  align-items: center;
  min-height: 140px;
}

.main-stat {
  /* 加上一点紫色微光 */
  background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(237, 233, 254, 0.4)) !important;
  border-color: rgba(139, 92, 246, 0.3);
}

/* 背景大图标装饰 */
.card-icon-bg {
  position: absolute;
  right: -20px; bottom: -20px;
  font-size: 120px;
  color: rgba(139, 92, 246, 0.08);
  transform: rotate(-15deg);
  pointer-events: none;
}

.stat-content {
  position: relative;
  z-index: 1;
  display: flex; flex-direction: column; gap: 8px;
}

.stat-label { font-size: 14px; color: #6b7280; font-weight: 500; }

.stat-value {
  font-size: 36px; font-weight: 800; color: #1f2937;
  line-height: 1.1;
  font-family: 'Inter', sans-serif; /* 强调数字 */
}
.text-green { color: #10b981; font-size: 24px; }

.stat-footer {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #9ca3af;
  margin-top: 4px;
}

/* 呼吸灯效果 */
.pulse-circle {
  position: absolute;
  right: 24px; top: 24px;
  width: 12px; height: 12px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* --- 快捷入口区域 --- */
.section-title {
  font-size: 16px; font-weight: 600; color: #4b5563;
  margin-top: 10px; padding-left: 4px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.action-card {
  display: flex; align-items: center; gap: 16px;
  padding: 20px;
  cursor: pointer;
}

.action-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.action-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.action-icon.red { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }

.action-info { flex: 1; }
.action-name { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
.action-desc { font-size: 12px; color: #6b7280; line-height: 1.4; }

.action-arrow {
  color: #d1d5db; transition: transform 0.2s, color 0.2s;
}
.action-card:hover .action-arrow {
  color: #8b5cf6; transform: translateX(4px);
}
</style>