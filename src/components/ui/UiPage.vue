<script setup lang="ts">
// 页面容器原语：等价于手写 <div class="ui-page">。
// 样式来自 src/styles/liquid-glass.css，本组件不新增任何视觉规则。
// 额外 class 会通过 attrs 自动合并（如 `page-container`）。
</script>

<template>
  <div class="ui-page">
    <slot />
  </div>
</template>
