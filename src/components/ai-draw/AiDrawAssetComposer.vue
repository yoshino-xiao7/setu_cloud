<script setup lang="ts">
import type { AssetOption } from '@/composables/useAiAssets'
import { NButton, NInputNumber } from 'naive-ui'
import { getAiDrawAssetCompactSummary } from '@/composables/useAiDrawDefaults'

type AssetTarget = 'primary' | 'secondary'

withDefaults(defineProps<{
  characterAsset: AssetOption | null
  characterId: string
  loraAsset: AssetOption | null
  loraName: string
  loraStrength?: number
  selectedStylePresetNames?: string
  selectedStylePresetSummary?: string
  target?: AssetTarget
}>(), {
  loraStrength: undefined,
  selectedStylePresetNames: '',
  selectedStylePresetSummary: '',
  target: 'primary',
})

const emit = defineEmits<{
  clearCharacter: [target: AssetTarget]
  clearLora: [target: AssetTarget]
  openAsset: [tab: 'lora' | 'character' | 'style', target: AssetTarget]
  openCharacter: [target: AssetTarget, tab?: 'character' | 'style']
  openLora: [target: AssetTarget]
  updateLoraStrength: [value: number | null]
}>()

const assetCompactSummary = getAiDrawAssetCompactSummary
</script>

<template>
  <div class="asset-composer">
    <button
      class="asset-composer-main"
      type="button"
      @click="emit('openAsset', target === 'primary' ? 'lora' : 'character', target)"
    >
      <span class="asset-preview">
        <img v-if="characterAsset?.previewImage" :src="characterAsset.previewImage" :alt="characterAsset.displayName">
        <span v-else>{{ target === 'primary' ? '资产' : '角色B' }}</span>
      </span>
      <span>
        <small>{{ target === 'primary' ? '主角色 / LoRA / 风格' : '角色 B / LoRA B' }}</small>
        <strong>{{ characterAsset?.displayName || (target === 'primary' ? '未选择角色预设' : '未选择角色 B') }}</strong>
        <em v-if="target === 'primary'">{{ loraAsset?.displayName || '不使用 LoRA' }} · {{ selectedStylePresetNames }}</em>
        <em v-else>{{ loraAsset?.displayName || '不使用 LoRA B' }}</em>
      </span>
    </button>

    <div class="asset-composer-grid" :class="{ 'two-columns': target === 'secondary' }">
      <button class="asset-composer-card" type="button" @click="emit('openCharacter', target)">
        <small>{{ target === 'primary' ? '角色预设' : '角色 B 预设' }}</small>
        <strong>{{ characterAsset?.displayName || (target === 'primary' ? '不使用角色' : '不使用角色 B') }}</strong>
        <em>{{ assetCompactSummary(characterAsset, target === 'primary' ? '可注入角色 tags' : '用于双角色构图的角色 B') }}</em>
      </button>
      <button class="asset-composer-card" type="button" @click="emit('openLora', target)">
        <small>{{ target === 'primary' ? 'LoRA' : 'LoRA B' }}</small>
        <strong>{{ loraAsset?.displayName || (target === 'primary' ? '不使用 LoRA' : '不使用 LoRA B') }}</strong>
        <em>{{ assetCompactSummary(loraAsset, target === 'primary' ? '当前不会加载 LoRA' : '选择角色 B 后通常会自动填入') }}</em>
      </button>
      <button
        v-if="target === 'primary'"
        class="asset-composer-card"
        type="button"
        @click="emit('openCharacter', 'primary', 'style')"
      >
        <small>风格预设</small>
        <strong>{{ selectedStylePresetNames }}</strong>
        <em>{{ selectedStylePresetSummary }}</em>
      </button>
    </div>

    <div class="asset-actions asset-composer-actions">
      <NButton
        size="small"
        type="primary"
        secondary
        @click="emit('openAsset', target === 'primary' ? 'lora' : 'character', target)"
      >
        {{ target === 'primary' ? '配置资产组合' : '配置角色 B 资产' }}
      </NButton>
      <NButton size="small" quaternary :disabled="!characterId" @click="emit('clearCharacter', target)">
        {{ target === 'primary' ? '清空角色' : '清空角色 B' }}
      </NButton>
      <NButton size="small" quaternary :disabled="!loraName" @click="emit('clearLora', target)">
        {{ target === 'primary' ? '清空 LoRA' : '清空 LoRA B' }}
      </NButton>
    </div>

    <NInputNumber
      v-if="target === 'secondary'"
      :value="loraStrength"
      :min="0"
      :max="2"
      :step="0.05"
      :disabled="!loraName"
      @update:value="emit('updateLoraStrength', $event)"
    />
  </div>
</template>

<style scoped>
.asset-composer {
  display: grid;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.asset-composer-main,
.asset-composer-card {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.asset-composer-main {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
}

.asset-composer-main:hover,
.asset-composer-card:hover {
  border-color: rgba(14, 165, 233, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.asset-composer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.asset-composer-grid.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.asset-composer-card {
  display: grid;
  align-content: start;
  gap: 5px;
  min-height: 118px;
  padding: 10px;
}

.asset-preview {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #f8fafc 52%, #fee2e2);
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-composer-main small,
.asset-composer-card small {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.asset-composer-main strong,
.asset-composer-card strong {
  min-width: 0;
  color: #263247;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.asset-composer-main em,
.asset-composer-card em {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-composer-actions {
  justify-content: flex-start;
}

@media (max-width: 640px) {
  .asset-composer-main,
  .asset-composer-grid,
  .asset-composer-grid.two-columns {
    grid-template-columns: 1fr;
  }

  .asset-preview {
    width: 58px;
    height: 58px;
  }

  .asset-actions :deep(.n-button) {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>
