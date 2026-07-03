<script setup lang="ts">
defineProps<{
  costPerCall: number
  isAdmin: boolean
  points: number
  pointsLoading: boolean
  resultCount: number
}>()
</script>

<template>
  <div class="points-overview">
    <div class="overview-item ui-card">
      <div class="overview-label">
        当前积分
      </div>
      <div class="overview-value">
        <span v-if="isAdmin">∞</span>
        <span v-else-if="!pointsLoading">{{ points }}</span>
        <span v-else>...</span>
      </div>
    </div>
    <div class="overview-item ui-card">
      <div class="overview-label">
        单次消耗
      </div>
      <div class="overview-value small">
        {{ isAdmin ? '免扣费' : `${costPerCall} 积分` }}
      </div>
    </div>
    <div class="overview-item ui-card">
      <div class="overview-label">
        本次结果
      </div>
      <div class="overview-value small">
        {{ resultCount }} 张
      </div>
    </div>
  </div>
</template>

<style scoped>
.points-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.overview-item {
  padding: 18px 20px;
  min-height: 104px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.overview-label {
  color: var(--ui-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.overview-value {
  color: var(--ui-primary-hover);
  font-size: 32px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.overview-value.small {
  color: var(--ui-text);
  font-size: 24px;
}

@media (max-width: 980px) {
  .points-overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .points-overview {
    grid-template-columns: 1fr;
  }
}
</style>
