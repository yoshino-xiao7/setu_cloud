<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const GlobalMvPlayer = defineAsyncComponent(() => import('@/components/GlobalMvPlayer.vue'))
</script>

<template>
  <GlobalMvPlayer />
</template>
