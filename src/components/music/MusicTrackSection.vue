<script setup lang="ts">
import type { Track } from '@/api/musicV2Models'
import { NButton, useMessage } from 'naive-ui'
import { trackToSong } from '@/api/musicV2Models'
import { UiRecordCard, UiShelf } from '@/components/ui'
import { useMusicStore } from '@/stores/music'
import LikeButton from './LikeButton.vue'

defineProps<{
  tracks: Track[]
}>()
const store = useMusicStore()
const message = useMessage()
async function play(track: Track) {
  const song = trackToSong(track)
  if (await store.playSong(song))
    store.addToPlaylist(song)
  else
    message.error(store.lastPlaybackError || '播放失败')
}
</script>

<template>
  <UiShelf title="歌曲" width="feature">
    <UiRecordCard v-for="track in tracks" :key="track.id" :headline="track.title" :supporting="track.artists.map(a => a.name).join(' / ')" density="compact">
      <img v-if="track.artwork" class="track-cover" :src="track.artwork.url" :alt="track.title" width="48" height="48" loading="lazy" referrerpolicy="no-referrer">
      <template #actions>
        <NButton size="small" :disabled="!['playable', 'unknown'].includes(track.availability.status)" @click="play(track)">
          播放
        </NButton><LikeButton :id="track.id" />
      </template>
    </UiRecordCard>
  </UiShelf>
</template>

<style scoped>
.track-cover { width: 48px; height: 48px; object-fit: cover; border-radius: var(--ui-radius-sm); }

</style>
