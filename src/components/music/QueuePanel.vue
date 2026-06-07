<script setup lang="ts">
import { NButton, NEmpty, NIcon, NPopconfirm } from 'naive-ui'
import { MusicalNotesOutline, PauseOutline, PlayOutline, TrashOutline } from '@vicons/ionicons5'
import { useMusicStore } from '@/stores/music'
import type { Song } from '@/api/music'

const musicStore = useMusicStore()

const playFromQueue = async (song: Song) => {
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
      <n-popconfirm v-if="musicStore.playlist.length > 0" @positive-click="musicStore.clearPlaylist()">
        <template #trigger>
          <n-button text type="error" size="small">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
            清空
          </n-button>
        </template>
        确定清空播放队列？
      </n-popconfirm>
    </div>

    <div v-if="musicStore.playlist.length === 0" class="queue-empty">
      <n-empty description="播放队列为空">
        <template #icon><n-icon><MusicalNotesOutline /></n-icon></template>
      </n-empty>
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
          <n-icon v-if="musicStore.currentSong?.id === song.id && musicStore.isPlaying">
            <PauseOutline />
          </n-icon>
          <n-icon v-else-if="musicStore.currentSong?.id === song.id">
            <PlayOutline />
          </n-icon>
          <span v-else>{{ index + 1 }}</span>
        </span>

        <span class="queue-cover">
          <img
            v-if="song.album?.picUrl"
            :src="song.album.picUrl"
            :alt="song.name"
            referrerpolicy="no-referrer"
          />
          <n-icon v-else><MusicalNotesOutline /></n-icon>
        </span>

        <span class="queue-copy">
          <span class="queue-name">{{ song.name }}</span>
          <span class="queue-artist">{{ song.artists?.map(artist => artist.name).join(' / ') }}</span>
        </span>

        <span class="queue-remove" @click.stop>
          <n-button text type="error" size="small" @click="musicStore.removeFromPlaylist(song.id)">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
          </n-button>
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
