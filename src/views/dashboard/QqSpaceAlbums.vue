<script setup lang="ts">
import type { QqSpaceAlbum, QqSpaceCharacter } from '@/api/qqSpace'
import { ImagesOutline } from '@vicons/ionicons5'
import { NEmpty, NIcon, NSelect, NSpin, useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchQqAlbums, fetchQqCharacters } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const albums = ref<QqSpaceAlbum[]>([])
const characters = ref<QqSpaceCharacter[]>([])
const character = ref<string | null>(null)
const characterOptions = computed(() => [{ label: '全部角色', value: null }, ...characters.value.map(item => ({ label: item.name, value: item.slug }))])

async function load() {
  loading.value = true
  try {
    const [albumResponse, characterResponse] = await Promise.all([
      fetchQqAlbums({ character: character.value || undefined, pageSize: 50 }),
      characters.value.length ? Promise.resolve(null) : fetchQqCharacters(),
    ])
    albums.value = unwrapApiData(albumResponse, [])
    if (characterResponse)
      characters.value = unwrapApiData(characterResponse, [])
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载相册失败')
  }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div class="qq-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          角色相册
        </h1><p class="ui-page-subtitle">
          收藏每一个角色日常与特别时刻。
        </p>
      </div>
      <NSelect v-model:value="character" :options="characterOptions" clearable class="character-filter" @update:value="load" />
    </div>
    <NSpin :show="loading">
      <div v-if="albums.length" class="album-grid">
        <article v-for="album in albums" :key="album.id" class="album-card ui-card ui-card-hover" @click="router.push(`/dashboard/qq-space/albums/${album.id}`)">
          <div class="album-cover">
            <img v-if="album.coverUrl" :src="album.coverUrl" :alt="album.title" loading="lazy"><div v-else class="cover-fallback">
              <NIcon size="42">
                <ImagesOutline />
              </NIcon>
            </div><span class="album-count">{{ album.itemCount || 0 }} 项</span>
          </div>
          <div class="album-copy">
            <h2>{{ album.title }}</h2><p>{{ album.description || '还没有相册简介。' }}</p><span>{{ album.characters?.join(' · ') || '扣扣空间' }}</span>
          </div>
        </article>
      </div>
      <NEmpty v-else description="还没有发布相册" />
    </NSpin>
  </div>
</template>

<style scoped>
.qq-page { display: grid; gap: 20px; }
.character-filter { width: 180px; }
.album-grid { column-count: 4; column-gap: 18px; }
.album-card { display: inline-block; width: 100%; margin: 0 0 18px; cursor: pointer; break-inside: avoid; }
.album-cover { position: relative; min-height: 160px; aspect-ratio: 1.25; overflow: hidden; background: linear-gradient(135deg, #fff1f6, #eef6ff); }
.album-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-fallback { height: 100%; min-height: 160px; display: grid; place-items: center; color: var(--ui-primary); }
.album-count { position: absolute; right: 10px; bottom: 10px; padding: 4px 9px; border-radius: 999px; background: rgba(20, 25, 40, .58); color: white; font-size: 12px; }
.album-copy { padding: 14px 16px 17px; }
.album-copy h2 { margin: 0; font-size: 17px; color: var(--ui-text); }
.album-copy p { margin: 6px 0; color: var(--ui-text-muted); font-size: 13px; line-height: 1.6; }
.album-copy span { color: var(--ui-primary); font-size: 12px; }
@media (max-width: 1050px) { .album-grid { column-count: 3; } }
@media (max-width: 700px) { .ui-page-header { align-items: flex-start; flex-direction: column; } .album-grid { column-count: 2; } .character-filter { width: 100%; } }
@media (max-width: 430px) { .album-grid { column-count: 1; } }
</style>
