<script setup lang="ts">
// 统计卡原语：等价于手写 <div class="ui-card ui-stat-card">。
// 样式来自 src/styles/liquid-glass.css；卡内布局沿用各页现有结构（经 default slot 传入）。
</script>

<template>
  <div class="ui-card ui-stat-card">
    <slot />
  </div>
</template>
