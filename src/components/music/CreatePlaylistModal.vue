<script setup lang="ts">
import type { CreatePlaylistDto } from '@/api/music'
import {
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSwitch,
} from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  form: CreatePlaylistDto
  show: boolean
}>()

const emit = defineEmits<{
  'cancel': []
  'submit': []
  'update:form': [value: CreatePlaylistDto]
  'update:show': [value: boolean]
}>()

const showValue = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

function updateForm(patch: Partial<CreatePlaylistDto>) {
  emit('update:form', {
    ...props.form,
    ...patch,
  })
}
</script>

<template>
  <NModal
    v-model:show="showValue"
    preset="dialog"
    title="创建新歌单"
    positive-text="创建"
    negative-text="取消"
    @positive-click="emit('submit')"
    @negative-click="emit('cancel')"
  >
    <NForm :model="form" label-placement="left" label-width="80px" class="create-playlist-form">
      <NFormItem label="歌单名称" required>
        <NInput
          :value="form.name"
          placeholder="输入歌单名称"
          maxlength="50"
          show-count
          @update:value="value => updateForm({ name: value })"
        />
      </NFormItem>

      <NFormItem label="描述">
        <NInput
          :value="form.description"
          type="textarea"
          placeholder="描述一下这个歌单..."
          maxlength="200"
          show-count
          :rows="3"
          @update:value="value => updateForm({ description: value })"
        />
      </NFormItem>

      <NFormItem label="封面URL">
        <NInput
          :value="form.coverUrl"
          placeholder="可选，留空将显示默认封面"
          @update:value="value => updateForm({ coverUrl: value })"
        />
      </NFormItem>

      <NFormItem label="公开">
        <NSwitch
          :value="form.isPublic"
          :checked-value="1"
          :unchecked-value="0"
          @update:value="value => updateForm({ isPublic: value })"
        >
          <template #checked>
            公开
          </template>
          <template #unchecked>
            私密
          </template>
        </NSwitch>
      </NFormItem>
    </NForm>
  </NModal>
</template>

<style scoped>
.create-playlist-form {
  margin-top: 20px;
}
</style>
