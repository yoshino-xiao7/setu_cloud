<script setup lang="ts">
import { computed } from 'vue'
import MascotDuoGlyph from '@/components/sidebar-icons/MascotDuoGlyph.vue'
import StickerShell from '@/components/sidebar-icons/StickerShell.vue'

const props = defineProps<{
  name: string
}>()

const toneMap: Record<string, string> = {
  admin: 'violet',
  book: 'blue',
  cloud: 'blue',
  coin: 'gold',
  delete: 'rose',
  folder: 'mint',
  grid: 'blue',
  heartFolder: 'rose',
  history: 'violet',
  imageSearch: 'mint',
  key: 'gold',
  mascots: 'pink',
  music: 'violet',
  musicKey: 'violet',
  playlist: 'blue',
  pulse: 'mint',
  receipt: 'blue',
  searchNote: 'pink',
  shield: 'blue',
  store: 'mint',
  users: 'pink',
  wish: 'gold',
}

const tone = computed(() => toneMap[props.name] || 'pink')
</script>

<template>
  <StickerShell :name="name" :tone="tone">
    <MascotDuoGlyph v-if="name === 'mascots'" />

    <svg v-else class="symbol" viewBox="0 0 32 32" fill="none">
      <g v-if="name === 'key'">
        <circle cx="11" cy="14" r="4.5" />
        <path d="M15 14h10M22 14v4M18.5 14v3" />
        <path class="accent-fill" d="M8.4 8.6 10 6l1.6 2.6L14.5 10l-2.9 1.4L10 14l-1.6-2.6L5.5 10z" />
      </g>

      <g v-else-if="name === 'coin'">
        <circle class="soft-fill" cx="16" cy="17" r="8.5" />
        <path d="M16 9v16M10.5 14.5c1.3-2.1 4.6-2.8 7.1-1.5 2.6 1.3 3.5 4.3.3 5.4-2.8 1-5.3.2-6.9 2.1" />
        <path class="accent-fill" d="M20 5.5 21.2 8l2.8 1-2.8 1-1.2 2.5L18.8 10 16 9l2.8-1z" />
      </g>

      <g v-else-if="name === 'wish'">
        <path class="soft-fill" d="M16 5.5 19.1 12l7.1.9-5.1 4.9 1.3 7-6.4-3.4-6.4 3.4 1.3-7-5.1-4.9 7.1-.9z" />
        <path d="M16 5.5 19.1 12l7.1.9-5.1 4.9 1.3 7-6.4-3.4-6.4 3.4 1.3-7-5.1-4.9 7.1-.9z" />
      </g>

      <g v-else-if="name === 'receipt'">
        <path class="soft-fill" d="M9 6.5h14v19l-2.4-1.5-2.3 1.5-2.3-1.5-2.3 1.5-2.3-1.5L9 25.5z" />
        <path d="M9 6.5h14v19l-2.4-1.5-2.3 1.5-2.3-1.5-2.3 1.5-2.3-1.5L9 25.5zM12.5 12h7M12.5 16h7M12.5 20h4.5" />
      </g>

      <g v-else-if="name === 'heartFolder' || name === 'folder'">
        <path class="soft-fill" d="M5.5 10h8l2 2.2h11v11.3a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2z" />
        <path d="M5.5 10h8l2 2.2h11v11.3a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2z" />
        <path v-if="name === 'heartFolder'" class="accent-fill" d="M16 22.5s-5-2.8-5-6.2c0-1.5 1-2.7 2.5-2.7 1 0 1.9.6 2.5 1.4.6-.8 1.5-1.4 2.5-1.4 1.5 0 2.5 1.2 2.5 2.7 0 3.4-5 6.2-5 6.2z" />
        <path v-else d="M11 17h10M11 20.5h6" />
      </g>

      <g v-else-if="name === 'grid'">
        <rect class="soft-fill" x="7" y="7" width="7" height="7" rx="2" />
        <rect class="soft-fill" x="18" y="7" width="7" height="7" rx="2" />
        <rect class="soft-fill" x="7" y="18" width="7" height="7" rx="2" />
        <rect class="soft-fill" x="18" y="18" width="7" height="7" rx="2" />
        <path d="M9 7h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM20 7h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM9 18h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2ZM20 18h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Z" />
      </g>

      <g v-else-if="name === 'music' || name === 'searchNote' || name === 'playlist' || name === 'history'">
        <template v-if="name === 'history'">
          <path class="soft-fill" d="M16 7a9 9 0 1 1-7.1 3.5" />
          <path d="M16 7a9 9 0 1 1-7.1 3.5M8 7.5v4h4M16 11.5V17l3.8 2.3" />
        </template>
        <template v-else-if="name === 'playlist'">
          <path class="soft-fill" d="M8 8h16v16H8z" />
          <path d="M10 11h9M10 15h9M10 19h6M21 17v6M21 23a2.5 2.5 0 1 1-2.5-2.5H21" />
        </template>
        <path v-else d="M20 7v14.5a3 3 0 1 1-2-2.8V10l-8 1.7v11.8a3 3 0 1 1-2-2.8V10z" />
        <path v-if="name === 'searchNote'" d="M20.5 20.5 25 25M18.5 18.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      </g>

      <g v-else-if="name === 'book'">
        <path class="soft-fill" d="M7 7h8.5c1.4 0 2.5 1.1 2.5 2.5V25c0-1.4-1.1-2.5-2.5-2.5H7z" />
        <path class="soft-fill" d="M25 7h-7c-1.4 0-2.5 1.1-2.5 2.5V25c0-1.4 1.1-2.5 2.5-2.5h7z" />
        <path d="M7 7h8.5c1.4 0 2.5 1.1 2.5 2.5V25c0-1.4-1.1-2.5-2.5-2.5H7zM25 7h-7c-1.4 0-2.5 1.1-2.5 2.5V25c0-1.4 1.1-2.5 2.5-2.5h7zM11 12h3M20 12h2" />
      </g>

      <g v-else-if="name === 'delete'">
        <path class="soft-fill" d="M10 11h12l-1 14H11z" />
        <path d="M8 11h16M13 11V8h6v3M10 11l1 14h10l1-14M14 15v6M18 15v6" />
        <path class="accent-fill" d="M21.5 5.5 23 8l2.7.8-2.1 1.8.1 2.9-2.2-1.5-2.2 1.5.1-2.9-2.1-1.8L20 8z" />
      </g>

      <g v-else-if="name === 'admin' || name === 'shield'">
        <path class="soft-fill" d="M16 5.5 25 9v6.8c0 5-3.6 9.4-9 10.7-5.4-1.3-9-5.7-9-10.7V9z" />
        <path d="M16 5.5 25 9v6.8c0 5-3.6 9.4-9 10.7-5.4-1.3-9-5.7-9-10.7V9z" />
        <path v-if="name === 'admin'" d="M12 16.2 15 19l5.5-6" />
        <path v-else d="M12.5 14.5h7M16 11v11" />
      </g>

      <g v-else-if="name === 'users'">
        <circle class="soft-fill" cx="12.5" cy="13" r="4" />
        <circle class="soft-fill" cx="20.5" cy="13" r="3.4" />
        <path d="M6.5 24c.9-4 3-6 6-6s5.1 2 6 6M17.5 18.7c2.5.3 4.4 2.1 5.2 5.3M12.5 9a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM20.5 9.6a3.4 3.4 0 1 1 0 6.8" />
      </g>

      <g v-else-if="name === 'musicKey'">
        <path d="M19 7v10.5a2.8 2.8 0 1 1-1.9-2.6V10l-7 1.5" />
        <circle cx="11" cy="21" r="3.3" />
        <path d="M14 21h9M21 21v3M17.5 21v2.5" />
      </g>

      <g v-else-if="name === 'cloud'">
        <path class="soft-fill" d="M11 23h11a5 5 0 0 0 .7-10A7 7 0 0 0 9.4 14.5 4.4 4.4 0 0 0 11 23Z" />
        <path d="M11 23h11a5 5 0 0 0 .7-10A7 7 0 0 0 9.4 14.5 4.4 4.4 0 0 0 11 23ZM16 12v8M12.8 16.8 16 20l3.2-3.2" />
      </g>

      <g v-else-if="name === 'imageSearch'">
        <rect class="soft-fill" x="6" y="8" width="17" height="14" rx="3" />
        <path d="M6 11a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v8M9 19l4-4 3 3 2-2 3 3M11 12.5h.1" />
        <circle cx="20.5" cy="20.5" r="4" />
        <path d="M23.5 23.5 27 27" />
      </g>

      <g v-else-if="name === 'pulse'">
        <path class="soft-fill" d="M7 9h18v14H7z" />
        <path d="M7 9h18v14H7zM10 17h3l2-5 3 9 2-4h2" />
      </g>

      <g v-else-if="name === 'store'">
        <path class="soft-fill" d="M8 14h16v11H8z" />
        <path d="M8 14h16v11H8zM6 9h20l-2 5H8zM12 25v-6h8v6" />
      </g>

      <g v-else>
        <circle class="soft-fill" cx="16" cy="16" r="8" />
        <path d="M16 8v16M8 16h16" />
      </g>
    </svg>
  </StickerShell>
</template>

<style scoped>
.symbol {
  position: relative;
  z-index: 2;
  width: 22px;
  height: 22px;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.soft-fill {
  fill: var(--sticker-soft);
}

.accent-fill {
  fill: var(--sticker-accent);
  stroke: var(--sticker-line);
}
</style>
