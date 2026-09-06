<script setup lang="ts">
import type { Album } from '@/api/musicV2Models'

defineProps<{
  albums: Album[]
}>()
</script>

<template>
  <div class="albums">
    <article v-for="album in albums" :key="album.id" class="ui-card">
      <img v-if="album.artwork" :src="album.artwork.url" alt="" loading="lazy" referrerpolicy="no-referrer"><h3>{{ album.title }}</h3><p>{{ album.artists.map(a => a.name).join(' / ') }}</p>
    </article>
  </div>
</template>

<style scoped>
.albums{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:16px}.albums article{padding:14px;min-width:0;overflow-wrap:anywhere}.albums img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}.albums h3{font-size:16px}.albums p{font-size:12px;color:var(--ui-muted)}
</style>
