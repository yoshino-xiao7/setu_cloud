<!-- eslint-disable style/max-statements-per-line -->
<script setup lang="ts">
import type { QqSpaceChapter, QqSpaceStory } from '@/api/qqSpace'
import { ArrowBackOutline, ListOutline } from '@vicons/ionicons5'
import { NButton, NDrawer, NDrawerContent, NEmpty, NIcon, NSpin, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchQqStory, saveQqStoryProgress } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { renderQqMarkdown } from '@/utils/qqSpaceMarkdown'

const route = useRoute(); const router = useRouter(); const message = useMessage()
const loading = ref(false); const story = ref<QqSpaceStory | null>(null); const chapterIndex = ref(0); const pageIndex = ref(0); const drawer = ref(false); const turning = ref(false)
let saveTimer: number | null = null
const chapter = computed<QqSpaceChapter | null>(() => story.value?.chapters?.[chapterIndex.value] || null)
const assetUrls = computed(() => Object.fromEntries((story.value?.assets || []).filter(asset => asset.url).map(asset => [String(asset.id), asset.url as string])))
const pages = computed(() => paginate(chapter.value?.bodyMarkdown || ''))
const page = computed(() => pages.value[pageIndex.value] || '')
const nextPage = computed(() => pages.value[pageIndex.value + 1] || '')
const hasNext = computed(() => pageIndex.value < pages.value.length - 1 || chapterIndex.value < (story.value?.chapters?.length || 0) - 1)
const hasPrevious = computed(() => pageIndex.value > 0 || chapterIndex.value > 0)

function paginate(markdown: string) {
  const blocks = markdown.replace(/\r\n/g, '\n').split(/\n{2,}/).filter(Boolean)
  const result: string[] = []; let current: string[] = []; let length = 0
  for (const block of blocks) {
    const isImage = /!\[[^\]]*\]\(asset:\/\/\d+\)/.test(block)
    if ((isImage && current.length) || (length + block.length > 900 && current.length)) { result.push(current.join('\n\n')); current = []; length = 0 }
    current.push(block); length += block.length
    if (isImage) { result.push(current.join('\n\n')); current = []; length = 0 }
  }
  if (current.length)
    result.push(current.join('\n\n'))
  return result.length ? result : ['']
}

async function load() {
  loading.value = true
  try {
    const data = unwrapApiData(await fetchQqStory(Number(route.params.id)), null)
    story.value = data
    const progress = data?.progress
    const savedChapter = data?.chapters?.findIndex(item => item.id === Number(progress?.chapterId ?? progress?.chapter_id)) ?? -1
    chapterIndex.value = savedChapter >= 0 ? savedChapter : 0
    pageIndex.value = Number(progress?.pageIndex ?? progress?.page_index ?? 0)
    clampPage()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载故事失败')
  }
  finally { loading.value = false }
}
function clampPage() { pageIndex.value = Math.min(Math.max(0, pageIndex.value), Math.max(0, pages.value.length - 1)) }
function scheduleSave() {
  if (!story.value || !chapter.value)
    return
  if (saveTimer !== null)
    window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => { void saveQqStoryProgress(story.value!.id, { chapterId: chapter.value!.id, pageIndex: pageIndex.value }).catch(() => {}) }, 450)
}
function turn(step: number) {
  if ((step > 0 && !hasNext.value) || (step < 0 && !hasPrevious.value))
    return
  turning.value = true
  window.setTimeout(() => {
    if (step > 0) {
      if (pageIndex.value < pages.value.length - 1) {
        pageIndex.value++
      }
      else { chapterIndex.value++; pageIndex.value = 0 }
    }
    else if (pageIndex.value > 0) {
      pageIndex.value--
    }
    else { chapterIndex.value--; pageIndex.value = Math.max(0, pages.value.length - 1) }
    turning.value = false; scheduleSave()
  }, 230)
}
function chooseChapter(index: number) { chapterIndex.value = index; pageIndex.value = 0; drawer.value = false; scheduleSave() }
function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === ' ')
    turn(1); else if (event.key === 'ArrowLeft')
    turn(-1)
}
watch(pages, clampPage)
onMounted(() => { void load(); window.addEventListener('keydown', onKey) })
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (story.value && chapter.value)
    void saveQqStoryProgress(story.value.id, { chapterId: chapter.value.id, pageIndex: pageIndex.value }).catch(() => {})
  if (saveTimer !== null)
    window.clearTimeout(saveTimer)
})
</script>

