import type { MaybeRefOrGetter } from 'vue'
// src/composables/useSeo.ts
import { useHead } from '@vueuse/head'
import { computed, toValue } from 'vue'
import { useRoute } from 'vue-router'
import { SITE_URL } from '@/api/env'

interface SeoOptions {
  title?: MaybeRefOrGetter<string>
  description?: MaybeRefOrGetter<string>
  keywords?: MaybeRefOrGetter<string>
  image?: MaybeRefOrGetter<string>
  url?: MaybeRefOrGetter<string>
  type?: MaybeRefOrGetter<'website' | 'article' | 'profile'>
}

const BASE_URL = SITE_URL
const SITE_NAME = '雪涼云API'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.webp`
const DEFAULT_DESCRIPTION = '雪涼云API提供高质量的图片API服务，支持随机图片获取、收藏夹管理、积分系统等功能。简单易用的API接口，快速接入您的项目。'

/**
 * 统一的 SEO 管理 composable
 * 自动设置 title, description, canonical, og 等 meta 标签
 */
export function useSeo(options: SeoOptions = {}) {
  const route = useRoute()

  // 从路由 meta 获取默认值，支持动态覆盖
  const title = computed(() => {
    const pageTitle = toValue(options.title) || (route.meta.title as string) || SITE_NAME
    return pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} | ${SITE_NAME}`
  })

  const description = computed(() => {
    return toValue(options.description) || (route.meta.description as string) || DEFAULT_DESCRIPTION
  })

  const canonicalUrl = computed(() => {
    return toValue(options.url) || `${BASE_URL}${route.path}`
  })

  const ogImage = computed(() => {
    return toValue(options.image) || DEFAULT_IMAGE
  })

  const ogType = computed(() => {
    return toValue(options.type) || 'website'
  })

  const keywords = computed(() => {
    return toValue(options.keywords) || 'API, 图片API, 随机图片, 云服务, 雪涼云, setu, setu api, 网易云, 网易云音乐, 网易云音乐API'
  })

  useHead({
    title,
    meta: [
      // 基础 SEO
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },

      // Canonical
      { name: 'robots', content: 'index, follow' },

      // Open Graph
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: ogImage },
      { property: 'og:type', content: ogType },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'zh_CN' },

      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage },
    ],
    link: [
      { rel: 'canonical', href: canonicalUrl },
    ],
  })

  return {
    title,
    description,
    canonicalUrl,
    ogImage,
  }
}

/**
 * 为公开收藏夹页面设置 SEO（支持响应式参数）
 */
export function useCollectionSeo(collectionName: MaybeRefOrGetter<string>, imageCount: MaybeRefOrGetter<number>) {
  return useSeo({
    title: computed(() => `${toValue(collectionName)} - 公开收藏夹`),
    description: computed(() => `查看 ${toValue(collectionName)} 收藏夹，包含 ${toValue(imageCount)} 张精选图片。`),
    type: 'article',
  })
}

/**
 * 为用户主页设置 SEO（支持响应式参数）
 */
export function useUserProfileSeo(username: MaybeRefOrGetter<string>) {
  return useSeo({
    title: computed(() => `${toValue(username)} 的主页`),
    description: computed(() => `查看 ${toValue(username)} 在雪涼云的个人主页和公开收藏夹。`),
    type: 'profile',
  })
}
