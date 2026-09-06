<script setup lang="ts">
import type { Song } from '@/api/music'
import { MusicalNotesOutline, TrashOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NPopconfirm } from 'naive-ui'
import { UiBoard, UiRecordCard } from '@/components/ui'
import { useMusicStore } from '@/stores/music'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

const musicStore = useMusicStore()

async function playFromQueue(song: Song) {
  await musicStore.playSong(song)
}
</script>

<template>
  <UiBoard :inset="props.embedded ? 0 : 16" class="queue-panel" :class="[props.embedded ? 'embedded' : 'ui-card']">
    <div class="panel-header">
      <div>
        <h3>播放队列</h3>
        <p>共 {{ musicStore.playlist.length }} 首</p>
      </div>
      <NPopconfirm v-if="musicStore.playlist.length > 0" @positive-click="musicStore.clearPlaylist()">
        <template #trigger>
          <NButton text type="error" size="small">
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            清空
          </NButton>
        </template>
        确定清空播放队列？
      </NPopconfirm>
    </div>

    <div v-if="musicStore.playlist.length === 0" class="queue-empty">
      <NEmpty description="播放队列为空">
        <template #icon>
          <NIcon><MusicalNotesOutline /></NIcon>
        </template>
      </NEmpty>
    </div>

    <div v-else class="queue-list">
      <UiRecordCard v-for="(song, index) in musicStore.playlist" :key="`${song.id}-${index}`" :headline="song.name" :supporting="song.artists?.map(artist => artist.name).join(' / ')" density="compact" :on-activate="() => playFromQueue(song)" :status="{ tone: musicStore.currentSong?.id === song.id ? 'brand' : 'muted', text: musicStore.currentSong?.id === song.id ? musicStore.isPlaying ? '正在播放' : '已暂停' : String(index + 1) }">
        <img v-if="song.album?.picUrl" :src="song.album.picUrl" :alt="song.name" class="board-track-cover" referrerpolicy="no-referrer" loading="lazy" decoding="async"><template #actions>
          <NButton text @click="playFromQueue(song)">
            播放
          </NButton><NButton text type="error" size="small" :aria-label="`移除 ${song.name}`" @click="musicStore.removeFromPlaylist(song.id)">
            移除
          </NButton>
        </template>
      </UiRecordCard>
    </div>
  </UiBoard>
</template>

<style scoped>
.queue-panel {
  padding: 18px;
  min-height: 260px;
}

.queue-panel.embedded {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.panel-header h3,
.panel-header p {
  margin: 0;
}

.panel-header h3 {
  color: var(--board-text);
  font-size: 16px;
}

.panel-header p {
  margin-top: 3px;
  color: var(--board-text-muted);
  font-size: 12px;
}

.queue-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 430px;
  overflow: auto;
  padding-right: 2px;
}

.queue-panel.embedded .queue-list {
  flex: 1;
  min-height: 0;
  max-height: none;
}

@media (max-width: 768px) {
  .queue-panel {
    padding: 14px;
  }

  .queue-panel.embedded {
    padding: 0;
  }

  .queue-list {
    gap: 6px;
  }
}

.board-track-cover { width: 48px; height: 48px; object-fit: cover; border-radius: var(--ui-radius-md); }

.ui-card, .header { background: var(--board-surface); color: var(--board-text); }
</style>
