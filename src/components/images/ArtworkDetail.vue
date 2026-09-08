<script setup lang="ts">
import type { Artwork, ArtworkAnimation, ArtworkPage, ArtworkSource } from '@/api/artworks'
import { ChevronBack, ChevronForward, CloseOutline, DownloadOutline, Heart, HeartOutline } from '@vicons/ionicons5'
import { NAlert, NButton, NIcon, NSpin, NTag, useMessage } from 'naive-ui'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { artworkError, fetchArtwork, fetchArtworkAnimation, fetchArtworkBlob, fetchArtworks, saveArtworkMedia, setArtworkBookmark, setArtworkFollow, startArtworkAnimation } from '@/api/artworks'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatDate } from '@/utils/dateFormat'
import ArtworkCard from './ArtworkCard.vue'
import ArtworkImage from './ArtworkImage.vue'

const props = defineProps<{
  source: ArtworkSource
  id: string
  admin: boolean
  hasPrevious: boolean
  hasNext: boolean
}>()
const emit = defineEmits<{
  close: [
  ]
  previous: [
  ]
  next: [
  ]
  changed: [
        work: Artwork,
  ]
  open: [
        work: Artwork,
  ]
  artist: [
        id: string,
  ]
  tag: [
        tag: string,
  ]
  import: [
        pid: string,
  ]
}>()
const message = useMessage()
const { copyText } = useCopyToClipboard()
const guard = useRequestGuard()
const work = ref<Artwork | null>(null)
const error = ref('')
const busy = ref(false)
const saveProgress = ref('')
const related = ref<Artwork[]>([])
const expanded = ref<ArtworkPage | null>(null)
const scroller = ref<HTMLElement>()
const animation = ref<ArtworkAnimation | null>(null)
const videoUrl = ref('')
let animationTimer: ReturnType<typeof setTimeout> | undefined
const touchX = ref(0)
const touchY = ref(0)
let oldOverflow = ''
function clearVideo() {
  clearTimeout(animationTimer)
  if (videoUrl.value)
    URL.revokeObjectURL(videoUrl.value)
  videoUrl.value = ''
  animation.value = null
}
async function load() {
  const token = guard.next()
  clearVideo()
  work.value = null
  related.value = []
  error.value = ''
  expanded.value = null
  scroller.value?.scrollTo(0, 0)
  try {
    const result = await fetchArtwork(props.source, props.id)
    if (!guard.isCurrent(token))
      return
    work.value = result
    if (result.kind === 'ugoira')
      void loadAnimation(result.id, token)
    try {
      const page = await fetchArtworks(props.source, props.source === 'pixiv'
        ? { view: 'related', relatedId: result.id }
        : { sort: 'random', tag: result.tags[0] || '' })
      if (guard.isCurrent(token))
        related.value = page.items.filter(item => item.id !== result.id).slice(0, 12)
    }
    catch { /* Details remain available when recommendations fail. */ }
  }
  catch (cause) {
    if (guard.isCurrent(token))
      error.value = artworkError(cause, '作品加载失败')
  }
}
async function loadAnimation(id: string, token: number) {
  try {
    const result = animation.value ? await fetchArtworkAnimation(animation.value.id) : await startArtworkAnimation(id)
    if (!guard.isCurrent(token))
      return
    animation.value = result
    if (result.status === 'ready' && result.mediaUrl) {
      const blob = await fetchArtworkBlob(result.mediaUrl)
      if (guard.isCurrent(token))
        videoUrl.value = URL.createObjectURL(blob)
    }
    else if (result.status !== 'failed') {
      animationTimer = setTimeout(() => void loadAnimation(id, token), 2000)
    }
  }
  catch {
    if (guard.isCurrent(token))
      animation.value = { id, status: 'failed', mediaUrl: null, message: '动图加载失败，请重新加载作品' }
  }
}
async function bookmarkRelated(item: Artwork) {
  try {
    await setArtworkBookmark(item, !item.bookmarked)
    item.bookmarked = !item.bookmarked
    emit('changed', item)
  }
  catch {
    message.error('收藏失败，请重试')
  }
}
async function bookmark(page?: ArtworkPage) {
  if (!work.value || busy.value)
    return
  busy.value = true
  const target = work.value
  const enabled = !(page?.bookmarked ?? target.bookmarked)
  try {
    await setArtworkBookmark(target, enabled, page)
    if (work.value?.id === target.id) {
      if (page)
        page.bookmarked = enabled
      if (!page || page === target.pages[0])
        target.bookmarked = enabled
      emit('changed', target)
    }
  }
  catch {
    message.error('收藏操作失败，请重试')
  }
  finally {
    busy.value = false
  }
}
async function follow() {
  if (!work.value || busy.value)
    return
  busy.value = true
  const artist = work.value.artist
  try {
    await setArtworkFollow(artist, !artist.followed)
    artist.followed = !artist.followed
  }
  catch {
    message.error('关注操作失败，请重试')
  }
  finally {
    busy.value = false
  }
}
async function save(pages: ArtworkPage[]) {
  if (!work.value || saveProgress.value)
    return
  let failed = 0
  const title = work.value.pid
  for (const [index, page] of pages.entries()) {
    saveProgress.value = `保存 ${index + 1}/${pages.length}`
    try {
      if (!page.originalUrl)
        throw new Error('原图暂不可用')
      await saveArtworkMedia(page.originalUrl, `${title}_${page.pid}_p${page.index}.jpg`)
    }
    catch {
      failed++
    }
  }
  saveProgress.value = ''
  if (failed)
    message.warning(`${failed} 张保存失败，可重新保存；浏览器可能需要允许多文件下载`)
  else
    message.success('已开始下载图片')
}
async function saveVideo() {
  if (!animation.value?.mediaUrl || !work.value)
    return
  try {
    await saveArtworkMedia(animation.value.mediaUrl, `${work.value.pid}.mp4`)
    message.success('已开始下载动图')
  }
  catch {
    message.error('动图保存失败，请重试')
  }
}
function keydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
    return
  if (event.key === 'Escape') {
    if (expanded.value)
      expanded.value = null
    else
      emit('close')
  }
  if (expanded.value)
    return
  if (event.key === 'ArrowLeft' && props.hasPrevious)
    emit('previous')
  if (event.key === 'ArrowRight' && props.hasNext)
    emit('next')
}
function touchEnd(event: TouchEvent) {
  if (expanded.value || !event.changedTouches[0])
    return
  const dx = event.changedTouches[0].clientX - touchX.value
  const dy = event.changedTouches[0].clientY - touchY.value
  if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.8) {
    if (dx < 0 && props.hasNext)
      emit('next')
    if (dx > 0 && props.hasPrevious)
      emit('previous')
  }
}
watch(() => [props.source, props.id], load, { immediate: true })
onMounted(() => {
  oldOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', keydown)
})
onBeforeUnmount(() => {
  guard.invalidate()
  clearVideo()
  document.body.style.overflow = oldOverflow
  window.removeEventListener('keydown', keydown)
})
</script>

