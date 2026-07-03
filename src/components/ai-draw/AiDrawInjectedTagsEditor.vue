<script setup lang="ts">
import {
  NButton,
  NInput,
  NModal,
  NTag,
} from 'naive-ui'
import { ref } from 'vue'

defineProps<{
  injectedTags: string[]
  negativePrompt: string
  positivePrompt: string
  shouldShow: boolean
  tagsPreview: string
}>()

const emit = defineEmits<{
  'update:negativePrompt': [value: string]
  'update:positivePrompt': [value: string]
}>()

const open = ref(false)
</script>

<template>
  <div v-if="shouldShow" class="field-hint injected-tags-hint injected-tags-section">
    <span class="injected-tags-label">将注入</span>
    <span class="injected-tags-preview">{{ tagsPreview }}</span>
    <NButton size="tiny" text type="primary" @click="open = true">
      查看/编辑
    </NButton>
  </div>

  <NModal
    v-model:show="open"
    preset="card"
    title="预设注入的提示词"
    :style="{ width: '720px', maxWidth: '94vw' }"
  >
    <div class="injected-tags-detail">
      <div v-if="injectedTags.length" class="tag-cloud">
        <NTag v-for="tag in injectedTags" :key="tag" size="small" round>
          {{ tag }}
        </NTag>
      </div>
      <span class="prompt-edit-label">正向提示词</span>
      <NInput
        :value="positivePrompt"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 8 }"
        @update:value="emit('update:positivePrompt', $event)"
      />
      <span class="prompt-edit-label">反向提示词</span>
      <NInput
        :value="negativePrompt"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 8 }"
        @update:value="emit('update:negativePrompt', $event)"
      />
    </div>
  </NModal>
</template>

<style scoped>
.field-hint {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.injected-tags-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  padding: 6px 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.82);
  overflow: hidden;
}

.injected-tags-label {
  flex: 0 0 auto;
  color: #475569;
  font-weight: 800;
}

.injected-tags-preview {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.injected-tags-hint :deep(.n-button) {
  flex: 0 0 auto;
}

.injected-tags-section {
  margin: 0 0 16px;
}

.injected-tags-detail {
  display: grid;
  gap: 12px;
}

.prompt-edit-label {
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.82);
}
</style>
