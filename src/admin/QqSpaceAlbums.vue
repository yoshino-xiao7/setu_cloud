<!-- eslint-disable style/max-statements-per-line, no-alert -->
<script setup lang="ts">
import type { QqSpaceAlbum, QqSpaceCharacter } from '@/api/qqSpace'
import { NButton, NEmpty, NInput, NModal, NSelect, NSpin, useMessage } from 'naive-ui'
import * as tus from 'tus-js-client'
import { onMounted, ref } from 'vue'
import { addAdminQqAlbumItem, createAdminQqAlbum, createAdminQqVideoSession, deleteAdminQqAlbum, fetchAdminQqAlbums, fetchAdminQqCharacters, publishAdminQqAlbum, syncAdminQqVideo, unpublishAdminQqAlbum, uploadQqImage } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const message = useMessage(); const loading = ref(false); const albums = ref<QqSpaceAlbum[]>([]); const characters = ref<QqSpaceCharacter[]>([]); const modal = ref(false); const form = ref({ title: '', description: '', characterSlugs: [] as string[] }); const editing = ref<QqSpaceAlbum | null>(null); const uploading = ref(false)
async function load() {
  loading.value = true; try { const [a, c] = await Promise.all([fetchAdminQqAlbums({ pageSize: 50 }), fetchAdminQqCharacters()]); albums.value = unwrapApiData(a, []); characters.value = unwrapApiData(c, []) }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载相册失败')
  }
  finally { loading.value = false }
}
function openCreate() { editing.value = null; form.value = { title: '', description: '', characterSlugs: [] }; modal.value = true }
async function save() {
  try {
    const result = editing.value ? await import('@/api/qqSpace').then(api => api.updateAdminQqAlbum(editing.value!.id, form.value)) : await createAdminQqAlbum(form.value); const data = unwrapApiData(result, null); if (data)
      albums.value = [data, ...albums.value.filter(item => item.id !== data.id)]; modal.value = false; message.success('相册已保存')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '保存相册失败')
  }
}
function edit(item: QqSpaceAlbum) { editing.value = item; form.value = { title: item.title, description: item.description || '', characterSlugs: item.characters || [] }; modal.value = true }
async function uploadImages(album: QqSpaceAlbum, event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || []); (event.target as HTMLInputElement).value = ''; if (!files.length)
    return; uploading.value = true; try {
    for (const file of files) {
      const asset = unwrapApiData(await uploadQqImage(file, { ownerType: 'ALBUM', ownerId: album.id, ownerSlug: album.ownerSlug }), null); if (asset)
        await addAdminQqAlbumItem(album.id, { assetId: asset.id, caption: file.name.replace(/\.[^.]+$/, '') })
    }; message.success(`已上传 ${files.length} 项`); await load()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '上传相册媒体失败')
  }
  finally { uploading.value = false }
}
async function uploadVideo(album: QqSpaceAlbum, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]; (event.target as HTMLInputElement).value = ''; if (!file)
    return; uploading.value = true; try {
    const session = unwrapApiData(await createAdminQqVideoSession({ title: file.name.replace(/\.[^.]+$/, '') }, { ownerType: 'ALBUM', ownerId: album.id, ownerSlug: album.ownerSlug }), null); if (!session)
      return; await new Promise<void>((resolve, reject) => { const upload = new tus.Upload(file, { endpoint: session.tusEndpoint, chunkSize: 8 * 1024 * 1024, retryDelays: [0, 3000, 5000, 10000, 20000], headers: { AuthorizationSignature: session.authorizationSignature, AuthorizationExpire: String(session.authorizationExpire), LibraryId: String(session.libraryId), VideoId: session.bunnyVideoId }, metadata: { filename: file.name, filetype: file.type || 'video/mp4', title: file.name }, onError: reject, onSuccess: () => resolve() }); upload.start() }); let ready = false; for (let attempt = 0; attempt < 12; attempt++) { const status = unwrapApiData(await syncAdminQqVideo(session.id), null); if (status?.status === 'READY') { await addAdminQqAlbumItem(album.id, { assetId: session.id, caption: file.name.replace(/\.[^.]+$/, '') }); ready = true; break } await new Promise(resolve => window.setTimeout(resolve, 3000)) } message.info(ready ? '视频已加入相册' : '视频已上传，正在等待 Bunny 转码，请稍后同步'); await load()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '上传视频失败')
  }
  finally { uploading.value = false }
}
async function toggle(item: QqSpaceAlbum) {
  try {
    if (item.status === 'PUBLISHED')
      await unpublishAdminQqAlbum(item.id); else await publishAdminQqAlbum(item.id); await load(); message.success(item.status === 'PUBLISHED' ? '已撤回' : '已发布')
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '更新发布状态失败')
  }
}
async function remove(item: QqSpaceAlbum) {
  if (!window.confirm(`确定删除“${item.title}”吗？`))
    return; try { await deleteAdminQqAlbum(item.id); await load() }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '删除相册失败')
  }
}
onMounted(load)
</script>

