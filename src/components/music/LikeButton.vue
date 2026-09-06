<script setup lang="ts">
import { Bookmark, BookmarkOutline, Heart, HeartOutline } from '@vicons/ionicons5'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { computed, onMounted } from 'vue'
import { musicFlags } from '@/api/musicFlags'
import { typedMusicID } from '@/api/musicIdentity'
import { useMusicStore } from '@/stores/music'

const props = withDefaults(defineProps<{
  id: string
  kind?: 'liked' | 'saved'
}>(), { kind: 'liked' })
const store = useMusicStore()
const message = useMessage()
const enabled = computed(() => props.kind === 'liked' ? musicFlags.likedTracksEnabled : musicFlags.favoritePlaylistsEnabled)
const identity = computed(() => {
  try {
    return typedMusicID(props.kind === 'liked' ? 'track' : 'playlist', props.id)
  }
  catch {
    return null
  }
})
const selected = computed(() => (props.kind === 'liked' ? store.library.likedIDs : store.library.savedIDs)?.has(identity.value ?? ''))
const pending = computed(() => store.library.pending.has(`${props.kind}:${identity.value}`))
const label = computed(() => props.kind === 'liked' ? (selected.value ? '取消喜欢' : '喜欢') : (selected.value ? '取消收藏' : '收藏歌单'))
onMounted(() => {
  if (enabled.value)
    void store.library.ensureMemberships().catch(() => { })
})
async function toggle() {
  try {
    await store.library.toggle(props.kind, props.id)
  }
  catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  }
}
</script>

<template>
  <NButton v-if="enabled" :disabled="!identity" :loading="pending" :aria-pressed="selected === true" :type="selected ? 'primary' : 'default'" :aria-label="label" size="small" @click.stop="toggle">
    <template #icon>
      <NIcon><component :is="kind === 'liked' ? (selected ? Heart : HeartOutline) : (selected ? Bookmark : BookmarkOutline)" /></NIcon>
    </template>
    {{ label }}
  </NButton>
</template>
