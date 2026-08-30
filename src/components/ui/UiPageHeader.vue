<script setup lang="ts">
// 页头原语：等价于手写 <div class="ui-page-header"> + 标题/副标题结构。
// 样式来自 src/styles/liquid-glass.css（.ui-page-header / .ui-page-title / .ui-page-subtitle）。
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="ui-page-header">
    <div>
      <h2 class="ui-page-title">
        <slot name="title">
          {{ title }}
        </slot>
      </h2>
      <p v-if="$slots.subtitle || subtitle" class="ui-page-subtitle">
        <slot name="subtitle">
          {{ subtitle }}
        </slot>
      </p>
    </div>
    <slot name="actions" />
  </div>
</template>
