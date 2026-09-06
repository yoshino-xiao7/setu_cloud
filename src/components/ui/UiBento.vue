<script setup lang="ts">
withDefaults(defineProps<{ singleColumn?: boolean }>(), { singleColumn: false })
</script>

<template>
  <div class="bento" :class="{ 'bento--single': singleColumn }">
    <slot />
  </div>
</template>
