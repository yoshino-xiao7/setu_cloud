<script setup lang="ts">
import { NDialogProvider, NMessageProvider, NNotificationProvider, useMessage } from 'naive-ui'
import { onMounted, onUnmounted } from 'vue'
import LiquidGlassFilter from '@/components/LiquidGlassFilter.vue'
import SchemaOrg from '@/components/seo/SchemaOrg.vue'

// ✅ 全局错误监听器（必须在 NMessageProvider 内部）
const GlobalErrorListener = {
  setup() {
    const message = useMessage()
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      message.error(detail?.message || '页面出现异常，请刷新重试', { duration: 5000 })
    }
    onMounted(() => window.addEventListener('global-app-error', handler))
    onUnmounted(() => window.removeEventListener('global-app-error', handler))
    return () => null
  }
}
</script>

<template>
  <!-- 🧊 全局 SVG 滤镜定义 (Liquid Glass) -->
  <LiquidGlassFilter />
  <NMessageProvider>
    <component :is="GlobalErrorListener" />
    <NDialogProvider>
      <NNotificationProvider>
        <!-- ✅ 结构化数据 (SEO) -->
        <SchemaOrg />
        <RouterView />
      </NNotificationProvider>
    </NDialogProvider>
  </NMessageProvider>
</template>
