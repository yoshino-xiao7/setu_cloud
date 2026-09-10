<script setup lang="ts">
import type { PublicArtwork } from '@/api/publicArtwork'
import { ImageOutline, RefreshOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { onMounted, ref, shallowRef } from 'vue'
import { loadPublicArtwork } from '@/api/publicArtwork'

const props = withDefaults(defineProps<{
  slotIndex: number
  caption?: boolean
  decorative?: boolean
  retryable?: boolean
  eager?: boolean
}>(), { caption: false, decorative: false, retryable: false, eager: false })

const artwork = shallowRef<PublicArtwork>()
const loading = ref(true)
const failed = ref(false)
const portrait = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  artwork.value = undefined
  try {
    artwork.value = await loadPublicArtwork(props.slotIndex)
  }
  catch {
    failed.value = true
    loading.value = false
  }
}

function imageFailed() {
  failed.value = true
  loading.value = false
}

function imageLoaded(event: Event) {
  const image = event.target as HTMLImageElement
  portrait.value = image.naturalHeight > image.naturalWidth
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="public-artwork" :class="{ 'has-image': artwork && !loading && !failed, 'is-portrait': portrait }" :aria-busy="loading">
    <img
      v-if="artwork && !failed"
      :src="artwork.url"
      :alt="decorative ? '' : `${artwork.title}${artwork.author ? ` · ${artwork.author}` : ''}`"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
      referrerpolicy="no-referrer"
      @load="imageLoaded"
      @error="imageFailed"
    >
    <div v-if="loading || failed" class="artwork-state" :class="{ 'is-failed': failed }" role="status">
      <NIcon><ImageOutline /></NIcon>
      <span>{{ failed ? '图片暂不可用' : '图片加载中' }}</span>
      <button v-if="failed && retryable" type="button" aria-label="重试加载图片" title="重试加载图片" @click.stop.prevent="load">
        <NIcon><RefreshOutline /></NIcon>
      </button>
    </div>
    <span v-if="caption && artwork && !loading && !failed" class="artwork-credit">{{ artwork.title }}<template v-if="artwork.author"> · {{ artwork.author }}</template></span>
  </div>
</template>

<style scoped>
.public-artwork { position: relative; overflow: hidden; background: #eff4f6; isolation: isolate; }
.public-artwork > img { width: 100%; height: 100%; object-fit: cover; object-position: inherit; display: block; }
.artwork-state { position: absolute; inset: 0; display: flex; gap: 10px; justify-content: center; align-items: center; color: #637580; font-size: 12px; background: #eff4f6; }
.artwork-state .n-icon { font-size: 20px; }
.artwork-state button { width: 36px; height: 36px; border-radius: 6px; border: 1px solid #ced9de; color: inherit; background: #fff; display: grid; place-items: center; cursor: pointer; }
.artwork-credit { position: absolute; bottom: 18px; right: 20px; max-width: calc(100% - 40px); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 6px 10px; border-radius: 4px; background: #ffffffe8; color: #34414a; font-size: 11px; }
</style>
