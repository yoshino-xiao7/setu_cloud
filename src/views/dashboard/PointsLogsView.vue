<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { NCard, NTag, NButton, NIcon, NPagination, NSkeleton, useMessage, NEmpty } from 'naive-ui'
import { RefreshOutline, ReceiptOutline, FlashOutline } from '@vicons/ionicons5'
import { getPointsLogs } from '@/api/points'

const message = useMessage()

const unwrap = (res: any) => {
  const d = res?.data
  if (!d) return d
  if (d && d.data !== undefined) return d.data
  return d
}

const loading = ref(false)
const list = ref<any[]>([])
const pager = reactive({ page: 1, size: 10, total: 0 })

const fetchLogs = async () => {
  loading.value = true
  try {
    const res: any = await getPointsLogs({ page: pager.page, size: pager.size })
    const data = unwrap(res) || {}
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

onMounted(fetchLogs)
</script>

<template>
  <div class="page-container">
    <div class="header-section">
      <h2 class="title">积分流水</h2>
      <p class="subtitle">记录你的积分变动（登录赠送、调用扣费、退款等）</p>
    </div>

    <n-card class="glass-card" :bordered="false" style="border-radius:16px;">
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
        <div v-for="it in list" :key="it.id" class="log-card glass-item">
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
            <div class="delta" :class="{ pos: Number(it.delta) >= 0, neg: Number(it.delta) < 0 }">
              {{ fmtDelta(it.delta) }}
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
  padding: 40px 20px 80px;
  max-width: 1100px;
  margin: 0 auto;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.header-section { text-align: center; }
.title { font-size: 32px; font-weight: 800; color: #1f2937; margin: 0; }
.subtitle { color: #6b7280; margin-top: 8px; font-size: 15px; }

.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 8px 30px rgba(0,0,0,0.04);
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
  color:#374151;
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
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.04);
  border-radius: 16px;
}

.log-card{ padding: 14px 16px; }
.row{ display:flex; justify-content:space-between; align-items:center; gap:14px; }
.time{ font-weight:800; color:#111827; }
.meta{ margin-top:6px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.endpoint{ color:#6b7280; font-size:13px; }

.delta{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 18px;
  font-weight: 900;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(0,0,0,0.04);
}
.delta.pos{ color:#16a34a; }
.delta.neg{ color:#ef4444; }

.pager{ display:flex; justify-content:center; margin-top:16px; }

@media (max-width: 640px){
  .page-container{ padding: 20px 10px; }
  .title{ font-size:24px; }
}
</style>
