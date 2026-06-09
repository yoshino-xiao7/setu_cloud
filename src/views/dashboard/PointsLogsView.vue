<script setup lang="ts">
import type { PointsLogDTO, PointsLogPageDTO } from '@/api/points'
import { FlashOutline, ReceiptOutline, RefreshOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5'
import { NButton, NCard, NEmpty, NIcon, NPagination, NSkeleton, NTag, NTooltip, useMessage } from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { getPointsLogs } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateFormat'

const message = useMessage()
const auth = useAuthStore()

// ✅ 管理员检测
const isAdmin = computed(() => auth.user?.role === 1)

const loading = ref(false)
const list = ref<PointsLogDTO[]>([])
const pager = reactive({ page: 1, size: 10, total: 0 })

async function fetchLogs() {
  loading.value = true
  try {
    const res = await getPointsLogs({ page: pager.page, size: pager.size })
    const data = unwrapApiData<PointsLogPageDTO>(res, { page: 1, size: 20, total: 0, items: [] })
    pager.total = Number(data.total ?? 0)
    list.value = Array.isArray(data.items) ? data.items : []
  }
  catch {
    message.error('获取流水失败（请确认 /points/logs）')
  }
  finally {
    loading.value = false
  }
}

function changePage(p: number) {
  pager.page = p
  fetchLogs()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function fmtDelta(v: number | string) {
  const n = Number(v ?? 0)
  return n >= 0 ? `+${n}` : `${n}`
}

// ✅ 判断是否为管理员调用（不扣费）
function isAdminAction(it: PointsLogDTO) {
  return it.bizType === 'ADMIN_CALL' || Number(it.delta) === 0
}

onMounted(fetchLogs)
</script>

<template>
  <div class="page-container ui-page">
    <div class="header-section ui-page-header">
      <div>
        <h2 class="title ui-page-title">
          积分流水
        </h2>
        <p class="subtitle ui-page-subtitle">
          记录你的积分变动（登录赠送、调用扣费、退款等）
          <NTag v-if="isAdmin" size="small" round type="warning" style="margin-left: 8px;">
            <template #icon>
              <NIcon><ShieldCheckmarkOutline /></NIcon>
            </template>
            管理员无限积分
          </NTag>
        </p>
      </div>
    </div>

    <NCard class="glass-card ui-card logs-panel" :bordered="false">
      <div class="topbar">
        <div class="top-left">
          <NIcon><ReceiptOutline /></NIcon>
          <span class="top-title">流水列表</span>
          <NTag size="small" round :bordered="false" type="info">
            {{ pager.total }}
          </NTag>
        </div>
        <NButton size="small" secondary @click="fetchLogs">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
      </div>

      <div v-if="loading" class="skeleton-wrap">
        <NSkeleton v-for="i in 6" :key="i" height="92px" style="border-radius:16px;" />
      </div>

      <div v-else-if="!list.length" class="empty-box">
        <NEmpty description="还没有流水记录">
          <template #icon>
            <NIcon><FlashOutline /></NIcon>
          </template>
        </NEmpty>
      </div>

      <div v-else class="cards">
        <div v-for="it in list" :key="it.id" class="log-card glass-item ui-card">
          <div class="row">
            <div class="left">
              <div class="time">
                {{ formatDate(it.createdAt) }}
              </div>
              <div class="meta">
                <NTag size="small" round :bordered="false" type="warning">
                  {{ it.bizType || it.reason || 'UNKNOWN' }}
                </NTag>
                <span class="endpoint">{{ it.endpoint || '-' }}</span>
              </div>
            </div>
            <div class="delta-wrapper">
              <!-- ✅ 管理员不扣费的调用显示 ∞ -->
              <NTooltip v-if="isAdminAction(it)" trigger="hover">
                <template #trigger>
                  <div class="delta admin-delta">
                    ∞
                  </div>
                </template>
                管理员调用，不扣积分
              </NTooltip>
              <div v-else class="delta" :class="{ pos: Number(it.delta) >= 0, neg: Number(it.delta) < 0 }">
                {{ fmtDelta(it.delta) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="pager.total > 0" class="pager">
        <NPagination
          v-model:page="pager.page"
          :item-count="pager.total"
          :page-size="pager.size"
          :on-update:page="changePage"
          size="large"
        />
      </div>
    </NCard>
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
