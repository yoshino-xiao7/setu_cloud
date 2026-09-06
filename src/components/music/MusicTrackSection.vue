<script setup lang="ts">
import type { Track } from '@/api/musicV2Models'
import { NButton, useMessage } from 'naive-ui'
import { trackToSong } from '@/api/musicV2Models'
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
  <ul class="tracks">
    <li v-for="track in tracks" :key="track.id">
      <img v-if="track.artwork" :src="track.artwork.url" alt="" width="48" height="48" loading="lazy" referrerpolicy="no-referrer">
      <div class="info">
        <strong>{{ track.title }}</strong><span>{{ track.artists.map(a => a.name).join(' / ') }}</span>
      </div>
      <NButton size="small" :disabled="!['playable', 'unknown'].includes(track.availability.status)" @click="play(track)">
        播放
      </NButton>
      <LikeButton :id="track.id" />
    </li>
  </ul>
</template>

<style scoped>
.tracks{list-style:none;padding:0;margin:0;display:grid;gap:12px}.tracks li{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap}.info{flex:1;min-width:90px;overflow-wrap:anywhere}.info span{display:block;color:var(--ui-muted);font-size:12px}.tracks img{object-fit:cover;border-radius:8px}
</style>
