<script setup lang="ts">
import { ChatboxOutline, MusicalNotesOutline } from '@vicons/ionicons5'
import { NEmpty, NIcon } from 'naive-ui'
import { computed, nextTick, ref, watch } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const lyricsListRef = ref<HTMLElement | null>(null)

const artistText = computed(() =>
  musicStore.currentSong?.artists?.map(artist => artist.name).join(' / ') || '未知艺术家',
)

function seekTo(time: number) {
  musicStore.seek(time)
}

function scrollToActiveLine() {
  nextTick(() => {
    const container = lyricsListRef.value
    const line = container?.querySelector<HTMLElement>('.lyric-line.active')
    if (!container || !line)
      return

    const targetTop = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    })
  })
}

watch(() => musicStore.currentLyricIndex, () => {
  scrollToActiveLine()
})
</script>

<template>
  <section class="lyrics-panel ui-card">
    <div class="panel-header">
      <div>
        <h3>歌词</h3>
        <p v-if="musicStore.currentSong">
          {{ musicStore.currentSong.name }} - {{ artistText }}
        </p>
        <p v-else>
          播放歌曲后显示歌词
        </p>
      </div>
      <NIcon size="22" color="#f586a9">
        <ChatboxOutline />
      </NIcon>
    </div>

    <div v-if="!musicStore.currentSong" class="lyrics-empty">
      <NEmpty description="还没有正在播放的歌曲">
        <template #icon>
          <NIcon><MusicalNotesOutline /></NIcon>
        </template>
      </NEmpty>
    </div>

    <div v-else-if="musicStore.lyrics.length === 0" class="lyrics-empty">
      <NEmpty description="暂无歌词" />
    </div>

    <div v-else ref="lyricsListRef" class="lyrics-list">
      <button
        v-for="(line, index) in musicStore.lyrics"
        :key="`${line.time}-${index}`"
        class="lyric-line"
        :class="{ active: index === musicStore.currentLyricIndex }"
        type="button"
        @click="seekTo(line.time)"
      >
        {{ line.text }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.lyrics-panel {
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

.lyrics-empty {
  display: grid;
  min-height: 190px;
  place-items: center;
}

.lyrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 430px;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 8px 2px;
  scrollbar-gutter: stable;
}

.lyric-line {
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.6;
  padding: 8px 10px;
  text-align: center;
}

.lyric-line:hover {
  background: rgba(245, 134, 169, 0.08);
}

.lyric-line.active {
  background: rgba(245, 134, 169, 0.14);
  color: #f26d99;
  font-weight: 700;
}

@media (max-width: 768px) {
  .lyrics-panel {
    padding: 14px;
  }

  .lyrics-list {
    max-height: 300px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lyric-line {
    transition: none;
  }
}
</style>
