<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
</script>

<template>
  <n-message-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <RouterView />
      </n-notification-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>
