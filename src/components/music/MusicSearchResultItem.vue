<script setup lang="ts">
import type { Song } from '@/api/music'
import {
  AddCircleOutline,
  DownloadOutline,
  ListOutline,
  MusicalNotesOutline,
  PlayCircleOutline,
  VideocamOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
} from 'naive-ui'
import { formatDuration } from '@/utils/dateFormat'
import LikeButton from './LikeButton.vue'

defineProps<{
  active: boolean
  song: Song
}>()

const emit = defineEmits<{
  addToPlaylist: [song: Song]
  addToQueue: [song: Song]
  download: [song: Song]
  play: [song: Song]
  playMv: [song: Song]
}>()
</script>

<template>
  <div class="song-item ui-card ui-card-hover" :class="{ active }">
    <div class="song-cover">
      <img
        v-if="song.album?.picUrl"
        :src="song.album.picUrl"
        :alt="song.name"
        referrerpolicy="no-referrer"
        loading="lazy"
        decoding="async"
      >
      <div v-else class="cover-placeholder">
        <NIcon size="32" color="#999">
          <MusicalNotesOutline />
        </NIcon>
      </div>
    </div>

    <div class="song-info">
      <div class="song-name">
        {{ song.name }}
      </div>
      <div class="song-meta">
        <span class="artist">{{ song.artists?.map(a => a.name).join(' / ') || '未知' }}</span>
        <span class="separator">·</span>
        <span class="album">{{ song.album?.name || '未知专辑' }}</span>
      </div>
    </div>

    <div class="song-duration">
      {{ formatDuration(song.duration) }}
    </div>

    <div class="song-actions">
      <LikeButton :id="song.id" />
      <NButton
        circle
        secondary
        type="primary"
        title="播放"
        @click="emit('play', song)"
      >
        <template #icon>
          <NIcon><PlayCircleOutline /></NIcon>
        </template>
      </NButton>

      <NButton
        circle
        secondary
        type="info"
        title="添加到播放列表"
        @click="emit('addToQueue', song)"
      >
        <template #icon>
          <NIcon><ListOutline /></NIcon>
        </template>
      </NButton>

      <NButton
        circle
        secondary
        type="success"
        title="添加到歌单"
        @click="emit('addToPlaylist', song)"
      >
        <template #icon>
          <NIcon><AddCircleOutline /></NIcon>
        </template>
      </NButton>

      <NButton
        circle
        secondary
        title="下载"
        class="download-btn"
        @click="emit('download', song)"
      >
        <template #icon>
          <NIcon><DownloadOutline /></NIcon>
        </template>
      </NButton>

      <NButton
        v-if="song.mv && song.mv !== '0'"
        circle
        secondary
        type="warning"
        title="播放 MV"
        @click="emit('playMv', song)"
      >
        <template #icon>
          <NIcon><VideocamOutline /></NIcon>
        </template>
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.song-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
}

.song-item:hover {
  transform: translateY(-2px);
}

.song-item.active {
  background: rgba(255, 245, 248, 0.96);
  border-color: rgba(245, 134, 169, 0.3);
}

.song-cover {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  overflow: hidden;
  background: #f3f4f6;
  border-radius: 8px;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  margin-bottom: 6px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ui-muted);
}

.separator {
  color: #d1d5db;
}

.song-duration {
  margin-right: 16px;
  font-size: 14px;
  color: #6b7280;
}

.song-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .song-duration {
    display: none;
  }

  .song-item {
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
  }

  .song-cover {
    width: 48px;
    height: 48px;
  }

  .song-info {
    flex: 1;
    min-width: 120px;
  }

  .song-name {
    font-size: 14px;
  }

  .song-meta {
    font-size: 12px;
  }

  .song-actions {
    justify-content: space-around;
    width: 100%;
    gap: 4px;
  }

  .song-actions .n-button {
    flex: 1;
    max-width: 40px;
  }
}
</style>
