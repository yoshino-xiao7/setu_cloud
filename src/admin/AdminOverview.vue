<script setup lang="ts">
import {
  ArrowForwardOutline,
  ImagesOutline,
  PeopleOutline,
  RefreshOutline,
  ServerOutline,
  ShieldCheckmarkOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import { NButton, NIcon, NNumberAnimation, NSkeleton, NTooltip, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
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
  <div class="admin-page">
    <div class="page-header">
      <h2 class="title">
        {{ greeting }}，<span class="highlight">{{ adminName }}</span>
      </h2>
      <p class="subtitle">
        系统各项服务正在平稳运行中，数据已实时同步。
      </p>
    </div>

    <div class="stats-grid">
      <div class="glass-card stat-card main-purple">
        <div class="card-bg-icon">
          <NIcon><ServerOutline /></NIcon>
        </div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="header-left">
              <div class="icon-box purple">
                <NIcon><ServerOutline /></NIcon>
              </div>
              <span class="stat-label">API 总调用</span>
            </div>
          </div>
          <div class="stat-value">
            <NSkeleton v-if="loading" width="100px" height="36px" round />
            <NNumberAnimation v-else :from="0" :to="stats.totalCalls" show-separator />
          </div>
          <div class="stat-footer">
            <NIcon><TimeOutline /></NIcon>
            <span>上次更新: {{ loading ? '...' : formatTimeDisplay(stats.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-content">
          <div class="stat-header space-between">
            <div class="header-left">
              <div class="icon-box orange">
                <NIcon><ImagesOutline /></NIcon>
              </div>
              <span class="stat-label">图库收录</span>
            </div>
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  quaternary circle size="small"
                  class="sync-btn"
                  :loading="syncing"
                  @click.stop="handleManualSync"
                >
                  <template #icon>
                    <NIcon><RefreshOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              手动从数据库同步最新统计
            </NTooltip>
          </div>
          <div class="stat-value">
            <NSkeleton v-if="loading" width="80px" height="36px" round />
            <NNumberAnimation v-else :from="0" :to="stats.totalImages" show-separator />
            <span v-if="!loading" class="unit">张</span>
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
              <div class="icon-box blue">
                <NIcon><PeopleOutline /></NIcon>
              </div>
              <span class="stat-label">注册用户</span>
            </div>
          </div>
          <div class="stat-value">
            <NSkeleton v-if="loading" width="60px" height="36px" round />
            <NNumberAnimation v-else :from="0" :to="stats.totalUsers" />
            <span v-if="!loading" class="unit">人</span>
          </div>
          <div class="stat-footer text-blue">
            <span>管理用户权限</span>
            <NIcon><ArrowForwardOutline /></NIcon>
          </div>
        </div>
      </div>

      <div class="glass-card stat-card cursor-pointer" role="button" tabindex="0" @click="goBlacklist" @keydown.enter="goBlacklist" @keydown.space.prevent="goBlacklist">
        <div class="stat-content">
          <div class="stat-header">
            <div class="header-left">
              <div class="icon-box red">
                <NIcon><ShieldCheckmarkOutline /></NIcon>
              </div>
              <span class="stat-label">IP 黑名单</span>
            </div>
          </div>
          <div class="stat-value">
            <NSkeleton v-if="loading" width="50px" height="36px" round />
            <NNumberAnimation v-else :from="0" :to="stats.blockedIps" />
            <span v-if="!loading" class="unit">个</span>
          </div>
          <div class="stat-footer text-red">
            <span>{{ stats.blockedIps > 0 ? '系统正在拦截' : '暂无拦截记录' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div class="section-title">
        快捷管理
      </div>
      <div class="actions-grid">
        <div class="glass-card action-card" role="button" tabindex="0" @click="goUsers" @keydown.enter="goUsers" @keydown.space.prevent="goUsers">
          <div class="action-icon purple">
            <NIcon><PeopleOutline /></NIcon>
          </div>
          <div class="action-info">
            <div class="action-name">
              用户管理
            </div>
            <div class="action-desc">
              管理注册用户与权限
            </div>
          </div>
          <div class="action-arrow">
            <NIcon><ArrowForwardOutline /></NIcon>
          </div>
        </div>

        <div class="glass-card action-card" role="button" tabindex="0" @click="goBlacklist" @keydown.enter="goBlacklist" @keydown.space.prevent="goBlacklist">
          <div class="action-icon red">
            <NIcon><ShieldCheckmarkOutline /></NIcon>
          </div>
          <div class="action-info">
            <div class="action-name">
              IP 黑名单
            </div>
            <div class="action-desc">
              管理恶意请求 IP
            </div>
          </div>
          <div class="action-arrow">
            <NIcon><ArrowForwardOutline /></NIcon>
          </div>
        </div>

        <div class="glass-card action-card" role="button" tabindex="0" @click="handleManualSync" @keydown.enter="handleManualSync" @keydown.space.prevent="handleManualSync">
          <div class="action-icon orange">
            <NIcon><RefreshOutline /></NIcon>
          </div>
          <div class="action-info">
            <div class="action-name">
              强制同步
            </div>
            <div class="action-desc">
              手动刷新缓存统计数据
            </div>
          </div>
          <div class="action-arrow">
            <NIcon><ArrowForwardOutline /></NIcon>
          </div>
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
