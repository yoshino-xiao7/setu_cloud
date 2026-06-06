<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { NCard, NTag, NButton, NIcon, NPagination, NSkeleton, useMessage, NEmpty, NTooltip } from 'naive-ui'
import { RefreshOutline, ReceiptOutline, FlashOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5'
import { getPointsLogs } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { useAuthStore } from '@/stores/auth'

const message = useMessage()
const auth = useAuthStore()

// ✅ 管理员检测
const isAdmin = computed(() => auth.user?.role === 1)

const loading = ref(false)
const list = ref<any[]>([])
const pager = reactive({ page: 1, size: 10, total: 0 })

const fetchLogs = async () => {
  loading.value = true
  try {
    const res: any = await getPointsLogs({ page: pager.page, size: pager.size })
    const data = unwrapApiData<{ total?: number; items?: any[] }>(res, {})
    pager.total = Number(data.total ?? 0)
    list.value = Array.isArray(data.items) ? data.items : []
  } catch (e) {
    message.error('获取流水失败（请确认 /points/logs）')
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  pager.page = p
  fetchLogs()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const fmtDelta = (v: any) => {
  const n = Number(v ?? 0)
  return n >= 0 ? `+${n}` : `${n}`
}

// ✅ 判断是否为管理员调用（不扣费）
const isAdminAction = (it: any) => {
  return it.bizType === 'ADMIN_CALL' || Number(it.delta) === 0
}

onMounted(fetchLogs)
</script>

<template>
  <div class="page-container ui-page">
    <div class="header-section ui-page-header">
      <div>
        <h2 class="title ui-page-title">积分流水</h2>
        <p class="subtitle ui-page-subtitle">
        记录你的积分变动（登录赠送、调用扣费、退款等）
        <n-tag v-if="isAdmin" size="small" round type="warning" style="margin-left: 8px;">
          <template #icon><n-icon><ShieldCheckmarkOutline /></n-icon></template>
          管理员无限积分
        </n-tag>
        </p>
      </div>
    </div>

    <n-card class="glass-card ui-card logs-panel" :bordered="false">
      <div class="topbar">
        <div class="top-left">
          <n-icon><ReceiptOutline /></n-icon>
          <span class="top-title">流水列表</span>
          <n-tag size="small" round :bordered="false" type="info">{{ pager.total }}</n-tag>
        </div>
        <n-button size="small" secondary @click="fetchLogs">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          刷新
        </n-button>
      </div>

      <div v-if="loading" class="skeleton-wrap">
        <n-skeleton v-for="i in 6" :key="i" height="92px" style="border-radius:16px;" />
      </div>

      <div v-else-if="!list.length" class="empty-box">
        <n-empty description="还没有流水记录">
          <template #icon><n-icon><FlashOutline /></n-icon></template>
        </n-empty>
      </div>

      <div v-else class="cards">
        <div v-for="it in list" :key="it.id" class="log-card glass-item ui-card">
          <div class="row">
            <div class="left">
              <div class="time">{{ it.createdAt || '-' }}</div>
              <div class="meta">
                <n-tag size="small" round :bordered="false" type="warning">
                  {{ it.bizType || it.reason || 'UNKNOWN' }}
                </n-tag>
                <span class="endpoint">{{ it.endpoint || '-' }}</span>
              </div>
            </div>
            <div class="delta-wrapper">
              <!-- ✅ 管理员不扣费的调用显示 ∞ -->
              <n-tooltip v-if="isAdminAction(it)" trigger="hover">
                <template #trigger>
                  <div class="delta admin-delta">∞</div>
                </template>
                管理员调用，不扣积分
              </n-tooltip>
              <div v-else class="delta" :class="{ pos: Number(it.delta) >= 0, neg: Number(it.delta) < 0 }">
                {{ fmtDelta(it.delta) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pager" v-if="pager.total > 0">
        <n-pagination
          v-model:page="pager.page"
          :item-count="pager.total"
          :page-size="pager.size"
          :on-update:page="changePage"
          size="large"
        />
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.page-container {
  padding-bottom: 80px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.header-section { text-align: left; }
.title { margin: 0; }
.subtitle { margin-top: 8px; }

.glass-card {
  border-radius: var(--ui-radius-lg) !important;
}

.logs-panel {
  overflow: hidden;
}

.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:14px;
}
.top-left{
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:800;
  color: var(--ui-text);
}
.top-title{ font-size: 16px; }

.skeleton-wrap{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.empty-box{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height: 260px;
}

.cards{ display:flex; flex-direction:column; gap:12px; }

.glass-item{
  border-radius: 14px;
  box-shadow: none;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.glass-item:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 134, 169, 0.22);
}

.log-card{ padding: 14px 16px; }
.row{ display:flex; justify-content:space-between; align-items:center; gap:14px; }
.time{ font-weight:800; color: var(--ui-text); }
.meta{ margin-top:6px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.endpoint{ color:#6b7280; font-size:13px; }

.delta{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 18px;
  font-weight: 900;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.68);
  border: 1px solid rgba(255,255,255,0.8);
}
.delta.pos{ color:#16a34a; }
.delta.neg{ color:#ef4444; }

/* ✅ 管理员无限积分样式 */
.delta-wrapper {
  display: flex;
  align-items: center;
}

.delta.admin-delta {
  color: #f59e0b;
  font-size: 22px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.pager{ display:flex; justify-content:center; margin-top:16px; }

@media (max-width: 640px){
  .row {
    align-items: flex-start;
    flex-direction: column;
  }

  .delta-wrapper {
    align-self: stretch;
    justify-content: flex-end;
  }
}
</style>
