<!-- src/components/seo/SchemaOrg.vue -->
<script setup lang="ts">
import { useHead } from '@vueuse/head'
import { computed } from 'vue'
import { SITE_URL } from '@/api/env'

const BASE_URL = SITE_URL

// WebSite Schema - 全站基本信息
const websiteSchema = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': '雪涼云',
  'alternateName': ['雪凉云', '雪涼云API', 'Xueliang Cloud', 'Setu Cloud'],
  'url': BASE_URL,
  'description': '雪涼云提供图片 API、音乐 API、公开收藏夹、积分调用和开发文档，是面向开发者与 bot 项目的轻量云服务控制台。',
  'inLanguage': 'zh-CN',
}))

// Organization Schema - 组织/品牌信息
const organizationSchema = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': '雪涼云',
  'alternateName': ['雪凉云', 'Xueliang Cloud', 'Setu Cloud'],
  'url': BASE_URL,
  'logo': `${BASE_URL}/og-image.webp`,
  'sameAs': ['https://space.bilibili.com/1042630900'],
  'contactPoint': {
    '@type': 'ContactPoint',
    'contactType': 'customer service',
    'availableLanguage': ['Chinese'],
  },
}))

// WebApplication Schema - API 服务描述
const webAppSchema = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': '雪涼云 API',
  'alternateName': ['雪凉云 API', '雪涼云API', 'Xueliang Cloud API', 'Setu Cloud API'],
  'applicationCategory': 'DeveloperApplication',
  'operatingSystem': 'All',
  'description': '雪涼云 API 为开发者提供图片 API 与音乐 API，支持 RESTful API 接入、积分制调用和公开收藏夹分享。',
  'url': BASE_URL,
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'CNY',
    'description': '免费注册，积分制使用',
  },
  'featureList': [
    '随机图片API',
    '收藏夹管理',
    '积分系统',
    '开发者文档',
    'API Key管理',
  ],
}))

// 使用 useHead 注入结构化数据
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: websiteSchema,
    },
    {
      type: 'application/ld+json',
      children: organizationSchema,
    },
    {
      type: 'application/ld+json',
      children: webAppSchema,
    },
  ],
})
</script>

<template>
  <span class="schema-org-sentinel" aria-hidden="true" />
</template>

<style scoped>
.schema-org-sentinel {
  display: none;
}
</style>
