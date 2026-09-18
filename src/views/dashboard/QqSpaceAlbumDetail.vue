<!-- eslint-disable style/max-statements-per-line -->
<script setup lang="ts">
import type { QqSpaceAlbum } from '@/api/qqSpace'
import { ArrowBackOutline, ChevronBackOutline, ChevronForwardOutline, PlayCircleOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NSpin, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchQqAlbum } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const album = ref<QqSpaceAlbum | null>(null)
const selected = ref<number | null>(null)
const currentIndex = computed(() => album.value?.items?.findIndex(item => item.id === selected.value) ?? -1)
const current = computed(() => currentIndex.value >= 0 ? album.value?.items?.[currentIndex.value] : null)

async function load() {
  const id = Number(route.params.id)
  if (!Number.isFinite(id))
    return
  loading.value = true
  try { album.value = unwrapApiData(await fetchQqAlbum(id), null) }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载相册失败')
  }
  finally { loading.value = false }
}
function close() { selected.value = null }
function move(step: number) {
  const items = album.value?.items || []
  if (!items.length)
    return
  const next = (currentIndex.value + step + items.length) % items.length
  selected.value = items[next].id
}
function onKey(event: KeyboardEvent) {
  if (selected.value === null)
    return
  if (event.key === 'Escape')
    close()
  if (event.key === 'ArrowLeft')
    move(-1)
  if (event.key === 'ArrowRight')
    move(1)
}
onMounted(() => { void load(); window.addEventListener('keydown', onKey) })
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="qq-page ui-page">
    <div class="ui-page-header">
      <div>
        <NButton text @click="router.push('/dashboard/qq-space/albums')">
          <template #icon>
            <NIcon><ArrowBackOutline /></NIcon>
          </template>返回相册
        </NButton><h1 class="ui-page-title">
          {{ album?.title || '相册' }}
        </h1><p class="ui-page-subtitle">
          {{ album?.description }}
        </p>
      </div>
    </div>
    <NSpin :show="loading">
      <div v-if="album?.items?.length" class="media-wall">
        <button v-for="item in album.items" :key="item.id" class="media-tile" type="button" @click="selected = item.id">
          <img v-if="item.mediaType !== 'VIDEO'" :src="item.url || ''" :alt="item.caption || album.title" loading="lazy">
          <img v-else :src="item.posterUrl || ''" :alt="item.caption || album.title" loading="lazy">
          <span v-if="item.mediaType === 'VIDEO'" class="video-mark"><NIcon><PlayCircleOutline /></NIcon></span>
          <span v-if="item.caption" class="tile-caption">{{ item.caption }}</span>
        </button>
      </div>
      <NEmpty v-else description="这个相册还没有媒体" />
    </NSpin>
    <div v-if="current" class="lightbox" role="dialog" aria-modal="true" @click.self="close">
      <button class="lightbox-close" type="button" aria-label="关闭" @click="close">
        ×
      </button>
      <button class="lightbox-nav prev" type="button" aria-label="上一项" @click="move(-1)">
        <NIcon size="30">
          <ChevronBackOutline />
        </NIcon>
      </button>
      <div class="lightbox-content">
        <video v-if="current.mediaType === 'VIDEO'" :src="current.playbackUrl || ''" :poster="current.posterUrl || ''" controls playsinline />
        <img v-else :src="current.url || ''" :alt="current.caption || ''">
        <p v-if="current.caption">
          {{ current.caption }}
        </p>
      </div>
      <button class="lightbox-nav next" type="button" aria-label="下一项" @click="move(1)">
        <NIcon size="30">
          <ChevronForwardOutline />
        </NIcon>
      </button>
    </div>
  </div>
</template>

<style scoped>
.qq-page { display: grid; gap: 18px; }
.ui-page-header h1 { margin: 8px 0 0; }
.media-wall { column-count: 4; column-gap: 14px; }
.media-tile { display: block; width: 100%; padding: 0; margin: 0 0 14px; border: 0; border-radius: 14px; overflow: hidden; position: relative; background: transparent; cursor: zoom-in; break-inside: avoid; box-shadow: 0 10px 22px rgba(31,41,55,.08); }
.media-tile img { display: block; width: 100%; height: auto; max-height: 560px; object-fit: cover; }
.video-mark { position: absolute; top: 12px; right: 12px; color: white; filter: drop-shadow(0 2px 5px rgba(0,0,0,.35)); }
.tile-caption { position: absolute; inset: auto 0 0; padding: 22px 12px 10px; color: white; text-align: left; background: linear-gradient(transparent, rgba(0,0,0,.62)); font-size: 12px; }
.lightbox { position: fixed; z-index: 50; inset: 0; display: flex; align-items: center; justify-content: center; padding: 30px 70px; background: rgba(12,16,28,.88); }
.lightbox-content { max-width: min(1100px, 90vw); max-height: 90vh; text-align: center; color: white; }
.lightbox-content img, .lightbox-content video { max-width: 100%; max-height: 80vh; display: block; margin: auto; object-fit: contain; }
.lightbox-content p { margin: 12px 0 0; }
.lightbox-close, .lightbox-nav { position: absolute; border: 0; background: rgba(255,255,255,.14); color: white; cursor: pointer; border-radius: 999px; display: grid; place-items: center; }
.lightbox-close { right: 24px; top: 20px; width: 42px; height: 42px; font-size: 30px; }
.lightbox-nav { width: 48px; height: 48px; top: 50%; transform: translateY(-50%); }
.lightbox-nav.prev { left: 18px; } .lightbox-nav.next { right: 18px; }
@media (max-width: 900px) { .media-wall { column-count: 3; } }
@media (max-width: 600px) { .media-wall { column-count: 2; } .lightbox { padding: 25px 16px; } .lightbox-nav { width: 40px; height: 40px; } .lightbox-nav.prev { left: 8px; } .lightbox-nav.next { right: 8px; } }
@media (max-width: 390px) { .media-wall { column-count: 1; } }
</style>
