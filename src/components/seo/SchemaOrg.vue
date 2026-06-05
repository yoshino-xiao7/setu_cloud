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
  'name': '雪涼云API',
  'alternateName': '雪涼云',
  'url': BASE_URL,
  'description': '高质量图片API服务平台，提供随机图片获取、收藏夹管理、积分系统等功能。',
  'inLanguage': 'zh-CN',
  'potentialAction': {
    '@type': 'SearchAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': `${BASE_URL}/dashboard/square?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  }
}))

// Organization Schema - 组织/品牌信息
const organizationSchema = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': '雪涼云',
  'url': BASE_URL,
  'logo': `${BASE_URL}/og-image.png`,
  'sameAs': [],
  'contactPoint': {
    '@type': 'ContactPoint',
    'contactType': 'customer service',
    'availableLanguage': ['Chinese']
  }
}))

// WebApplication Schema - API 服务描述
const webAppSchema = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': '雪涼云API',
  'applicationCategory': 'DeveloperApplication',
  'operatingSystem': 'All',
  'description': '为开发者提供高质量图片API服务，支持RESTful API接入，积分制调用。',
  'url': BASE_URL,
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'CNY',
    'description': '免费注册，积分制使用'
  },
  'aggregateRating': {
    '@type': 'AggregateRating',
    'ratingValue': '4.8',
    'ratingCount': '100',
    'bestRating': '5',
    'worstRating': '1'
  },
  'featureList': [
    '随机图片API',
    '收藏夹管理',
    '积分系统',
    '开发者文档',
    'API Key管理'
  ]
}))

// 使用 useHead 注入结构化数据
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: websiteSchema
    },
    {
      type: 'application/ld+json',
      children: organizationSchema
    },
    {
      type: 'application/ld+json',
      children: webAppSchema
    }
  ]
})
</script>

<template>
  <!-- 此组件仅用于注入结构化数据，无需渲染任何内容 -->
</template>
