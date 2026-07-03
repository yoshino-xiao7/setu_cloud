<script setup lang="ts">
import type { PointsCallFavoriteCollection } from '@/composables/usePointsCallFavorites'

import { FolderOpenOutline } from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
  NModal,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  collections: PointsCallFavoriteCollection[]
  loading: boolean
  selectedId: number | null
  show: boolean
}>()

const emit = defineEmits<{
  'submit': []
  'update:selectedId': [value: number | null]
  'update:show': [value: boolean]
}>()

const selectedValue = computed({
  get: () => props.selectedId,
  set: value => emit('update:selectedId', value),
})

const showValue = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const collectionOptions = computed(() =>
  props.collections.map(collection => ({
    label: collection.isDefault ? `⭐ ${collection.name}` : collection.name,
    value: collection.id,
  })),
)
</script>

<template>
  <NModal v-model:show="showValue" preset="card" title="收藏到收藏夹" :style="{ width: '520px', maxWidth: '92vw' }">
    <NSpace vertical size="large">
      <NTag round :bordered="false" type="info">
        <NIcon style="margin-right:6px;">
          <FolderOpenOutline />
        </NIcon>
        选择一个收藏夹保存
      </NTag>

      <div class="form-row">
        <div class="label">
          收藏夹
        </div>
        <NSelect
          v-model:value="selectedValue"
          :options="collectionOptions"
          placeholder="请选择收藏夹"
        />
      </div>

      <div class="modal-actions">
        <NButton quaternary @click="showValue = false">
          取消
        </NButton>
        <NButton type="primary" color="#f586a9" :loading="loading" @click="emit('submit')">
          确认收藏
        </NButton>
      </div>
    </NSpace>
  </NModal>
</template>

<style scoped>
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
