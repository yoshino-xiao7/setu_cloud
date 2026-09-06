<script setup lang="ts">
import {
  ImagesOutline,
  PeopleOutline,
  RefreshOutline,
  ServerOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import { NButton, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { UiBento, UiBentoTile, UiBoard } from '@/components/ui'
import { useAdminOverview } from '@/composables/useAdminOverview'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

const {
  adminName,
  formatTimeDisplay,
  greeting,
  handleManualSync,
  loading,
  stats,
  syncing,
} = useAdminOverview({
  auth,
  message,
})

const goUsers = () => safePush(router, '/admin/users')
const goBlacklist = () => safePush(router, '/admin/blacklist')
</script>

<template>
  <UiBoard class="admin-page">
    <div class="board-page-header">
      <h2 class="title">
        {{ greeting }}，<span class="highlight">{{ adminName }}</span>
      </h2>
      <p class="subtitle">
        系统各项服务正在平稳运行中，数据已实时同步。
      </p>
    </div>

    <UiBento :aria-busy="loading">
      <UiBentoTile title="API 总调用" :value="loading ? '加载中…' : String(stats.totalCalls)" :subtitle="`上次更新：${loading ? '…' : formatTimeDisplay(stats.updatedAt)}`" :icon="ServerOutline" span="wide" tone="brand" /><UiBentoTile title="图库收录" :value="loading ? '加载中…' : `${stats.totalImages} 张`" :subtitle="syncing ? '正在同步…' : '每日凌晨自动同步'" :icon="ImagesOutline">
        <NButton secondary size="small" :loading="syncing" @click="handleManualSync">
          同步统计
        </NButton>
      </UiBentoTile><UiBentoTile title="注册用户" :value="loading ? '加载中…' : `${stats.totalUsers} 人`" subtitle="管理用户权限" :icon="PeopleOutline" :action="goUsers" /><UiBentoTile title="AI 生图" :value="loading ? '加载中…' : `${stats.aiGenerationTotal} 张`" :subtitle="`今日 ${stats.aiGenerationToday} 张`" :icon="ImagesOutline" /><UiBentoTile title="IP 黑名单" :value="loading ? '加载中…' : `${stats.blockedIps} 个`" :subtitle="stats.blockedIps > 0 ? '系统正在拦截' : '暂无拦截记录'" :icon="ShieldCheckmarkOutline" :action="goBlacklist" />
    </UiBento>

    <div class="section-container">
      <div class="section-title">
        快捷管理
      </div>
      <UiBento><UiBentoTile title="用户管理" subtitle="管理注册用户与权限" :icon="PeopleOutline" :action="goUsers" /><UiBentoTile title="IP 黑名单" subtitle="管理恶意请求 IP" :icon="ShieldCheckmarkOutline" :action="goBlacklist" /><UiBentoTile title="强制同步" subtitle="手动刷新缓存统计数据" :icon="RefreshOutline" :action="handleManualSync" :disabled="syncing" /></UiBento>
    </div>
  </UiBoard>
</template>

<style scoped>
/* 保持原有样式不变 */
.admin-page { display: flex; flex-direction: column; gap: 32px; padding-bottom: 60px; }
.board-page-header { padding: 0 4px; }
.title { margin: 0; font-size: 26px; font-weight: 700; color: var(--board-text); letter-spacing: -0.5px; }
.highlight { background: linear-gradient(120deg, var(--ui-primary), #fca5c8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { margin: 8px 0 0; font-size: 14px; color: var(--board-text-muted); }

.section-container { display: flex; flex-direction: column; gap: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #4b5563; padding-left: 4px; }

@media (max-width: 640px) {
  .admin-page { gap: 24px; }
  .title { font-size: 22px; }
}

.board-page-header { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.header { background: var(--board-surface); color: var(--board-text); }
</style>