<template>
  <div class="admin-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          相册管理
        </h1><p class="ui-page-subtitle">
          创建相册，上传角色照片与视频并在发布前检查展示效果。
        </p>
      </div><NButton type="primary" @click="openCreate">
        新建相册
      </NButton>
    </div><NSpin :show="loading">
      <div v-if="albums.length" class="album-list">
        <article v-for="item in albums" :key="item.id" class="album-row ui-card">
          <div class="row-cover">
            <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title"><span v-else>相册</span>
          </div><div class="row-info">
            <h2>{{ item.title }}</h2><p>{{ item.description || '暂无简介' }}</p><small>{{ item.characters?.join(' · ') || '未关联角色' }} · {{ item.itemCount || 0 }} 项 · {{ item.status === 'PUBLISHED' ? '已发布' : '草稿' }}</small>
          </div><div class="row-actions">
            <label class="upload-button"><input type="file" accept="image/*" multiple :disabled="uploading" @change="uploadImages(item, $event)">上传图片</label><label class="upload-button video-upload"><input type="file" accept="video/*" :disabled="uploading" @change="uploadVideo(item, $event)">上传视频</label><NButton size="small" secondary @click="edit(item)">
              编辑
            </NButton><NButton size="small" type="primary" @click="toggle(item)">
              {{ item.status === 'PUBLISHED' ? '撤回' : '发布' }}
            </NButton><NButton size="small" type="error" tertiary @click="remove(item)">
              删除
            </NButton>
          </div>
        </article>
      </div><NEmpty v-else description="还没有相册" />
    </NSpin><NModal v-model:show="modal" preset="card" title="相册信息" style="max-width: 560px">
      <div class="modal-form">
        <NInput v-model:value="form.title" placeholder="相册标题" /><NInput v-model:value="form.description" type="textarea" placeholder="相册简介" /><NSelect v-model:value="form.characterSlugs" multiple :options="characters.map(item => ({ label: item.name, value: item.slug }))" placeholder="关联角色" /><NButton type="primary" @click="save">
          保存
        </NButton>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.admin-page { display: grid; gap: 20px; }.album-list { display: grid; gap: 14px; }.album-row { display: grid; grid-template-columns: 120px 1fr auto; gap: 18px; align-items: center; padding: 14px; }.row-cover { width: 120px; height: 88px; overflow: hidden; border-radius: 12px; background: #f3f5fb; display: grid; place-items: center; color: var(--ui-text-muted); }.row-cover img { width: 100%; height: 100%; object-fit: cover; }.row-info h2 { margin: 0; font-size: 17px; }.row-info p { margin: 6px 0; color: var(--ui-text-muted); }.row-info small { color: var(--ui-primary); }.row-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }.upload-button { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border-radius: 6px; background: var(--ui-primary-soft); color: var(--ui-primary-hover); cursor: pointer; font-size: 13px; }.video-upload { background: rgba(106,168,255,.14); color: #3877d6; }.upload-button input { display: none; }.modal-form { display: grid; gap: 14px; }
@media (max-width: 760px) { .ui-page-header { align-items: flex-start; flex-direction: column; }.album-row { grid-template-columns: 84px 1fr; }.row-cover { width: 84px; height: 72px; }.row-actions { grid-column: 1 / -1; justify-content: flex-start; } }
</style>
