<script setup lang="ts">
import type {
  PointsCallRequestCardProps,
} from '@/composables/usePointsCallRequestCardModel'

import {
  FlashOutline,
  ReceiptOutline,
  RefreshOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NDivider,
  NIcon,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
  NTag,
  NTooltip,
} from 'naive-ui'
import {
  POINTS_CALL_R18_OPTIONS,
  POINTS_CALL_SIZE_OPTIONS,
} from '@/composables/usePointsCallDefaults'
import { usePointsCallRequestCardModel } from '@/composables/usePointsCallRequestCardModel'

const props = defineProps<PointsCallRequestCardProps>()

const emit = defineEmits<{
  'call': [event: MouseEvent]
  'logs': []
  'refresh': []
  'update:excludeAi': [value: boolean]
  'update:keyword': [value: string]
  'update:num': [value: number]
  'update:r18': [value: PointsCallRequestCardProps['r18']]
  'update:size': [value: PointsCallRequestCardProps['size']]
  'update:tagText': [value: string]
}>()

const {
  excludeAIValue,
  keywordValue,
  numValue,
  r18Value,
  sizeValue,
  tagTextValue,
} = usePointsCallRequestCardModel(props, emit)
</script>

<template>
  <NCard class="glass-card ui-card side-card" :bordered="false">
    <div class="side-header">
      <div class="side-title">
        当前积分
        <NTag size="small" round :bordered="false" :type="isAdmin ? 'success' : 'info'" class="points-tag">
          <span v-if="isAdmin" class="points-number infinity">∞</span>
          <span v-else-if="!pointsLoading" class="points-number">{{ points }}</span>
          <span v-else>...</span>
        </NTag>
        <NTag v-if="isAdmin" size="tiny" round type="warning" style="margin-left: 8px;">
          管理员
        </NTag>
      </div>

      <div class="side-header-actions">
        <NButton size="small" secondary @click="emit('refresh')">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
        <NButton size="small" secondary @click="emit('logs')">
          <template #icon>
            <NIcon><ReceiptOutline /></NIcon>
          </template>
          流水
        </NButton>
      </div>
    </div>

    <NTag
      v-if="!isAdmin && !pointsLoading && !canCall"
      type="warning"
      round
      :bordered="false"
      style="margin-bottom: 10px;"
    >
      积分不足：至少需要 {{ costPerCall }} 才能调用
    </NTag>

    <div class="form">
      <div class="form-row">
        <div class="label">
          R18
        </div>
        <NSelect v-model:value="r18Value" :options="POINTS_CALL_R18_OPTIONS" />
      </div>

      <div class="form-row">
        <div class="label">
          返回数量
        </div>
        <NInputNumber v-model:value="numValue" :min="1" :max="10" />
      </div>

      <div class="form-row">
        <div class="label">
          关键词
        </div>
        <NInput v-model:value="keywordValue" placeholder="可选：keyword" />
      </div>

      <div class="form-row">
        <div class="label">
          标签（逗号分隔）
          <NTooltip trigger="hover">
            <template #trigger>
              <NIcon size="16" style="margin-left: 6px; opacity: .7;">
                <SearchOutline />
              </NIcon>
            </template>
            例如：萝莉,白丝,金发
          </NTooltip>
        </div>
        <NInput v-model:value="tagTextValue" placeholder="tag1,tag2,tag3" />
      </div>

      <div class="form-row">
        <div class="label">
          尺寸 size
        </div>
        <NSelect v-model:value="sizeValue" :options="POINTS_CALL_SIZE_OPTIONS" />
      </div>

      <div class="form-row switch-row">
        <div class="label">
          排除 AI
        </div>
        <NSwitch v-model:value="excludeAIValue" />
      </div>

      <NDivider />

      <div class="magnetic-button-wrapper">
        <NButton
          type="primary"
          color="#f586a9"
          :loading="calling"
          :disabled="!canCall"
          class="call-button"
          block
          @click="event => emit('call', event)"
        >
          <template #icon>
            <NIcon><FlashOutline /></NIcon>
          </template>
          立即调用（消耗 {{ costPerCall }} 积分）
        </NButton>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.glass-card {
  border-radius: var(--ui-radius-xl) !important;
}

.side-card {
  position: sticky;
  top: 20px;
}

.side-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ui-border-subtle);
}

.side-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--ui-text);
  display: flex;
  gap: 12px;
  align-items: center;
}

.side-header-actions {
  display: flex;
  gap: 10px;
}

.points-tag {
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.15), rgba(252, 165, 200, 0.15)) !important;
  border: 1px solid rgba(245, 134, 169, 0.3) !important;
  padding: 6px 14px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 8px rgba(245, 134, 169, 0.2);
  transition: all 0.3s ease;
}

.points-number {
  background: linear-gradient(135deg, #f586a9, #ff69b4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 18px;
  font-weight: 900;
  display: inline-block;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

.points-number.infinity {
  font-size: 22px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: #475569;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.switch-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(245, 134, 169, 0.08);
  border: 1px solid rgba(245, 134, 169, 0.12);
  border-radius: 12px;
}

.magnetic-button-wrapper {
  position: relative;
  padding: 4px;
}

.call-button {
  position: relative;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-weight: 700;
  font-size: 15px;
  height: 48px !important;
  border-radius: 12px !important;
  overflow: visible !important;
}

.call-button:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 8px 32px rgba(245, 134, 169, 0.4),
              0 0 0 4px rgba(245, 134, 169, 0.1);
}

.call-button:not(:disabled):active {
  transform: scale(0.98);
}

@media (max-width: 640px) {
  .side-card {
    position: static;
  }
}
</style>
