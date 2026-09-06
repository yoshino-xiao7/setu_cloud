<script setup lang="ts">
import type { Album } from '@/api/musicV2Models'
import { UiRecordCard, UiShelf } from '@/components/ui'

defineProps<{
  albums: Album[]
}>()
</script>

<template>
  <UiShelf title="专辑" width="feature">
    <UiRecordCard v-for="album in albums" :key="album.id" :headline="album.title" :supporting="album.artists.map(a => a.name).join(' / ')">
      <img v-if="album.artwork" class="album-cover" :src="album.artwork.url" :alt="album.title" loading="lazy" referrerpolicy="no-referrer">
    </UiRecordCard>
  </UiShelf>
</template>

<style scoped>


.album-cover { display: block; width: 100%; }
.album-cover { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--ui-radius-lg); }
</style>
