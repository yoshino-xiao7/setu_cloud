<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import GlobalMvPlayer from '@/components/GlobalMvPlayer.vue'
</script>

<template>
  <n-message-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <RouterView />
        <!-- ✅ 全局 MV 播放器 -->
        <GlobalMvPlayer />
      </n-notification-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>
