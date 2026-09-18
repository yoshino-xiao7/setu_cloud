<!-- eslint-disable style/max-statements-per-line -->
<script setup lang="ts">
import type { QqSpaceStory } from '@/api/qqSpace'
import { BookOutline } from '@vicons/ionicons5'
import { NEmpty, NIcon, NSpin, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchQqStories } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const router = useRouter(); const message = useMessage(); const loading = ref(false); const stories = ref<QqSpaceStory[]>([])
async function load() {
  loading.value = true; try { stories.value = unwrapApiData(await fetchQqStories({ pageSize: 50 }), []) }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载故事失败')
  }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="qq-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          故事书架
        </h1><p class="ui-page-subtitle">
          翻开一本书，读一段属于她们的故事。
        </p>
      </div>
    </div><NSpin :show="loading">
      <div v-if="stories.length" class="book-grid">
        <button v-for="story in stories" :key="story.id" type="button" class="book-card ui-card ui-card-hover" @click="router.push(`/dashboard/qq-space/stories/${story.id}/read`)">
          <div class="book-cover">
            <img v-if="story.coverUrl" :src="story.coverUrl" :alt="story.title" loading="lazy"><div v-else class="book-fallback">
              <NIcon size="42">
                <BookOutline />
              </NIcon>
            </div>
          </div><div class="book-spine" /><div class="book-copy">
            <h2>{{ story.title }}</h2><p>{{ story.subtitle || story.description || '未完待续的故事。' }}</p><span>{{ story.chapterCount || 0 }} 章 · {{ story.characters?.join(' · ') || '扣扣空间' }}</span>
          </div>
        </button>
      </div><NEmpty v-else description="还没有发布故事" />
    </NSpin>
  </div>
</template>

<style scoped>
.qq-page { display: grid; gap: 20px; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 20px; }
.book-card { position: relative; padding: 0; text-align: left; cursor: pointer; overflow: hidden; border: 0; }
.book-cover { aspect-ratio: .72; background: linear-gradient(145deg, #ffe8f0, #eaf2ff); overflow: hidden; }
.book-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.book-fallback { height: 100%; display: grid; place-items: center; color: var(--ui-primary); }
.book-spine { height: 5px; background: linear-gradient(90deg, var(--ui-primary), #9fbfff); }
.book-copy { padding: 14px 16px 18px; }
.book-copy h2 { margin: 0; color: var(--ui-text); font-size: 18px; }
.book-copy p { margin: 7px 0; color: var(--ui-text-muted); line-height: 1.6; font-size: 13px; }
.book-copy span { color: var(--ui-primary); font-size: 12px; }
</style>
