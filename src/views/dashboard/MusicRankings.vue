<script setup lang="ts">
import { NButton, NEmpty, NSkeleton } from 'naive-ui'
import { musicFlags } from '@/api/musicFlags'
import { musicV2Api } from '@/api/musicV2'
import MusicPlaylistSection from '@/components/music/MusicPlaylistSection.vue'
import { useMusicResource } from '@/composables/useMusicResource'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { data, loading, error, reload } = useMusicResource(musicFlags.rankingsEnabled, musicV2Api.rankings)
</script>

<template>
  <div class="page-container ui-page">
    <header class="ui-card ui-page-header">
      <h1 class="ui-page-title">
        排行榜
      </h1><NButton @click="reload">
        刷新
      </NButton>
    </header><NEmpty v-if="!auth.user" description="请先登录" /><NEmpty v-else-if="!musicFlags.rankingsEnabled" description="排行榜尚未开放" /><NSkeleton v-else-if="loading && !data" height="200px" :repeat="2" /><div v-else-if="error" role="alert">
      {{ error }} <NButton @click="reload">
        重试
      </NButton>
    </div><NEmpty v-else-if="!data?.items.length" description="暂无榜单" /><MusicPlaylistSection v-else :playlists="data.items" />
  </div>
</template>
