<!-- eslint-disable style/max-statements-per-line -->
<script setup lang="ts">
import type { QqSpaceCharacter } from '@/api/qqSpace'
import { NButton, NForm, NFormItem, NInput, NSelect, NSpin, useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { fetchAdminQqCharacters, updateAdminQqCharacter, uploadQqImage } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const message = useMessage(); const loading = ref(false); const saving = ref(false); const characters = ref<QqSpaceCharacter[]>([]); const selected = ref('yukiryou'); const form = ref<QqSpaceCharacter | null>(null)
const options = computed(() => characters.value.map(item => ({ label: `${item.name}（${item.slug}）`, value: item.slug })))
function select(slug: string) { selected.value = slug; form.value = characters.value.some(item => item.slug === slug) ? { ...characters.value.find(item => item.slug === slug)! } : null }
async function load() {
  loading.value = true; try {
    characters.value = unwrapApiData(await fetchAdminQqCharacters(), []); if (characters.value.length)
      select(selected.value)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载角色失败')
  }
  finally { loading.value = false }
}
async function upload(event: Event, key: 'avatarAssetId' | 'portraitAssetId') {
  const file = (event.target as HTMLInputElement).files?.[0]; (event.target as HTMLInputElement).value = ''; if (!file || !form.value)
    return; try {
    const result = unwrapApiData(await uploadQqImage(file, { ownerType: 'CHARACTER', ownerSlug: form.value.slug }), null); if (result)
      (form.value as QqSpaceCharacter & Record<string, unknown>)[key] = result.id; message.success('图片已上传，保存角色后生效')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '上传图片失败')
  }
}
async function save() {
  if (!form.value)
    return; saving.value = true; try { const result = unwrapApiData(await updateAdminQqCharacter(form.value.slug, form.value as QqSpaceCharacter & { avatarAssetId?: number, portraitAssetId?: number }), null); if (result) { form.value = result; characters.value = characters.value.map(item => item.slug === result.slug ? result : item) }; message.success('角色设定已保存') }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '保存角色失败')
  }
  finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <div class="admin-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          角色设定
        </h1><p class="ui-page-subtitle">
          维护雪涼与铃木铃奈的基础档案和形象资源。
        </p>
      </div><NSelect v-model:value="selected" :options="options" class="character-select" @update:value="select" />
    </div><NSpin :show="loading">
      <NForm v-if="form" class="editor-card ui-card" label-placement="top">
        <div class="media-row">
          <div><label>头像</label><img v-if="form.avatarUrl" :src="form.avatarUrl" class="avatar-preview"><input type="file" accept="image/*" @change="upload($event, 'avatarAssetId')"></div><div class="portrait-upload">
            <label>角色形象</label><img v-if="form.portraitUrl" :src="form.portraitUrl" class="portrait-preview"><input type="file" accept="image/*" @change="upload($event, 'portraitAssetId')">
          </div>
        </div><div class="form-grid">
          <NFormItem label="角色名称">
            <NInput v-model:value="form.name" />
          </NFormItem><NFormItem label="别名">
            <NInput v-model:value="form.aliases" placeholder="用逗号分隔" />
          </NFormItem><NFormItem label="主题色">
            <NInput v-model:value="form.themeColor" placeholder="#f586a9" />
          </NFormItem><NFormItem label="简介">
            <NInput v-model:value="form.intro" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
          </NFormItem><NFormItem label="性格">
            <NInput v-model:value="form.personality" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
          </NFormItem><NFormItem label="背景故事">
            <NInput v-model:value="form.background" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
          </NFormItem><NFormItem label="代表语句">
            <NInput v-model:value="form.quote" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
          </NFormItem>
        </div><NButton type="primary" :loading="saving" @click="save">
          保存角色设定
        </NButton>
      </NForm>
    </NSpin>
  </div>
</template>

<style scoped>
.admin-page { display: grid; gap: 20px; }.character-select { width: 220px; }.editor-card { padding: 24px; }.media-row { display: flex; gap: 28px; margin-bottom: 22px; }.media-row > div { display: grid; gap: 8px; color: var(--ui-text-muted); font-size: 13px; }.avatar-preview, .portrait-preview { width: 120px; height: 120px; object-fit: cover; border-radius: 16px; background: #f5f6fa; }.portrait-preview { width: 200px; height: 160px; }.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }.form-grid :deep(.n-form-item:last-child) { grid-column: 1 / -1; }
@media (max-width: 680px) { .ui-page-header { align-items: flex-start; flex-direction: column; }.character-select { width: 100%; }.media-row { flex-direction: column; }.form-grid { grid-template-columns: 1fr; } }
</style>
