<script setup lang="ts">
import type { Playlist } from '@/api/musicV2Models'
import { RouterLink } from 'vue-router'
import LikeButton from './LikeButton.vue'

defineProps<{
  playlists: Playlist[]
}>()
</script>

<template>
  <div class="cards">
    <article v-for="playlist in playlists" :key="playlist.id" class="ui-card card">
      <RouterLink :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }">
        <img v-if="playlist.artwork" :src="playlist.artwork.url" alt="" loading="lazy" referrerpolicy="no-referrer">
        <h3>{{ playlist.title }}</h3>
      </RouterLink>
      <p>{{ playlist.trackCount === null ? '曲目数量暂不可用' : `${playlist.trackCount} 首歌曲` }}</p>
      <LikeButton v-if="playlist.origin === 'provider'" :id="playlist.id" kind="saved" />
    </article>
  </div>
</template>

<style scoped>
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:16px}.card{padding:14px;min-width:0;overflow-wrap:anywhere}.card img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}.card a{color:var(--ui-text);text-decoration:none}.card a:focus-visible{outline:2px solid var(--ui-primary)}.card h3{font-size:16px;margin:10px 0}.card p{font-size:12px;color:var(--ui-muted)}
</style>
