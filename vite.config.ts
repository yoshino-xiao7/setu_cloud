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
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vendor-vue'
          if (id.includes('@vicons')) return 'vendor-icons'
          if (id.includes('naive-ui')) {
            if (id.includes('/data-table') || id.includes('/pagination')) return 'vendor-naive-table'
            if (id.includes('/modal') || id.includes('/dialog') || id.includes('/drawer')) return 'vendor-naive-overlay'
            if (id.includes('/form') || id.includes('/input') || id.includes('/select')) return 'vendor-naive-form'
            return 'vendor-naive-core'
          }
          if (id.includes('echarts') || id.includes('vue-echarts')) return 'vendor-charts'
          if (id.includes('crypto-js') || id.includes('qrcode') || id.includes('html2canvas')) return 'vendor-tools'
        }
      }
    }
  }
})
