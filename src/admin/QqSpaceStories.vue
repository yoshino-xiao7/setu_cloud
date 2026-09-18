<!-- eslint-disable style/max-statements-per-line, no-alert -->
<script setup lang="ts">
import type { QqSpaceCharacter, QqSpaceStory } from '@/api/qqSpace'
import { NButton, NEmpty, NInput, NModal, NSelect, NSpin, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { createAdminQqChapter, createAdminQqStory, deleteAdminQqStory, fetchAdminQqCharacters, fetchAdminQqStories, fetchAdminQqStory, publishAdminQqStory, unpublishAdminQqStory, updateAdminQqChapter, updateAdminQqStory, uploadQqImage } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const message = useMessage(); const loading = ref(false); const stories = ref<QqSpaceStory[]>([]); const characters = ref<QqSpaceCharacter[]>([]); const modal = ref(false); const editing = ref<QqSpaceStory | null>(null); const form = ref({ title: '', subtitle: '', description: '', characterSlugs: [] as string[] }); const chapter = ref({ title: '', bodyMarkdown: '' }); const activeChapter = ref<number | null>(null); const uploading = ref(false)
async function load() {
  loading.value = true; try { const [s, c] = await Promise.all([fetchAdminQqStories({ pageSize: 50 }), fetchAdminQqCharacters()]); stories.value = unwrapApiData(s, []); characters.value = unwrapApiData(c, []) }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载故事失败')
  }
  finally { loading.value = false }
}
function openCreate() { editing.value = null; form.value = { title: '', subtitle: '', description: '', characterSlugs: [] }; chapter.value = { title: '', bodyMarkdown: '' }; activeChapter.value = null; modal.value = true }
async function edit(item: QqSpaceStory) {
  try { const detail = unwrapApiData(await fetchAdminQqStory(item.id), item); editing.value = detail; form.value = { title: detail.title, subtitle: detail.subtitle || '', description: detail.description || '', characterSlugs: detail.characters || [] }; activeChapter.value = detail.chapters?.[0]?.id || null; const first = detail.chapters?.[0]; chapter.value = first ? { title: first.title, bodyMarkdown: first.bodyMarkdown } : { title: '', bodyMarkdown: '' }; modal.value = true }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载故事详情失败')
  }
}
async function save() {
  try {
    const result = editing.value ? await updateAdminQqStory(editing.value.id, form.value) : await createAdminQqStory(form.value); const data = unwrapApiData(result, null); if (data) {
      stories.value = [data, ...stories.value.filter(item => item.id !== data.id)]; editing.value = data; if (!activeChapter.value)
        chapter.value = { title: '', bodyMarkdown: '' }
    }; message.success('故事信息已保存')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '保存故事失败')
  }
}
async function saveChapter() {
  if (!editing.value)
    return; try { const result = activeChapter.value ? await updateAdminQqChapter(editing.value.id, activeChapter.value, chapter.value) : await createAdminQqChapter(editing.value.id, chapter.value); const data = unwrapApiData(result, null); if (data) { activeChapter.value = data.id; editing.value.chapters = [...(editing.value.chapters || []).filter(item => item.id !== data.id), data].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) }; message.success('章节已保存') }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '保存章节失败')
  }
}
async function insertImage(event: Event) {
  if (!editing.value)
    return; const file = (event.target as HTMLInputElement).files?.[0]; (event.target as HTMLInputElement).value = ''; if (!file)
    return; uploading.value = true; try {
    const asset = unwrapApiData(await uploadQqImage(file, { ownerType: 'STORY', ownerId: editing.value.id, ownerSlug: editing.value.ownerSlug }), null); if (asset)
      chapter.value.bodyMarkdown += `\n\n![${file.name}](asset://${asset.id})\n\n`; message.success('图片已插入正文')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '上传插图失败')
  }
  finally { uploading.value = false }
}
async function toggle(item: QqSpaceStory) {
  try {
    if (item.status === 'PUBLISHED')
      await unpublishAdminQqStory(item.id); else await publishAdminQqStory(item.id); await load(); message.success('状态已更新')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '更新发布状态失败')
  }
}
async function remove(item: QqSpaceStory) {
  if (!window.confirm(`确定删除“${item.title}”吗？`))
    return; try { await deleteAdminQqStory(item.id); await load() }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '删除故事失败')
  }
}
onMounted(load)
</script>

