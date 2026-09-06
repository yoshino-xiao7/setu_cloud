<script setup lang="ts">
import { NButton, NEmpty, NSkeleton } from 'naive-ui'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { musicFlags } from '@/api/musicFlags'
import MusicPlaylistSection from '@/components/music/MusicPlaylistSection.vue'
import MusicTrackSection from '@/components/music/MusicTrackSection.vue'
import { UiBoard } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useMusicStore } from '@/stores/music'
import { safePush } from '@/utils/navigation'

const route = useRoute()
const router = useRouter()
const store = useMusicStore()
const auth = useAuthStore()
const kind = computed(() => route.query.collection === 'saved' || !musicFlags.likedTracksEnabled ? 'saved' : 'liked')
const enabled = computed(() => kind.value === 'saved' ? musicFlags.favoritePlaylistsEnabled : musicFlags.likedTracksEnabled)
const rows = computed(() => store.library[kind.value])
const tracks = computed(() => store.library.liked.items.flatMap(row => row.track ? [row.track] : []))
const playlists = computed(() => store.library.saved.items.flatMap(row => row.playlist ? [row.playlist] : []))
const unavailable = computed(() => rows.value.items.length - (kind.value === 'liked' ? tracks.value.length : playlists.value.length))
watch([kind, () => auth.user?.id], () => {
  if (enabled.value)
    void store.library.load(kind.value)
}, { immediate: true })
</script>

<template>
  <UiBoard class="page-container ui-page">
    <header class="ui-card ui-page-header">
      <h1 class="ui-page-title">
        {{ kind === 'liked' ? '我喜欢' : '收藏歌单' }}
      </h1><div class="tabs">
        <NButton v-if="musicFlags.likedTracksEnabled" @click="safePush(router, '/dashboard/liked-tracks')">
          喜欢歌曲
        </NButton><NButton v-if="musicFlags.favoritePlaylistsEnabled" @click="safePush(router, '/dashboard/liked-tracks?collection=saved')">
          收藏歌单
        </NButton><NButton @click="store.library.load(kind)">
          刷新
        </NButton>
      </div>
    </header><NEmpty v-if="!auth.user" description="请先登录" /><NEmpty v-else-if="!enabled" description="此音乐功能尚未开放" /><NSkeleton v-else-if="store.library.loading && !rows.items.length" height="60px" :repeat="4" /><div v-else-if="store.library.error" role="alert">
      {{ store.library.error }} <NButton @click="store.library.load(kind)">
        重试
      </NButton>
    </div><NEmpty v-else-if="!rows.items.length" description="还没有收藏内容" /><template v-else>
      <MusicTrackSection v-if="kind === 'liked'" :tracks="tracks" /><MusicPlaylistSection v-else :playlists="playlists" /><p v-if="unavailable" role="status">
        {{ unavailable }} 项资源暂不可用，收藏关系已保留。
      </p>
    </template><NButton v-if="auth.user && enabled && rows.hasMore" :loading="store.library.loading" @click="store.library.load(kind, true)">
      加载更多
    </NButton>
  </UiBoard>
</template>

<style scoped>
.tabs{display:flex;gap:8px;flex-wrap:wrap}

.ui-card, .header { background: var(--board-surface); color: var(--board-text); }

.ui-page-title { color: var(--board-text); }
.ui-card { background: var(--board-surface); color: var(--board-text); }
</style>
