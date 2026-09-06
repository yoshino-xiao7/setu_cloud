<script setup lang="ts">
import { darkTheme, NConfigProvider, useOsTheme } from 'naive-ui'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ spacing?: number, inset?: number }>(), { spacing: 20, inset: 16 })
const osTheme = useOsTheme()
</script>

<template>
  <NConfigProvider :theme="osTheme === 'dark' ? darkTheme : null" abstract>
    <div v-bind="$attrs" class="board" :style="{ '--board-gap': `${spacing}px`, '--board-inset': `${inset}px` }">
      <slot name="header" />
      <slot />
      <div v-if="$slots.dock" class="board__dock">
        <slot name="dock" />
      </div>
    </div>
  </NConfigProvider>
</template>
