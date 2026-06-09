<script setup lang="ts">
import { NDialogProvider, NMessageProvider, NNotificationProvider, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
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
  },
}

// ✅ 仅在公开页面（landing、404等）渲染 SchemaOrg，已登录页面无需 SEO 结构化数据
const route = useRoute()
const isPublicPage = computed(() => !!route.meta.public)
</script>

<template>
  <!-- 🧊 全局 SVG 滤镜定义 (Liquid Glass) -->
  <LiquidGlassFilter />
  <NMessageProvider>
    <component :is="GlobalErrorListener" />
    <NDialogProvider>
      <NNotificationProvider>
        <!-- ✅ 结构化数据 (SEO) - 仅在公开页面渲染 -->
        <SchemaOrg v-if="isPublicPage" />
        <RouterView />
      </NNotificationProvider>
    </NDialogProvider>
  </NMessageProvider>
</template>
