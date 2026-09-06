<script setup lang="ts">
withDefaults(defineProps<{ spacing?: number, inset?: number }>(), { spacing: 20, inset: 16 })
</script>

<template>
  <div class="board" :style="{ '--board-gap': `${spacing}px`, '--board-inset': `${inset}px` }">
    <slot name="header" />
    <slot />
    <div v-if="$slots.dock" class="board__dock">
      <slot name="dock" />
    </div>
  </div>
</template>
