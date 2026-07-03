<script setup lang="ts">
import {
  NButton,
  NInputNumber,
  NRadioButton,
  NRadioGroup,
  NTag,
} from 'naive-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'

type CharacterMaskRole = 'primary' | 'secondary'

defineProps<{
  brush: number
  canvasAspectRatio: string
  hasCompleteStrokes: boolean
  hasStrokes: boolean
  hint: string
  role: CharacterMaskRole
}>()

const emit = defineEmits<{
  'canvasReady': [canvas: HTMLCanvasElement | null]
  'clear': []
  'endPaint': [event: PointerEvent]
  'movePaint': [event: PointerEvent]
  'startPaint': [event: PointerEvent]
  'undo': []
  'update:brush': [value: number | null]
  'update:role': [value: CharacterMaskRole]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  emit('canvasReady', canvas.value)
})

onBeforeUnmount(() => {
  emit('canvasReady', null)
})
</script>

<template>
  <div class="character-mask-panel">
    <div class="mask-panel-head">
      <div>
        <strong>角色布局参考</strong>
        <span>{{ hint }}</span>
      </div>
      <NTag size="small" round :type="hasCompleteStrokes ? 'success' : (hasStrokes ? 'warning' : 'info')">
        {{ hasCompleteStrokes ? '布局参考启用' : (hasStrokes ? '区域未完整' : '普通双角色') }}
      </NTag>
    </div>
    <div class="mask-toolbar">
      <NRadioGroup :value="role" size="small" @update:value="emit('update:role', $event as CharacterMaskRole)">
        <NRadioButton value="primary">
          画角色 A
        </NRadioButton>
        <NRadioButton value="secondary">
          画角色 B
        </NRadioButton>
      </NRadioGroup>
      <NInputNumber
        :value="brush"
        size="small"
        :min="0.03"
        :max="0.16"
        :step="0.01"
        @update:value="emit('update:brush', $event)"
      />
      <NButton size="small" secondary :disabled="!hasStrokes" @click="emit('undo')">
        撤销一笔
      </NButton>
      <NButton size="small" quaternary :disabled="!hasStrokes" @click="emit('clear')">
        清空
      </NButton>
    </div>
    <div class="mask-canvas-wrap" :style="{ aspectRatio: canvasAspectRatio }">
      <canvas
        ref="canvas"
        class="character-mask-canvas"
        @pointerdown.prevent="emit('startPaint', $event)"
        @pointermove.prevent="emit('movePaint', $event)"
        @pointerup.prevent="emit('endPaint', $event)"
        @pointercancel.prevent="emit('endPaint', $event)"
        @pointerleave="emit('movePaint', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.character-mask-panel {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
}

.mask-panel-head,
.mask-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mask-panel-head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.mask-panel-head strong {
  color: #263247;
  font-size: 13px;
}

.mask-panel-head span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.mask-toolbar {
  justify-content: flex-start;
}

.mask-toolbar :deep(.n-input-number) {
  width: 92px;
}

.mask-canvas-wrap {
  position: relative;
  width: 100%;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  background:
    repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.1) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.1) 0 1px, transparent 1px 24px),
    #f8fafc;
}

.character-mask-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
</style>
