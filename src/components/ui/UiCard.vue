<script setup lang="ts">
// 卡片原语：等价于手写 <div class="ui-card">，可选悬浮态。
// 样式来自 src/styles/liquid-glass.css（.ui-card / .ui-card-hover）。
defineProps<{
  /** 启用悬浮上浮 + 光晕（对应 ui-card-hover） */
  hover?: boolean
  /** 内边距（默认卡片无内边距，由页面自行控制） */
  padding?: string
}>()
</script>

<template>
  <div class="ui-card" :class="{ 'ui-card-hover': hover }" :style="padding ? { padding } : undefined">
    <slot />
  </div>
</template>
