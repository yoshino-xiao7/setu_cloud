import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
// vite.config.ts
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'
import { fetchPublicDynamicPages, toPrerenderPaths } from './scripts/publicPages'
import { musicRehearsalProxy } from './scripts/musicRehearsalProxy'

const ossVendorPackages = [
  'address',
  'agentkeepalive',
  'ali-oss',
  'bowser',
  'copy-to',
  'dateformat',
  'debug',
  'destroy',
  'end-or-error',
  'get-ready',
  'humanize-ms',
  'is-type-of',
  'js-base64',
  'jstoxml',
  'lodash',
  'merge-descriptors',
  'mime',
  'platform',
  'pump',
  'qs',
  'sdk-base',
  'stream-http',
  'stream-wormhole',
  'urllib',
  'utility',
  'xml2js',
]

// Clean release checkouts get immutable attribution automatically. Dirty/local builds fail admission safely.
const releaseVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string
let releaseBuild = 'unknown'
try {
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (!dirty && /^[a-f0-9]{40}$/.test(revision)) releaseBuild = revision
} catch { /* Source archives without Git remain explicitly unknown. */ }

export default defineConfig(({ mode }) => ({
  server: { proxy: musicRehearsalProxy(mode) },
  preview: { proxy: musicRehearsalProxy(mode) },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(releaseVersion),
    'import.meta.env.VITE_WEB_BUILD_ID': JSON.stringify(releaseBuild),
  },
  plugins: [
    vue(),
    // 构建时生成 gzip 和 brotli 预压缩文件，供支持静态资源的服务器直接分发
    compression([
      { algorithm: 'gzip', threshold: 10240 },
      { algorithm: 'brotliCompress', threshold: 10240 },
    ]),
  ],
  // vite-ssg 预渲染配置：公开静态路由 + 动态分享页（/c/:id、/user/:userId）
  ssgOptions: {
    // 输出 /docs/index.html 目录结构，静态托管可直接命中
    dirStyle: 'nested',
    includedRoutes: async () => {
      const staticPaths = [
        '/',
        '/docs',
        '/status',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
      ]
      // 动态分享页枚举失败时降级为仅静态路由，不阻塞构建
      const dynamicPages = await fetchPublicDynamicPages()
      return [...staticPaths, ...toPrerenderPaths(dynamicPages)]
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // SSG 构建在 Node 下运行：CJS 依赖必须打进 SSR bundle，
  // 否则 Node 无法识别其 named exports（naive-ui 依赖链为主）
  ssr: {
    noExternal: [
      'naive-ui',
      'vueuc',
      'css-render',
      '@css-render/vue3-ssr',
      '@css-render/plugin-bem',
      'seemly',
      'vooks',
      'vdirs',
      'treemate',
      'evtd',
      'async-validator',
      'highlight.js',
      'lodash',
      'date-fns',
      '@vicons/ionicons5',
      'crypto-js',
      'qrcode',
      'html-to-image',
      'vue-echarts',
      'echarts',
    ],
  },
  build: {
    chunkSizeWarningLimit: 500,
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules'))
            return
          const normalizedId = id.replaceAll('\\', '/')
          if (
            normalizedId.includes('/node_modules/vue/')
            || normalizedId.includes('/node_modules/@vue/')
            || normalizedId.includes('/node_modules/vue-router/')
            || normalizedId.includes('/node_modules/pinia/')
            || normalizedId.includes('/node_modules/@vueuse/')
          ) {
            return 'vendor-vue'
          }
          if (normalizedId.includes('/node_modules/@vicons/'))
            return 'vendor-icons'
          if (normalizedId.includes('/node_modules/echarts/') || normalizedId.includes('/node_modules/vue-echarts/'))
            return 'vendor-charts'
          if (id.includes('crypto-js'))
            return 'vendor-crypto'
          if (id.includes('qrcode'))
            return 'vendor-qrcode'
          if (id.includes('html-to-image'))
            return 'vendor-html-to-image'
          if (ossVendorPackages.some(pkg => normalizedId.includes(`/node_modules/${pkg}/`)))
            return 'vendor-oss'
        },
      },
    },
  },
}))
