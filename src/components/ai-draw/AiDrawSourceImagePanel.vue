<script setup lang="ts">
import { NButton, NInputNumber, NRadioButton, NRadioGroup } from 'naive-ui'
import {
  AI_DRAW_IMG2IMG_MAX_DENOISE,
  AI_DRAW_IMG2IMG_MIN_DENOISE,
  AI_DRAW_IMG2IMG_PRESETS,
  clampAiDrawImg2imgDenoise,
} from '@/composables/useAiDrawDefaults'
import { AI_DRAW_SOURCE_ACCEPT } from '@/composables/useAiDrawSourceImage'

defineProps<{
  compact?: boolean
  error: string
  fileName: string
  previewUrl: string
}>()

const emit = defineEmits<{
  clear: []
  selectFile: [file: File]
}>()

const denoise = defineModel<number>('denoise', { required: true })

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file)
    emit('selectFile', file)
  input.value = ''
}

function applyPreset(value: number) {
  denoise.value = clampAiDrawImg2imgDenoise(value)
}

function onDenoiseChange(value: number | null) {
  denoise.value = clampAiDrawImg2imgDenoise(value)
}
</script>

<template>
  <div class="source-panel">
    <div class="source-picker">
      <label class="source-upload">
        <input :accept="AI_DRAW_SOURCE_ACCEPT" type="file" @change="onFileChange">
        <span>{{ previewUrl ? '更换源图' : '选择源图' }}</span>
      </label>
      <NButton v-if="previewUrl" size="small" quaternary @click="emit('clear')">
        清除
      </NButton>
      <span v-if="fileName" class="source-name">{{ fileName }}</span>
    </div>

    <div v-if="previewUrl" class="source-preview">
      <img :src="previewUrl" alt="图生图源图预览">
    </div>
    <p v-else class="field-hint">
      {{ compact ? '上传一张图后整图重绘。源图不会写入草稿。' : '上传一张 PNG / JPG / WEBP，按当前画幅缩放后整图重绘。源图文件不会写入草稿。' }}
    </p>
    <p v-if="error" class="source-error">
      {{ error }}
    </p>

    <div class="denoise-field">
      <NRadioGroup :value="denoise" @update:value="applyPreset">
        <NRadioButton v-for="preset in AI_DRAW_IMG2IMG_PRESETS" :key="preset.value" :value="preset.value">
          {{ preset.label }}
        </NRadioButton>
      </NRadioGroup>
      <NInputNumber
        :value="denoise"
        :min="AI_DRAW_IMG2IMG_MIN_DENOISE"
        :max="AI_DRAW_IMG2IMG_MAX_DENOISE"
        :step="0.05"
        :precision="2"
        @update:value="onDenoiseChange"
      />
    </div>
    <p class="field-hint">
      {{ compact ? '强度越低越接近原图。' : '改动强度越低越保住构图和配色，越高越跟提示词走。默认 0.45。' }}
    </p>
  </div>
</template>

<style scoped>
.source-panel {
  display: grid;
  gap: 10px;
}

.source-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.source-upload {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--n-border-color, #d0d7de);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.source-upload input {
  display: none;
}

.source-name,
.field-hint {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.source-error {
  color: #d03050;
  font-size: 12px;
}

.source-preview {
  overflow: hidden;
  max-width: 280px;
  border-radius: 8px;
  background: #0f172a;
}

.source-preview img {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.denoise-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.denoise-field :deep(.n-input-number) {
  width: 120px;
}
</style>
