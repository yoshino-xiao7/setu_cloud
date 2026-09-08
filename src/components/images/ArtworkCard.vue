<script setup lang="ts">
import type { Artwork } from '@/api/artworks'
import { Heart, HeartOutline, LayersOutline, PlayCircleOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import ArtworkImage from './ArtworkImage.vue'

defineProps<{
  work: Artwork
  busy?: boolean
}>()
defineEmits<{
  open: [
  ]
  bookmark: [
  ]
}>()
</script>

<template>
  <article class="artwork-card ui-card" :data-work-id="work.id">
    <div class="artwork-cover" role="button" tabindex="0" :aria-label="`查看 ${work.title}`" @click="$emit('open')" @keydown.enter="$emit('open')">
      <ArtworkImage :src="work.pages[0]?.thumbnailUrl" :alt="work.title" :ratio="(work.pages[0]?.width || 1) / (work.pages[0]?.height || 1)" />
      <span v-if="work.pageCount > 1 || work.kind === 'ugoira'" class="page-count">
        <NIcon :component="work.kind === 'ugoira' ? PlayCircleOutline : LayersOutline" /> {{ work.kind === 'ugoira' ? '动图' : work.pageCount }}
      </span>
    </div>
    <div class="artwork-caption">
      <button class="artwork-title" type="button" @click="$emit('open')">
        <strong>{{ work.title }}</strong><span>{{ work.artist.name }}</span>
      </button>
      <button class="bookmark" :class="{ active: work.bookmarked }" :disabled="busy" :aria-label="work.bookmarked ? '取消收藏' : '收藏作品'" :aria-pressed="work.bookmarked" @click="$emit('bookmark')">
        <NIcon :component="work.bookmarked ? Heart : HeartOutline" size="25" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.artwork-card { padding: 0; overflow: hidden; border-radius: var(--ui-radius-lg, 18px); margin: 0 0 20px; break-inside: avoid; }
.artwork-cover { position: relative; cursor: pointer; }
.page-count { position: absolute; right: 10px; top: 10px; color: white; background: #2229; padding: 3px 7px; border-radius: 7px; display: flex; align-items: center; gap: 4px; font-size: 12px; }
.artwork-caption { display: flex; align-items: center; padding: 12px 8px 12px 14px; gap: 6px; }
.artwork-title { flex: 1; min-width: 0; text-align: left; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; padding: 0; }
.artwork-title strong, .artwork-title span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artwork-title strong { font-weight: 600; font-size: 14px; }
.artwork-title span { opacity: .58; font-size: 12px; margin-top: 3px; }
.bookmark { width: 44px; height: 44px; flex-shrink: 0; border: 0; background: none; color: inherit; cursor: pointer; display: grid; place-items: center; }
.bookmark.active { color: var(--ui-primary); }
.bookmark:disabled { opacity: .4; }
@media (max-width: 640px) { .artwork-card { margin-bottom: 12px; } .artwork-caption { padding: 8px 2px 8px 10px; } }
</style>
