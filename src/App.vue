<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import GlobalMvPlayer from '@/components/GlobalMvPlayer.vue'
import SchemaOrg from '@/components/seo/SchemaOrg.vue'
import LiquidGlassFilter from '@/components/LiquidGlassFilter.vue'
</script>

<template>
  <!-- 🧊 全局 SVG 滤镜定义 (Liquid Glass) -->
  <LiquidGlassFilter />
  <n-message-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <!-- ✅ 结构化数据 (SEO) -->
        <SchemaOrg />
        <RouterView />
        <!-- ✅ 全局 MV 播放器 -->
        <GlobalMvPlayer />
      </n-notification-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>
