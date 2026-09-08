<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fetchArtworkBlob } from '@/api/artworks'

const props = withDefaults(defineProps<{
  src?: string | null
  alt: string
  ratio?: number
  fit?: 'cover' | 'contain'
}>(), { ratio: 1, fit: 'cover' })
const host = ref<HTMLElement>()
const url = ref('')
const failed = ref(false)
let observer: IntersectionObserver | undefined
let controller: AbortController | undefined
let visible = false
let generation = 0
function release() {
  generation++
  controller?.abort()
  if (url.value)
    URL.revokeObjectURL(url.value)
  url.value = ''
}
async function load() {
  if (!visible || !props.src || url.value)
    return
  controller?.abort()
  const token = ++generation
  controller = new AbortController()
  failed.value = false
  try {
    const blob = await fetchArtworkBlob(props.src, controller.signal)
    if (token === generation)
      url.value = URL.createObjectURL(blob)
  }
  catch {
    if (token === generation)
      failed.value = true
  }
}
watch(() => props.src, () => {
  release()
  void load()
})
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
    if (visible)
      void load()
    else
      release()
  }, { rootMargin: '600px' })
  if (host.value)
    observer.observe(host.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  release()
})
</script>

<template>
  <div ref="host" class="artwork-image" :style="{ aspectRatio: String(ratio > 0 ? ratio : 1) }">
    <img v-if="url" :src="url" :alt="alt" :style="{ objectFit: fit }" decoding="async">
    <button v-else-if="failed" type="button" class="image-retry" @click.stop="load">
      图片加载失败<br><span>点击重试</span>
    </button>
    <div v-else class="image-placeholder" :aria-label="src ? '正在加载图片' : '暂无图片'" />
  </div>
</template>

<style scoped>
.artwork-image { width: 100%; position: relative; overflow: hidden; background: var(--ui-surface, #f4f0f3); }
.artwork-image img { width: 100%; height: 100%; display: block; }
.image-placeholder { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 25%, #ffffff45 45%, transparent 65%); background-size: 220% 100%; animation: image-shimmer 1.8s ease infinite; }
.image-retry { width: 100%; height: 100%; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; }
.image-retry span { opacity: .55; font-size: 12px; }
@keyframes image-shimmer { to { background-position: -220% 0; } }
@media (prefers-reduced-motion: reduce) { .image-placeholder { animation: none; } }
</style>
