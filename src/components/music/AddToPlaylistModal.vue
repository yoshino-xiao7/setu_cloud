<script setup lang="ts">
import type { Song, UserPlaylist } from '@/api/music'
import {
  AddOutline,
  AlbumsOutline,
  MusicalNotesOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NIcon,
  NList,
  NListItem,
  NModal,
  NSkeleton,
} from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  loading: boolean
  playlists: UserPlaylist[]
  selectedSong: Song | null
  show: boolean
}>()

const emit = defineEmits<{
  'create': []
  'selectPlaylist': [playlistId: string]
  'update:show': [value: boolean]
}>()

const showValue = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})
</script>

<template>
  <NModal
    v-model:show="showValue"
    preset="dialog"
    title="添加到歌单"
    positive-text="关闭"
    :show-icon="false"
  >
    <div class="add-to-playlist-dialog">
      <div v-if="selectedSong" class="selected-song-info">
        <NIcon size="20" color="#f586a9">
          <MusicalNotesOutline />
        </NIcon>
        <span>{{ selectedSong.name }} - {{ selectedSong.artists.map(a => a.name).join('/') }}</span>
      </div>

      <div v-if="loading" class="playlist-loading">
        <NSkeleton height="60px" :repeat="3" />
      </div>

      <div v-else-if="playlists.length === 0" class="empty-playlist">
        <NEmpty description="还没有歌单">
          <template #extra>
            <NButton type="primary" @click="emit('create')">
              <template #icon>
                <NIcon><AddOutline /></NIcon>
              </template>
              创建新歌单
            </NButton>
          </template>
        </NEmpty>
      </div>

      <div v-else>
        <NButton
          block
          dashed
          class="create-playlist-button"
          @click="emit('create')"
        >
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          创建新歌单
        </NButton>

        <NList hoverable clickable>
          <NListItem
            v-for="playlist in playlists"
            :key="playlist.id"
            @click="emit('selectPlaylist', playlist.id)"
          >
            <template #prefix>
              <NIcon size="24" color="#f586a9">
                <AlbumsOutline />
              </NIcon>
            </template>
            <div class="playlist-item-content">
              <div class="playlist-item-name">
                {{ playlist.name }}
              </div>
              <div class="playlist-item-meta">
                {{ playlist.songCount }} 首歌曲
              </div>
            </div>
          </NListItem>
        </NList>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.add-to-playlist-dialog {
  margin-top: 16px;
}

.selected-song-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  background: rgba(245, 134, 169, 0.1);
  border-radius: 8px;
}

.playlist-loading {
  padding: 20px;
}

.empty-playlist {
  padding: 20px;
  text-align: center;
}

.create-playlist-button {
  margin-bottom: 12px;
}

.playlist-item-content {
  flex: 1;
}

.playlist-item-name {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.playlist-item-meta {
  font-size: 13px;
  color: #6b7280;
}
</style>
