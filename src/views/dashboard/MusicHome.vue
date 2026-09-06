<script setup lang="ts">
import type { Album, HomeSection, Playlist, Track } from '@/api/musicV2Models'
import { NButton, NEmpty, NSkeleton } from 'naive-ui'
import { computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { musicFlags } from '@/api/musicFlags'
import { observeMusic } from '@/api/musicObservation'
import { musicV2Api } from '@/api/musicV2'
import MusicAlbumSection from '@/components/music/MusicAlbumSection.vue'
import MusicEntrySection from '@/components/music/MusicEntrySection.vue'
import MusicLegacyDaily from '@/components/music/MusicLegacyDaily.vue'
import MusicPlaylistSection from '@/components/music/MusicPlaylistSection.vue'
import MusicTrackSection from '@/components/music/MusicTrackSection.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicResource } from '@/composables/useMusicResource'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { isMobile } = useBreakpoint()
const { data, loading, error, reload } = useMusicResource(musicFlags.usesV2Home, musicV2Api.home)
const readyStarted = performance.now()
watch(data, async (value) => {
  if (value) {
    await nextTick()
    requestAnimationFrame(() => observeMusic('home.ready', true, readyStarted))
  }
}, { once: true })
const sections = computed(() => data.value?.sections.filter(section => section.kind !== 'dailyTracks' && (!route.query.selection || section.kind === route.query.selection)) ?? [])
const tracks = (s: HomeSection): Track[] => s.items.flatMap(i => i.kind === 'track' ? [i.track] : [])
const playlists = (s: HomeSection): Playlist[] => s.items.flatMap(i => i.kind === 'playlist' ? [i.playlist] : [])
const albums = (s: HomeSection): Album[] => s.items.flatMap(i => i.kind === 'album' ? [i.album] : [])
const entries = (s: HomeSection) => s.items.flatMap(i => i.kind === 'entry' ? [{ title: i.title, action: i.action }] : i.kind === 'keyword' ? [{ title: i.query, action: { kind: 'search', query: i.query, label: null } }] : [])
</script>

<template>
  <div class="page-container ui-page" :class="{ compact: isMobile }">
    <header class="ui-card ui-page-header">
      <h1 class="ui-page-title">
        音乐首页
      </h1><NButton @click="reload">
        刷新
      </NButton>
    </header>
    <NEmpty v-if="!auth.user" description="请先登录" />
    <NEmpty v-else-if="!musicFlags.usesV2Home" description="音乐首页尚未开放" />
    <NSkeleton v-else-if="loading && !data" height="160px" :repeat="3" />
    <div v-else-if="error" role="alert" class="ui-card error">
      {{ error }} <NButton @click="reload">
        重试
      </NButton>
    </div>
    <MusicLegacyDaily v-else-if="route.query.selection === 'dailyTracks'" />
    <NEmpty v-else-if="!sections.length" description="暂时没有推荐内容" />
    <template v-else>
      <MusicLegacyDaily v-if="!route.query.selection" />
      <section v-for="section in sections" :key="section.id" class="ui-card section">
        <h2>{{ section.title }}</h2><p v-if="section.subtitle">
          {{ section.subtitle }}
        </p>
        <p v-if="section.source?.label">
          {{ section.source.label }}
        </p>
        <p v-if="section.degraded" role="status">
          部分内容暂不可用
        </p>
        <MusicEntrySection v-if="section.action" :entries="[{ title: section.action.label ?? '查看更多', action: section.action }]" />
        <MusicEntrySection v-else-if="section.kind === 'recommendedPlaylists'" :entries="[{ title: '查看全部推荐歌单', action: { kind: 'discovery', selection: 'recommendedPlaylists', label: null } }]" />
        <MusicTrackSection v-if="tracks(section).length" :tracks="tracks(section)" />
        <MusicPlaylistSection v-if="playlists(section).length" :playlists="playlists(section)" />
        <MusicAlbumSection v-if="albums(section).length" :albums="albums(section)" />
        <MusicEntrySection v-if="entries(section).length" :entries="entries(section)" />
        <NEmpty v-if="!section.items.length" description="暂无内容" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.section,.error{padding:24px}.section h2{font-size:20px;margin-top:0}.section p{color:var(--ui-muted)}.compact .section{padding:16px}.section{min-width:0;overflow-wrap:anywhere}
</style>
