<script setup lang="ts" generic="T">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  items: T[]
  minCardWidth?: number
  loading?: boolean
  empty?: string
  itemKey?: (item: T, index: number) => string | number
  error?: string
}>(), { minCardWidth: 320, loading: false, empty: '暂无记录' })
const minimum = computed(() => Number.isFinite(props.minCardWidth) && props.minCardWidth > 0 ? props.minCardWidth : 320)
</script>

<template>
  <section class="record-board" :style="{ '--min': `${minimum}px` }" :aria-busy="loading">
    <div v-if="$slots.filters" class="record-board__filters">
      <slot name="filters" />
    </div>
    <div v-if="error" class="board__error" role="alert">
      <slot name="error">
        {{ error }}
      </slot>
    </div>
    <div v-if="loading && !items.length" class="record-board__grid" role="status" aria-label="正在加载记录">
      <div v-for="index in 4" :key="index" class="record board__skeleton" aria-hidden="true" />
    </div>
    <div v-else-if="items.length" class="record-board__grid">
      <div v-for="(item, index) in items" :key="itemKey?.(item, index) ?? index" class="record-board__item">
        <slot :item="item" :index="index">
          <slot name="item" :item="item" :index="index" />
        </slot>
      </div>
    </div>
    <div v-else-if="!error" class="board__empty" role="status">
      <slot name="empty">
        {{ empty }}
      </slot>
    </div>
    <footer v-if="$slots.footer" class="record-board__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>
