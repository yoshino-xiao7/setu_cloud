<script setup lang="ts" generic="T">
withDefaults(defineProps<{
  items?: T[]
  itemKey?: (item: T, index: number) => string | number
  aspectRatio?: (item: T) => number
  loading?: boolean
  empty?: string
}>(), { items: () => [], empty: '暂无作品' })

function safeRatio(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1
}
</script>

<template>
  <div class="mosaic-board" :aria-busy="loading">
    <div v-if="loading && !items.length" class="mosaic" aria-label="正在加载作品" role="status">
      <div v-for="index in 6" :key="index" class="mosaic__item board__skeleton" :style="{ aspectRatio: index % 2 ? '0.75' : '1.2' }" aria-hidden="true" />
    </div>
    <div v-else-if="items.length" class="mosaic">
      <div v-for="(item, index) in items" :key="itemKey?.(item, index) ?? index" class="mosaic__item" :style="aspectRatio ? { '--mosaic-ratio': safeRatio(aspectRatio(item)) } : undefined">
        <slot name="item" :item="item" :index="index" />
      </div>
    </div>
    <div v-else-if="$slots.default" class="mosaic">
      <slot />
    </div>
    <div v-else class="board__empty" role="status">
      <slot name="empty">
        {{ empty }}
      </slot>
    </div>
    <slot name="footer" />
  </div>
</template>