<template>
  <section class="artwork-detail" role="dialog" aria-modal="true" aria-label="作品详情">
    <div ref="scroller" class="detail-scroll" @touchstart="touchX = $event.touches[0]?.clientX || 0; touchY = $event.touches[0]?.clientY || 0" @touchend="touchEnd">
      <header class="detail-toolbar">
        <NButton circle aria-label="关闭作品详情" @click="emit('close')">
          <template #icon>
            <NIcon :component="CloseOutline" />
          </template>
        </NButton>
        <span>{{ source === 'pixiv' ? 'Pixiv 在线' : '本站图库' }}</span>
        <div class="detail-navigation">
          <NButton circle :disabled="!hasPrevious" aria-label="上一部作品" @click="emit('previous')">
            <template #icon>
              <NIcon :component="ChevronBack" />
            </template>
          </NButton>
          <NButton circle :disabled="!hasNext" aria-label="下一部作品" @click="emit('next')">
            <template #icon>
              <NIcon :component="ChevronForward" />
            </template>
          </NButton>
        </div>
      </header>
      <div v-if="error" class="detail-state">
        <NAlert type="error">
          {{ error }}
        </NAlert><NButton @click="load">
          重新加载
        </NButton>
      </div>
      <div v-else-if="!work" class="detail-state">
        <NSpin size="large" description="正在加载作品" />
      </div>
      <main v-else class="detail-content">
        <div v-if="work.kind === 'ugoira'" class="animation-stage">
          <video v-if="videoUrl" :src="videoUrl" autoplay loop muted controls playsinline />
          <template v-else>
            <ArtworkImage :src="work.pages[0]?.previewUrl" :alt="work.title" :ratio="(work.pages[0]?.width || 1) / (work.pages[0]?.height || 1)" fit="contain" />
            <p>
              {{ animation?.status === 'failed' ? animation.message : '正在准备动图…' }} <NButton v-if="animation?.status === 'failed'" @click="load">
                重试
              </NButton>
            </p>
          </template>
        </div>
        <div v-for="(page, index) in work.kind === 'ugoira' ? [] : work.pages" :key="`${page.pid}:${page.index}`" class="detail-image-page">
          <button class="expand-image" :aria-label="`放大第 ${index + 1} 张图片`" @click="expanded = page">
            <ArtworkImage :src="page.previewUrl" :alt="work.title" :ratio="page.width / page.height" fit="contain" />
          </button>
          <div v-if="work.pages.length > 1" class="page-actions">
            <small>{{ index + 1 }} / {{ work.pages.length }}</small>
            <NButton v-if="source === 'gallery'" size="small" :disabled="busy" @click="bookmark(page)">
              {{ page.bookmarked ? '取消本页收藏' : '收藏本页' }}
            </NButton>
            <NButton size="small" :disabled="!!saveProgress" @click="save([page])">
              保存本页
            </NButton>
          </div>
        </div>
        <div class="detail-info">
          <h1>{{ work.title }}</h1>
          <div class="detail-meta">
            <span v-if="work.views !== null">浏览 {{ work.views }}</span><span v-if="work.bookmarks !== null">收藏 {{ work.bookmarks }}</span>
            <span v-if="work.createdAt">{{ formatDate(work.createdAt) }}</span>
          </div>
          <div class="detail-meta">
            <button @click="copyText(work.pid)">
              PID {{ work.pid }} · 复制
            </button><span>{{ work.pages[0]?.width }} × {{ work.pages[0]?.height }}</span>
          </div>
          <div class="detail-artist">
            <div v-if="work.artist.avatarUrl" class="artist-avatar">
              <ArtworkImage :src="work.artist.avatarUrl" :alt="work.artist.name" />
            </div>
            <button class="artist-name" @click="source === 'pixiv' && emit('artist', work.artist.id)">
              {{ work.artist.name }}
            </button>
            <NButton v-if="source === 'pixiv'" round :disabled="busy" @click="follow">
              {{ work.artist.followed ? '已关注' : '关注' }}
            </NButton>
          </div>
          <div class="detail-tags">
            <NTag v-for="tag in work.tags" :key="tag" round class="detail-tag" @click="emit('tag', tag)">
              #{{ tag }}
            </NTag>
          </div>
          <p v-if="work.caption" class="detail-description">
            {{ work.caption }}
          </p>
          <div class="detail-actions">
            <NButton type="primary" round :loading="busy" @click="bookmark()">
              <template #icon>
                <NIcon :component="work.bookmarked ? Heart : HeartOutline" />
              </template>{{ work.bookmarked ? '已收藏' : '收藏' }}
            </NButton>
            <NButton round :disabled="!!saveProgress || (work.kind === 'ugoira' && !videoUrl)" @click="work.kind === 'ugoira' ? saveVideo() : save(work.pages)">
              <template #icon>
                <NIcon :component="DownloadOutline" />
              </template>{{ saveProgress || (work.kind === 'ugoira' ? '保存动图' : work.pages.length > 1 ? '保存整部作品' : '保存原图') }}
            </NButton>
            <NButton v-if="admin && source === 'pixiv'" round @click="emit('import', work.pid)">
              通过 PID 导入本站
            </NButton>
          </div>
          <section v-if="related.length" class="related-section">
            <h2>继续发现</h2><div class="related-grid">
              <ArtworkCard v-for="item in related" :key="item.id" :work="item" @open="emit('open', item)" @bookmark="bookmarkRelated(item)" />
            </div>
          </section>
        </div>
      </main>
    </div>
    <div v-if="expanded" class="image-zoom" role="dialog" aria-label="放大图片" @click.self="expanded = null">
      <NButton class="zoom-close" circle aria-label="关闭放大图片" @click="expanded = null">
        <template #icon>
          <NIcon :component="CloseOutline" />
        </template>
      </NButton>
      <div class="zoom-scroll">
        <ArtworkImage :src="expanded.originalUrl || expanded.previewUrl" :alt="work?.title || '图片'" :ratio="expanded.width / expanded.height" fit="contain" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.artwork-detail { position: fixed; inset: 0; z-index: 1800; background: var(--ui-bg, #f9f7fa); color: var(--ui-text, #242029); }
.detail-scroll { height: 100%; overflow: auto; overscroll-behavior: contain; }
.detail-toolbar { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 14px; padding: 12px max(16px, calc((100% - 850px) / 2)); backdrop-filter: blur(24px); background: #ffffffc9; }
.detail-toolbar > span { flex: 1; font-size: 13px; opacity: .65; }
.detail-navigation { display: flex; gap: 8px; }
.detail-content { max-width: 850px; margin: 0 auto; }
.detail-state { max-width: 600px; margin: 100px auto; display: grid; gap: 20px; justify-content: center; }
.expand-image { width: 100%; padding: 0; border: 0; display: block; cursor: zoom-in; }
.detail-info { padding: 32px 30px 90px; }
.detail-info h1 { margin: 0 0 12px; font-size: clamp(22px, 3vw, 30px); font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 12px; opacity: .65; font-size: 13px; margin-top: 8px; }
.detail-meta button { border: 0; background: none; padding: 0; font: inherit; color: inherit; cursor: pointer; }
.detail-artist { display: flex; gap: 14px; align-items: center; margin: 28px 0; }
.artist-avatar { width: 46px; border-radius: 50%; overflow: hidden; }
.artist-name { flex: 1; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.detail-tags, .detail-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.detail-tag { cursor: pointer; padding: 7px 12px; }
.detail-description { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; opacity: .75; margin: 24px 0; }
.detail-actions { margin-top: 28px; }
.page-actions { display: flex; justify-content: flex-end; gap: 10px; align-items: center; padding: 10px 16px 18px; }
.related-section { margin-top: 48px; }
.related-grid { columns: 3; gap: 18px; }
.animation-stage video { display: block; width: 100%; max-height: 85vh; }
.animation-stage p { text-align: center; padding: 12px; }
.image-zoom { position: fixed; inset: 0; z-index: 4; background: #16141cf5; overflow: auto; }
.zoom-close { position: fixed; top: 16px; right: 16px; z-index: 5; background: white; }
.zoom-scroll { width: max(100%, 1100px); margin: 60px auto; }
@media (max-width: 640px) { .detail-info { padding: 24px 18px 90px; } .related-grid { columns: 2; gap: 12px; } }
@media (prefers-color-scheme: dark) { .artwork-detail { background: #211d24; color: #eee8ee; } .detail-toolbar { background: #211d24cc; } }
</style>
