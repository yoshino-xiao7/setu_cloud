<script setup lang="ts">
import type { Song } from '@/api/music'
import { NButton, NEmpty, NSkeleton } from 'naive-ui'
import { userMusicApi } from '@/api/music'
import { unwrapApiData } from '@/api/response'
import { UiRecordCard, UiShelf } from '@/components/ui'
import { useMusicResource } from '@/composables/useMusicResource'
import { useMusicStore } from '@/stores/music'

const player = useMusicStore()
// Op19 remains a legacy capability; never manufacture a v2 Home section or success response.
const { data, loading, error, reload } = useMusicResource(true, async () => {
  const result = unwrapApiData<{ dailySongs?: Song[] }>(await userMusicApi.getRecommendSongs())
  if (!Array.isArray(result?.dailySongs))
    throw new Error('每日推荐暂不可用')
  return result.dailySongs
})
</script>

<template>
  <section class="legacy-daily">
    <h2>每日推荐</h2>
    <NSkeleton v-if="loading && !data" height="60px" :repeat="3" />
    <div v-else-if="error" role="alert">
      {{ error }} <NButton @click="reload">
        重试
      </NButton>
    </div>
    <NEmpty v-else-if="!data?.length" description="暂无每日推荐" />
    <UiShelf v-if="data?.length" title="每日歌曲" width="feature">
      <UiRecordCard v-for="song in data" :key="song.id" :headline="song.name" :supporting="song.artists?.map(artist => artist.name).join(' / ')" density="compact">
        <template #actions>
          <NButton :aria-label="`播放 ${song.name}`" @click="player.playSong(song)">
            播放
          </NButton>
        </template>
      </UiRecordCard>
    </UiShelf>
  </section>
</template>
