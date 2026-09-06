<script setup lang="ts">
import type { PointsLogDTO, PointsLogPageDTO } from '@/api/points'
import { FlashOutline, ReceiptOutline, RefreshOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5'
import { NButton, NCard, NEmpty, NIcon, NPagination, NSkeleton, NTag, useMessage } from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { getPointsLogs } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
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
  <UiBoard class="page-container ui-page">
    <div class="board-header-section ui-page-header">
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

    <NCard class="board-surface ui-card logs-panel" :bordered="false">
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

      <UiRecordBoard v-else :items="list" :item-key="item => item.id">
        <template #default="{ item: it }">
          <UiRecordCard :headline="it.bizType || it.reason || 'UNKNOWN'" :supporting="formatDate(it.createdAt)" :fields="[{ name: '接口', value: it.endpoint || '-', numeric: false }]" :status="{ tone: isAdminAction(it) ? 'warning' : Number(it.delta) >= 0 ? 'success' : 'danger', text: isAdminAction(it) ? '∞ 管理员调用，不扣积分' : fmtDelta(it.delta) }" />
        </template>
      </UiRecordBoard>

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
  </UiBoard>
</template>

<style scoped>
.page-container {
  padding-bottom: 80px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.board-header-section { text-align: left; }
.title { margin: 0; }
.subtitle { margin-top: 8px; }

.board-surface {
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
  color: var(--board-text);
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
.endpoint{ color: var(--board-text-muted); font-size:13px; }

.delta{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 18px;
  font-weight: 900;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--board-surface);
  border: 1px solid rgba(255,255,255,0.8);
}

/* ✅ 管理员无限积分样式 */

.pager{ display:flex; justify-content:center; margin-top:16px; }

.board-surface { background: var(--board-surface); border: 1px solid var(--board-border); border-radius: var(--ui-radius-xl); }
.board-header-section { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.ui-card, .header { background: var(--board-surface); color: var(--board-text); }
</style>