<template>
  <div class="reader-page ui-page">
    <div class="reader-toolbar">
      <NButton text @click="router.push('/dashboard/qq-space/stories')">
        <template #icon>
          <NIcon><ArrowBackOutline /></NIcon>
        </template>返回书架
      </NButton><div class="reader-title">
        <strong>{{ story?.title || '故事' }}</strong><span v-if="chapter">{{ chapter.title }} · {{ pageIndex + 1 }}/{{ pages.length }}</span>
      </div><NButton secondary @click="drawer = true">
        <template #icon>
          <NIcon><ListOutline /></NIcon>
        </template>目录
      </NButton>
    </div>
    <NSpin :show="loading">
      <div v-if="story && chapter" class="reader-stage">
        <button class="turn-zone left" type="button" aria-label="上一页" @click="turn(-1)" /><article class="book-page" :class="{ turning }" v-html="renderQqMarkdown(page, assetUrls)" /><article v-if="nextPage" class="book-page secondary-page" v-html="renderQqMarkdown(nextPage, assetUrls)" /><button class="turn-zone right" type="button" aria-label="下一页" @click="turn(1)" />
      </div><NEmpty v-else description="故事暂时没有可阅读内容" />
    </NSpin>
    <div class="reader-footer">
      <NButton secondary :disabled="!hasPrevious" @click="turn(-1)">
        上一页
      </NButton><span>第 {{ pageIndex + 1 }} / {{ pages.length }} 页</span><NButton type="primary" :disabled="!hasNext" @click="turn(1)">
        下一页
      </NButton>
    </div>
    <NDrawer v-model:show="drawer" placement="right" :width="300">
      <NDrawerContent title="章节目录">
        <button v-for="(item, index) in story?.chapters || []" :key="item.id" type="button" class="chapter-option" :class="{ active: index === chapterIndex }" @click="chooseChapter(index)">
          <span>第 {{ index + 1 }} 章</span><strong>{{ item.title }}</strong>
        </button>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.reader-page { display: grid; gap: 16px; min-height: calc(100vh - 120px); }
.reader-toolbar, .reader-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.reader-title { display: grid; text-align: center; color: var(--ui-text); }
.reader-title span { color: var(--ui-text-muted); font-size: 12px; margin-top: 3px; }
.reader-stage { width: min(100%, 1040px); min-height: 620px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 2px; position: relative; perspective: 1400px; }
.book-page { padding: 54px clamp(22px, 5vw, 70px); overflow: auto; background: linear-gradient(145deg, #fffdf8, #fffaf0); border: 1px solid rgba(183,150,102,.18); box-shadow: 0 20px 55px rgba(88,67,43,.14); color: #4e4238; line-height: 1.95; transform-origin: left center; backface-visibility: hidden; }
.book-page :deep(h1), .book-page :deep(h2), .book-page :deep(h3) { color: #6b4a4f; line-height: 1.35; }
.book-page :deep(img) { max-width: 100%; max-height: 420px; display: block; margin: 20px auto; object-fit: contain; border-radius: 8px; }
.book-page :deep(blockquote) { margin: 18px 0; padding-left: 16px; border-left: 3px solid var(--ui-primary); color: #786c68; }
.book-page :deep(code) { padding: 2px 5px; border-radius: 5px; background: rgba(245,134,169,.12); }
.book-page.turning { animation: page-turn .46s ease; }
.secondary-page { opacity: .94; }
.turn-zone { position: absolute; z-index: 2; top: 0; bottom: 0; width: 18%; border: 0; background: transparent; cursor: pointer; }
.turn-zone.left { left: 0; } .turn-zone.right { right: 0; }
.reader-footer { justify-content: center; }
.reader-footer span { min-width: 110px; text-align: center; color: var(--ui-text-muted); font-size: 13px; }
.chapter-option { width: 100%; display: grid; gap: 4px; text-align: left; padding: 12px; border: 0; border-radius: 10px; background: transparent; cursor: pointer; color: var(--ui-text); }
.chapter-option span { color: var(--ui-text-muted); font-size: 12px; } .chapter-option.active { background: var(--ui-primary-soft); color: var(--ui-primary-hover); }
@keyframes page-turn { from { transform: rotateY(0); } 50% { transform: rotateY(-78deg); opacity: .35; } to { transform: rotateY(0); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .book-page.turning { animation: none; } }
@media (max-width: 700px) { .reader-stage { display: block; min-height: 560px; } .secondary-page { display: none; } .book-page { min-height: 560px; padding: 34px 24px; } .reader-toolbar strong { font-size: 14px; } }
</style>
