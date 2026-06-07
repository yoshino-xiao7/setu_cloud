// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 500,
    esbuild: {
      drop: ['console', 'debugger']
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const normalizedId = id.replaceAll('\\', '/')
          if (
            normalizedId.includes('/node_modules/vue/') ||
            normalizedId.includes('/node_modules/@vue/') ||
            normalizedId.includes('/node_modules/vue-router/') ||
            normalizedId.includes('/node_modules/pinia/') ||
            normalizedId.includes('/node_modules/@vueuse/')
          ) return 'vendor-vue'
          if (normalizedId.includes('/node_modules/@vicons/')) return 'vendor-icons'
          if (normalizedId.includes('/node_modules/echarts/') || normalizedId.includes('/node_modules/vue-echarts/')) return 'vendor-charts'
          if (id.includes('crypto-js')) return 'vendor-crypto'
          if (id.includes('qrcode') || id.includes('html2canvas')) return 'vendor-tools'
        }
      }
    }
  }
})
