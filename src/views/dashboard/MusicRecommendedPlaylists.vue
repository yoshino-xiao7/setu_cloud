<script setup lang="ts">
import { NButton, NEmpty, NSkeleton } from 'naive-ui'
import { musicFlags } from '@/api/musicFlags'
import { musicV2Api } from '@/api/musicV2'
import MusicPlaylistSection from '@/components/music/MusicPlaylistSection.vue'
import { useMusicResource } from '@/composables/useMusicResource'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { data, loading, error, reload } = useMusicResource(musicFlags.usesV2Home, musicV2Api.recommendedPlaylists)
</script>

<template>
  <div class="page-container ui-page">
    <header class="ui-card ui-page-header">
      <h1 class="ui-page-title">推荐歌单</h1>
      <NButton @click="reload">刷新</NButton>
    </header>
    <NEmpty v-if="!auth.user" description="请先登录" />
    <NEmpty v-else-if="!musicFlags.usesV2Home" description="推荐歌单尚未开放" />
    <NSkeleton v-else-if="loading && !data" height="200px" :repeat="2" />
    <div v-else-if="error" role="alert" class="ui-card">
      {{ error }} <NButton @click="reload">重试</NButton>
    </div>
    <template v-else-if="data">
      <p v-if="data.source.label">{{ data.source.label }}</p>
      <NEmpty v-if="!data.items.length" description="暂无推荐歌单" />
      <MusicPlaylistSection v-else :playlists="data.items" />
    </template>
  </div>
</template>
