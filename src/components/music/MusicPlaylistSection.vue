<script setup lang="ts">
import type { Playlist } from '@/api/musicV2Models'
import { RouterLink, useRouter } from 'vue-router'
import { UiRecordCard, UiShelf } from '@/components/ui'
import { safePush } from '@/utils/navigation'
import LikeButton from './LikeButton.vue'

const router = useRouter()

defineProps<{
  playlists: Playlist[]
}>()
</script>

<template>
  <UiShelf title="歌单" width="feature">
    <UiRecordCard v-for="playlist in playlists" :key="playlist.id" :headline="playlist.title" :on-activate="() => safePush(router, { name: 'PlaylistDetail', params: { id: playlist.id } })" :supporting="playlist.trackCount === null ? '曲目数量暂不可用' : `${playlist.trackCount} 首歌曲`">
      <RouterLink v-if="playlist.artwork" :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }" class="playlist-cover-link" :aria-label="`查看歌单：${playlist.title}`">
        <img :src="playlist.artwork.url" :alt="playlist.title" loading="lazy" referrerpolicy="no-referrer">
      </RouterLink>
      <template #actions>
        <RouterLink :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }">
          查看歌单
        </RouterLink><LikeButton v-if="playlist.origin === 'provider'" :id="playlist.id" kind="saved" />
      </template>
    </UiRecordCard>
  </UiShelf>
</template>

<style scoped>

.playlist-cover-link { display: block; width: 100%; }
.playlist-cover-link img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--ui-radius-lg); }

.record a { color: var(--board-text); text-underline-offset: 3px; }
.record a:hover { color: var(--ui-primary); }
.record a:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 3px; }
</style>
