<script setup lang="ts">
import type { Song } from '@/api/music'
import { MusicalNotesOutline, PauseOutline, PlayOutline, TrashOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NPopconfirm } from 'naive-ui'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()

async function playFromQueue(song: Song) {
  await musicStore.playSong(song)
}
</script>

<template>
  <section class="queue-panel ui-card">
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
      <button
        v-for="(song, index) in musicStore.playlist"
        :key="`${song.id}-${index}`"
        class="queue-item"
        :class="{ active: musicStore.currentSong?.id === song.id }"
        type="button"
        @click="playFromQueue(song)"
      >
        <span class="queue-index">
          <NIcon v-if="musicStore.currentSong?.id === song.id && musicStore.isPlaying">
            <PauseOutline />
          </NIcon>
          <NIcon v-else-if="musicStore.currentSong?.id === song.id">
            <PlayOutline />
          </NIcon>
          <span v-else>{{ index + 1 }}</span>
        </span>

        <span class="queue-cover">
          <img
            v-if="song.album?.picUrl"
            :src="song.album.picUrl"
            :alt="song.name"
            referrerpolicy="no-referrer"
          >
          <NIcon v-else><MusicalNotesOutline /></NIcon>
        </span>

        <span class="queue-copy">
          <span class="queue-name">{{ song.name }}</span>
          <span class="queue-artist">{{ song.artists?.map(artist => artist.name).join(' / ') }}</span>
        </span>

        <span class="queue-remove" @click.stop>
          <NButton text type="error" size="small" @click="musicStore.removeFromPlaylist(song.id)">
            <template #icon><NIcon><TrashOutline /></NIcon></template>
          </NButton>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.queue-panel {
  padding: 18px;
  min-height: 260px;
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
  color: #1f2937;
  font-size: 16px;
}

.panel-header p {
  margin-top: 3px;
  color: #6b7280;
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

.queue-item {
  display: grid;
  grid-template-columns: 28px 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  padding: 8px;
  text-align: left;
  cursor: pointer;
}

.queue-item:hover,
.queue-item.active {
  border-color: rgba(245, 134, 169, 0.22);
  background: rgba(255, 247, 251, 0.94);
}

.queue-index {
  display: flex;
  justify-content: center;
  color: #6b7280;
  font-size: 12px;
}

.queue-cover {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #fff3f7;
  color: #f586a9;
}

.queue-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.queue-copy,
.queue-name,
.queue-artist {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-name {
  color: #374151;
  font-size: 13px;
  font-weight: 700;
}

.queue-artist {
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
}

.queue-remove {
  opacity: 0;
}

.queue-item:hover .queue-remove,
.queue-item.active .queue-remove {
  opacity: 1;
}

@media (max-width: 768px) {
  .queue-panel {
    padding: 14px;
  }

  .queue-remove {
    opacity: 1;
  }
}
</style>
