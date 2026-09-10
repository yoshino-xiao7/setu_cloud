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
  'name': '亦可',
  'alternateName': ['YK', '亦可 YK'],
  'url': BASE_URL,
  'description': '亦可 YK 是集图片浏览、AI 绘画、音乐播放与收藏分享于一体的个人内容与创作空间，也提供图片和音乐 API。',
  'inLanguage': 'zh-CN',
}))

// Organization Schema - 组织/品牌信息
const organizationSchema = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': '亦可',
  'alternateName': ['YK', '亦可 YK'],
  'url': BASE_URL,
  'logo': `${BASE_URL}/yike-icon.png`,
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
  'name': '亦可 YK',
  'alternateName': ['亦可', 'YK'],
  'applicationCategory': 'MultimediaApplication',
  'operatingSystem': 'All',
  'description': '亦可 API 为开发者提供图片 API 与音乐 API，支持 RESTful API 接入、积分制调用和公开收藏夹分享。',
  'url': BASE_URL,
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'CNY',
    'description': '免费注册，积分制使用',
  },
  'featureList': [
    '图片浏览',
    'AI 绘画',
    '音乐播放',
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
