<script setup lang="ts">
import type { HomeAction } from '@/api/musicV2Models'
import { NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
import { safePush } from '@/utils/navigation'

defineProps<{
  entries: {
    title: string
    action: HomeAction
  }[]
}>()
const router = useRouter()
function destination(action: HomeAction) {
  if (action.kind === 'library' && action.collection === 'liked')
    return '/dashboard/liked-tracks'
  if (action.kind === 'library' && action.collection === 'savedPlaylists')
    return '/dashboard/liked-tracks?collection=saved'
  if (action.kind === 'library' && action.collection === 'history')
    return '/dashboard/music-history'
  if (action.kind === 'library' && action.collection === 'userPlaylists')
    return '/dashboard/my-playlists'
  if (action.kind === 'resource' && action.ref?.kind === 'playlist')
    return `/dashboard/playlist/${encodeURIComponent(action.ref.id)}`
  if (action.kind === 'discovery' && action.selection === 'rankings')
    return '/dashboard/music-rankings'
  if (action.kind === 'discovery' && ['dailyTracks', 'recommendedPlaylists', 'newTracks', 'newAlbums'].includes(action.selection ?? ''))
    return `/dashboard/music-home?selection=${action.selection}`
  if (action.kind === 'search' && action.query !== undefined)
    return `/dashboard/music?q=${encodeURIComponent(action.query)}`
  return null
}
function open(action: HomeAction) {
  const to = destination(action)
  if (to)
    void safePush(router, to)
}
</script>

<template>
  <div class="entries">
    <NButton v-for="(entry, index) in entries" :key="index" :disabled="!destination(entry.action)" @click="open(entry.action)">
      {{ entry.title }}
    </NButton>
  </div>
</template>

<style scoped>
.entries{display:flex;flex-wrap:wrap;gap:12px}
</style>