<template>
  <div class="admin-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          故事管理
        </h1><p class="ui-page-subtitle">
          把每个故事维护成一本可翻阅的书。
        </p>
      </div><NButton type="primary" @click="openCreate">
        新建故事
      </NButton>
    </div><NSpin :show="loading">
      <div v-if="stories.length" class="story-list">
        <article v-for="item in stories" :key="item.id" class="story-row ui-card">
          <div class="story-cover">
            <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title"><span v-else>书</span>
          </div><div><h2>{{ item.title }}</h2><p>{{ item.subtitle || item.description || '暂无简介' }}</p><small>{{ item.chapterCount || 0 }} 章 · {{ item.status === 'PUBLISHED' ? '已发布' : '草稿' }}</small></div><div class="row-actions">
            <NButton size="small" secondary @click="edit(item)">
              编辑
            </NButton><NButton size="small" type="primary" @click="toggle(item)">
              {{ item.status === 'PUBLISHED' ? '撤回' : '发布' }}
            </NButton><NButton size="small" type="error" tertiary @click="remove(item)">
              删除
            </NButton>
          </div>
        </article>
      </div><NEmpty v-else description="还没有故事" />
    </NSpin><NModal v-model:show="modal" preset="card" title="故事编辑" style="max-width: 860px">
      <div class="modal-form">
        <NInput v-model:value="form.title" placeholder="书名" /><NInput v-model:value="form.subtitle" placeholder="副标题" /><NInput v-model:value="form.description" type="textarea" placeholder="简介" /><NSelect v-model:value="form.characterSlugs" multiple :options="characters.map(item => ({ label: item.name, value: item.slug }))" placeholder="关联角色" /><NButton type="primary" @click="save">
          保存书籍信息
        </NButton><div v-if="editing" class="chapter-editor">
          <div class="chapter-head">
            <strong>章节正文</strong><label class="upload-button"><input type="file" accept="image/*" :disabled="uploading" @change="insertImage">插入图片</label>
          </div><NInput v-model:value="chapter.title" placeholder="章节标题" /><NInput v-model:value="chapter.bodyMarkdown" type="textarea" :autosize="{ minRows: 12, maxRows: 24 }" placeholder="支持 Markdown；插图会以 asset:// 形式插入。" /><NButton secondary @click="saveChapter">
            保存章节
          </NButton><div v-if="editing.chapters?.length" class="chapter-list">
            <button v-for="item in editing.chapters" :key="item.id" type="button" :class="{ active: item.id === activeChapter }" @click="activeChapter = item.id; chapter = { title: item.title, bodyMarkdown: item.bodyMarkdown }">
              {{ item.title }}
            </button>
          </div>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.admin-page { display: grid; gap: 20px; }.story-list { display: grid; gap: 14px; }.story-row { display: grid; grid-template-columns: 84px 1fr auto; align-items: center; gap: 16px; padding: 14px; }.story-cover { width: 84px; height: 100px; border-radius: 10px; overflow: hidden; background: linear-gradient(145deg, #ffe8f0, #eaf2ff); display: grid; place-items: center; color: var(--ui-primary); }.story-cover img { width: 100%; height: 100%; object-fit: cover; }.story-row h2 { margin: 0; font-size: 17px; }.story-row p { margin: 6px 0; color: var(--ui-text-muted); }.story-row small { color: var(--ui-primary); }.row-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }.modal-form { display: grid; gap: 14px; }.chapter-editor { display: grid; gap: 12px; padding-top: 12px; border-top: 1px solid var(--ui-border-subtle); }.chapter-head { display: flex; align-items: center; justify-content: space-between; }.upload-button { color: var(--ui-primary-hover); cursor: pointer; font-size: 13px; }.upload-button input { display: none; }.chapter-list { display: flex; flex-wrap: wrap; gap: 6px; }.chapter-list button { border: 0; border-radius: 6px; padding: 7px 10px; background: var(--ui-primary-soft); color: var(--ui-text-muted); cursor: pointer; }.chapter-list button.active { color: var(--ui-primary-hover); background: rgba(245,134,169,.26); }
@media (max-width: 680px) { .ui-page-header { align-items: flex-start; flex-direction: column; }.story-row { grid-template-columns: 70px 1fr; }.story-cover { width: 70px; height: 84px; }.row-actions { grid-column: 1 / -1; justify-content: flex-start; } }
</style>
