<script setup lang="ts">
import type { Artwork, ArtworkArtist, ArtworkSource, ArtworkSpotlight, PixivBinding } from '@/api/artworks'
import { AddOutline, RefreshOutline, SearchOutline } from '@vicons/ionicons5'
import { darkTheme, NAlert, NButton, NConfigProvider, NEmpty, NIcon, NInput, NSelect, NSkeleton, NSwitch, useDialog, useMessage } from 'naive-ui'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { artworkError, fetchArtworkArtists, fetchArtworks, fetchArtworkSpotlights, fetchPixivBinding, setArtworkBookmark, unlinkPixiv } from '@/api/artworks'
import ArtworkCard from '@/components/images/ArtworkCard.vue'
import ArtworkDetail from '@/components/images/ArtworkDetail.vue'
import ArtworkImage from '@/components/images/ArtworkImage.vue'
import PidImportDialog from '@/components/images/PidImportDialog.vue'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { useAuthStore, UserRole } from '@/stores/auth'

interface ChannelState {
  items: Artwork[]
  cursor: string | null
  loaded: boolean
  loading: boolean
  error: string
  query: string
  tag: string
  view: string
  sort: string
  sourceFilter: string
  ranking: string
  authorId: string
  r18: number
  excludeAI: boolean
  scroll: number
}
const makeChannel = (): ChannelState => ({ items: [], cursor: null, loaded: false, loading: false, error: '', query: '', tag: '', view: 'recommended', sort: 'latest', sourceFilter: 'ALL', ranking: 'day', authorId: '', r18: 0, excludeAI: true, scroll: 0 })
const states = reactive<Record<ArtworkSource, ChannelState>>({ pixiv: makeChannel(), gallery: makeChannel() })
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const guards = { pixiv: useRequestGuard(), gallery: useRequestGuard() }
const homeGuard = useRequestGuard()
const channel = ref<ArtworkSource>('pixiv')
const showOnlineUnavailable = computed(() => channel.value === 'pixiv')
const state = computed(() => states[channel.value])
const dark = ref(false)
const columnCount = ref(2)
const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
function updateLayout() {
  columnCount.value = window.innerWidth <= 640 ? 2 : window.innerWidth <= 1024 ? 3 : 4
  dark.value = colorScheme.matches
}
const columns = computed(() => {
  const items: Artwork[][] = Array.from({ length: columnCount.value }, () => [])
  const heights = items.map(() => 0)
  for (const work of state.value.items) {
    const column = heights.indexOf(Math.min(...heights))
    items[column]?.push(work)
    const page = work.pages[0]
    heights[column] = (heights[column] || 0) + (page?.height || 1) / (page?.width || 1) + 0.3
  }
  return items
})
const admin = computed(() => auth.user?.role === UserRole.Admin)
const binding = ref<PixivBinding | null>(null)
const accountError = ref('')
const artists = ref<ArtworkArtist[]>([])
const spotlights = ref<ArtworkSpotlight[]>([])
const homeError = ref('')
const showImport = ref(false)
const filtersExpanded = ref(false)
const importPid = ref('')
const busyIds = reactive(new Set<string>())
const sentinel = ref<HTMLElement>()
const detailId = computed(() => typeof route.query.work === 'string' ? route.query.work : '')
const detailSource = computed<ArtworkSource>(() => route.query.channel === 'gallery' ? 'gallery' : 'pixiv')
const detailIndex = computed(() => states[detailSource.value].items.findIndex(item => item.id === detailId.value))
const views = [
  { label: '为你推荐', value: 'recommended' },
  { label: '排行榜', value: 'ranking' },
  { label: '我的收藏', value: 'bookmarks' },
  { label: '私密收藏', value: 'privateBookmarks' },
  { label: '关注作品', value: 'following' },
]
const contentOptions = [{ label: '普通内容', value: 0 }, { label: '限制级内容', value: 1 }, { label: '全部内容', value: 2 }]
let observer: IntersectionObserver | undefined
async function load(source: ArtworkSource, reset = false) {
  const current = states[source]
  if (!reset && (current.loading || (current.loaded && !current.cursor)))
    return
  if (source === 'pixiv' && !binding.value?.bound)
    return
  const token = guards[source].next()
  current.loading = true
  current.error = ''
  if (reset) {
    current.cursor = null
    current.items = []
    current.loaded = false
  }
  try {
    const result = await fetchArtworks(source, {
      view: current.query ? 'search' : current.view,
      query: current.query,
      tag: current.tag,
      sort: current.sort,
      source: current.sourceFilter,
      ranking: current.ranking,
      authorId: current.authorId,
      r18: current.r18,
      excludeAI: current.excludeAI,
      cursor: current.cursor || undefined,
    })
    if (!guards[source].isCurrent(token))
      return
    const seen = new Set(current.items.map(work => work.id))
    current.items = [...current.items, ...result.items.filter(work => !seen.has(work.id))].slice(-240)
    current.cursor = result.nextCursor
    current.loaded = true
  }
  catch (cause) {
    if (guards[source].isCurrent(token))
      current.error = artworkError(cause, '图片加载失败，请重试')
  }
  finally {
    if (guards[source].isCurrent(token))
      current.loading = false
  }
}
async function loadAccount() {
  const token = homeGuard.next()
  accountError.value = ''
  try {
    const result = await fetchPixivBinding()
    if (!homeGuard.isCurrent(token))
      return
    if (binding.value?.version !== result.version) {
      guards.pixiv.invalidate()
      Object.assign(states.pixiv, makeChannel())
      artists.value = []
      spotlights.value = []
    }
    binding.value = result
    if (result.bound) {
      void load('pixiv')
      const results = await Promise.allSettled([fetchArtworkArtists(), fetchArtworkSpotlights()])
      if (!homeGuard.isCurrent(token))
        return
      artists.value = results[0].status === 'fulfilled' ? results[0].value : []
      spotlights.value = results[1].status === 'fulfilled' ? results[1].value : []
      homeError.value = results.some(item => item.status === 'rejected') ? '部分推荐暂不可用，可刷新重试' : ''
    }
  }
  catch (cause) {
    if (homeGuard.isCurrent(token))
      accountError.value = artworkError(cause, '账号状态获取失败')
  }
}
async function switchChannel(source: ArtworkSource) {
  if (channel.value === source)
    return
  const scrollHost = document.querySelector('.glass-content .n-scrollbar-container')
  states[channel.value].scroll = scrollHost?.scrollTop ?? window.scrollY
  channel.value = source
  try {
    localStorage.setItem(`images:channel:${auth.user?.id}`, source)
  }
  catch { /* Browsing also works with storage disabled. */ }
  await nextTick()
  if (scrollHost)
    scrollHost.scrollTop = states[source].scroll
  else
    window.scrollTo(0, states[source].scroll)
  if (!states[source].loaded)
    void load(source)
}
async function open(work: Artwork) {
  await router.push({ query: { ...route.query, work: work.id, channel: work.source } })
  const current = states[work.source]
  const index = current.items.findIndex(item => item.id === work.id)
  if (index >= current.items.length - 5)
    void load(work.source)
}
function closeDetail() {
  const { work: _work, channel: _channel, ...query } = route.query
  void router.replace({ query })
}
function navigateDetail(offset: number) {
  const item = states[detailSource.value].items[detailIndex.value + offset]
  if (item)
    void open(item)
}
function openRelated(work: Artwork) {
  const current = states[work.source]
  if (!current.items.some(item => item.id === work.id))
    current.items.push(work)
  void open(work)
}
function changed(work: Artwork) {
  const index = states[work.source].items.findIndex(item => item.id === work.id)
  if (index >= 0)
    states[work.source].items[index] = work
}
async function bookmark(work: Artwork) {
  if (busyIds.has(work.id))
    return
  busyIds.add(work.id)
  try {
    await setArtworkBookmark(work, !work.bookmarked)
    work.bookmarked = !work.bookmarked
  }
  catch {
    message.error('收藏失败，请重试')
  }
  finally {
    busyIds.delete(work.id)
  }
}
function selectArtist(id: string) {
  closeDetail()
  states.pixiv.authorId = id
  states.pixiv.query = ''
  states.pixiv.view = 'artist'
  channel.value = 'pixiv'
  void load('pixiv', true)
}
function selectTag(tag: string) {
  const source = detailSource.value
  closeDetail()
  channel.value = source
  if (source === 'gallery')
    states.gallery.tag = tag
  else
    states.pixiv.query = tag
  void load(source, true)
}
function importArtwork(pid = '') {
  importPid.value = pid
  showImport.value = true
}
function unbind() {
  dialog.warning({
    title: '解除 Pixiv 绑定',
    content: '解绑后 Web 和 iOS 都需要重新绑定，Pixiv 上的收藏与关注会保留。',
    positiveText: '解除绑定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await unlinkPixiv()
        closeDetail()
        await loadAccount()
      }
      catch {
        message.error('解绑失败，请重试')
      }
    },
  })
}
function resetUser() {
  guards.pixiv.invalidate()
  guards.gallery.invalidate()
  homeGuard.invalidate()
  Object.assign(states.pixiv, makeChannel())
  Object.assign(states.gallery, makeChannel())
  binding.value = null
  artists.value = []
  spotlights.value = []
  closeDetail()
  showImport.value = false
  void loadAccount()
  if (channel.value === 'gallery')
    void load('gallery')
}
watch(() => auth.user?.id, resetUser)
onMounted(() => {
  updateLayout()
  window.addEventListener('resize', updateLayout)
  colorScheme.addEventListener('change', updateLayout)
  try {
    channel.value = localStorage.getItem(`images:channel:${auth.user?.id}`) === 'gallery' ? 'gallery' : 'pixiv'
  }
  catch { /* Default to Pixiv. */ }
  void loadAccount()
  if (channel.value === 'gallery')
    void load('gallery')
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && !state.value.error && state.value.cursor)
      void load(channel.value)
  }, { rootMargin: '500px' })
  if (sentinel.value)
    observer.observe(sentinel.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateLayout)
  colorScheme.removeEventListener('change', updateLayout)
})
</script>

<template>
  <NConfigProvider :theme="dark ? darkTheme : null">
    <div class="image-browser ui-page" :class="{ dark }">
      <header class="image-heading">
        <div>
          <h1>图片</h1>
        </div>
        <NButton v-if="admin" round secondary @click="importArtwork()">
          <template #icon>
            <NIcon :component="AddOutline" />
          </template>新增图片
        </NButton>
      </header>
      <div class="channel-bar">
        <div class="channel-switch" role="tablist" aria-label="图片来源">
          <button v-for="source in (['pixiv', 'gallery'] as const)" :key="source" role="tab" :aria-selected="channel === source" :class="{ selected: channel === source }" @click="switchChannel(source)">
            {{ source === 'pixiv' ? 'Pixiv 在线' : '本站图库' }}
          </button>
        </div>
        <span class="free-caption">浏览与保存免费</span>
      </div>
      <template v-if="showOnlineUnavailable">
        <section class="binding-panel ui-card">
          <span class="binding-symbol">P</span><h2>Pixiv 在线暂未开放</h2>
          <p>网页版暂时仅开放本站图库，浏览和保存均免费。<br>iOS 的 Pixiv 登录保存在本机，不会同步到网页。</p>
          <NButton text @click="switchChannel('gallery')">
            先逛逛本站图库 →
          </NButton>
        </section>
      </template>
      <template v-else>
        <div v-if="channel === 'pixiv'" class="pixiv-account">
          <span>{{ binding?.name }} 的 Pixiv</span><NButton text size="small" @click="loadAccount">
            刷新账号
          </NButton><NButton text size="small" @click="unbind">
            解绑
          </NButton>
        </div>
        <div class="image-filters">
          <div v-if="channel === 'pixiv'" class="view-tabs">
            <button v-for="view in views" :key="view.value" :class="{ active: state.view === view.value && !state.query }" @click="state.view = view.value; state.query = ''; load(channel, true)">
              {{ view.label }}
            </button>
          </div>
          <NButton v-if="channel === 'pixiv'" class="filter-toggle" text @click="filtersExpanded = !filtersExpanded">
            <template #icon>
              <NIcon :component="SearchOutline" />
            </template>{{ filtersExpanded ? '收起搜索与筛选' : '搜索与筛选' }}
          </NButton>
          <div v-if="channel === 'gallery' || filtersExpanded" class="filter-controls">
            <NSelect v-if="channel === 'gallery'" v-model:value="state.sort" style="width: 110px" :options="[{ label: '最新作品', value: 'latest' }, { label: '随机发现', value: 'random' }]" @update:value="load(channel, true)" />
            <NSelect v-if="channel === 'gallery'" v-model:value="state.sourceFilter" style="width: 130px" :options="[{ label: '全部来源', value: 'ALL' }, { label: 'Pixiv 导入', value: 'PIXIV' }, { label: '用户投稿', value: 'YUKIRYOU' }]" @update:value="load(channel, true)" />
            <NSelect v-if="channel === 'pixiv' && state.view === 'ranking'" v-model:value="state.ranking" style="width: 110px" :options="[{ label: '日榜', value: 'day' }, { label: '周榜', value: 'week' }, { label: '月榜', value: 'month' }]" @update:value="load(channel, true)" />
            <NInput v-model:value="state.query" clearable class="image-search" placeholder="搜索作品、画师或标签" @keyup.enter="load(channel, true)">
              <template #prefix>
                <NIcon :component="SearchOutline" />
              </template>
            </NInput>
            <NButton round @click="load(channel, true)">
              搜索
            </NButton>
            <NSelect v-model:value="state.r18" style="width: 130px" :options="contentOptions" @update:value="load(channel, true)" />
            <label class="ai-filter"><NSwitch v-model:value="state.excludeAI" size="small" @update:value="load(channel, true)" />排除 AI</label>
            <NButton circle aria-label="刷新图片" @click="load(channel, true)">
              <template #icon>
                <NIcon :component="RefreshOutline" />
              </template>
            </NButton>
          </div>
        </div>
        <template v-if="channel === 'pixiv' && state.view === 'recommended' && !state.query">
          <NAlert v-if="homeError" type="warning" closable>
            {{ homeError }}
          </NAlert>
          <section v-if="spotlights.length" class="spotlight-section">
            <h2>亮点</h2><div class="spotlight-strip">
              <a v-for="article in spotlights" :key="article.id" class="spotlight-card" :href="article.url" target="_blank" rel="noopener noreferrer"><ArtworkImage :src="article.thumbnailUrl" :alt="article.title" :ratio="1.9" /><strong>{{ article.title }}</strong></a>
            </div>
          </section>
          <div class="recommend-heading">
            <h2>为你推荐</h2><div class="artist-strip">
              <button v-for="artist in artists" :key="artist.id" :aria-label="`查看 ${artist.name} 的作品`" @click="selectArtist(artist.id)">
                <ArtworkImage :src="artist.avatarUrl" :alt="artist.name" />
              </button>
            </div>
          </div>
        </template>
        <h2 v-else class="feed-heading">
          {{ channel === 'gallery' ? '本站图库' : state.query ? `搜索：${state.query}` : state.view === 'artist' ? '画师作品' : views.find(view => view.value === state.view)?.label }}
        </h2>
        <NButton v-if="state.tag" text @click="state.tag = ''; load(channel, true)">
          #{{ state.tag }} · 清除标签筛选
        </NButton>
        <NAlert v-if="state.error" type="error" style="margin: 20px 0">
          {{ state.error }} <NButton text @click="load(channel, !state.loaded)">
            重试
          </NButton>
        </NAlert>
        <div class="artwork-masonry">
          <div v-for="(items, column) in columns" :key="column" class="artwork-column">
            <ArtworkCard v-for="work in items" :key="`${work.source}:${work.id}`" :work="work" :busy="busyIds.has(work.id)" @open="open(work)" @bookmark="bookmark(work)" />
          </div>
          <template v-if="state.loading && !state.items.length">
            <NSkeleton v-for="n in 8" :key="n" class="artwork-skeleton" :height="n % 2 ? 330 : 240" :sharp="false" />
          </template>
        </div>
        <NEmpty v-if="state.loaded && !state.items.length && !state.error" description="暂时没有符合条件的作品，试试更换筛选" style="padding: 70px 0" />
      </template>
      <footer ref="sentinel" class="feed-footer">
        <NButton v-if="state.cursor" :loading="state.loading" round @click="load(channel)">
          继续发现
        </NButton>
        <span v-else-if="state.loaded && state.items.length">已看到这里的全部作品</span>
      </footer>
      <Teleport to="body">
        <ArtworkDetail v-if="detailId && detailSource === 'gallery'" :id="detailId" :source="detailSource" :admin="admin" :has-previous="detailIndex > 0" :has-next="detailIndex >= 0 && detailIndex < states[detailSource].items.length - 1" @close="closeDetail" @previous="navigateDetail(-1)" @next="navigateDetail(1)" @changed="changed" @open="openRelated" @artist="selectArtist" @tag="selectTag" @import="importArtwork" />
      </Teleport>
      <PidImportDialog v-model:show="showImport" :pid="importPid" @imported="load('gallery', true)" />
    </div>
  </NConfigProvider>
</template>

<style scoped>
.image-browser { box-sizing: border-box; min-width: 0; max-width: 1440px; margin: 0 auto; padding-bottom: 90px; }
.image-browser.dark { background: #211d24; color: #eee8ee; padding: 18px 18px 90px; border-radius: 18px; --ui-surface: #302934; --ui-text: #eee8ee; --ui-text-muted: #b5a8ba; }
.image-browser.dark :deep(.n-button) { color: #eee8ee; }
.image-browser.dark :deep(.ui-card) { background: #302934; color: #eee8ee; border-color: #514253; }
.image-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin: 8px 0 20px; }
.eyebrow { color: var(--ui-primary); font-size: 11px; font-weight: 700; letter-spacing: .2em; margin: 0 0 8px; }
.image-heading h1 { font-size: clamp(26px, 3vw, 36px); letter-spacing: -.03em; margin: 0; font-weight: 650; }
.intro { opacity: .5; font-size: 13px; margin: 8px 0 0; }
.channel-bar { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.channel-switch { display: flex; background: #f586a914; border-radius: 30px; padding: 5px; }
.channel-switch button { border: 0; border-radius: 24px; padding: 11px 28px; background: transparent; font: inherit; cursor: pointer; color: inherit; opacity: .55; }
.channel-switch button.selected { background: var(--ui-primary); color: white; opacity: 1; box-shadow: 0 3px 12px #f586a930; }
.free-caption { font-size: 12px; opacity: .45; margin-left: auto; }
.filter-toggle { margin-bottom: 12px; }
.pixiv-account { display: flex; align-items: center; gap: 14px; opacity: .65; font-size: 12px; margin-bottom: 12px; }
.view-tabs { display: flex; gap: 22px; overflow-x: auto; margin-bottom: 20px; }
.view-tabs button { flex-shrink: 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: inherit; padding: 8px 0 10px; font: inherit; cursor: pointer; opacity: .5; }
.view-tabs button.active { color: var(--ui-primary); border-color: var(--ui-primary); opacity: 1; }
.filter-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin: 0 0 24px; }
.image-search { flex: 1; min-width: 180px; max-width: 440px; }
.ai-filter { display: flex; align-items: center; gap: 8px; font-size: 12px; white-space: nowrap; }
.spotlight-section { margin-top: 32px; }
.image-browser h2 { font-size: 23px; font-weight: 650; letter-spacing: -.03em; }
.spotlight-strip { display: flex; gap: 18px; overflow-x: auto; padding: 0 0 12px; scrollbar-width: thin; }
.spotlight-card { flex: 0 0 42%; position: relative; overflow: hidden; border-radius: var(--ui-radius-lg, 18px); color: white; }
.spotlight-card strong { position: absolute; inset: auto 0 0; padding: 40px 20px 16px; background: linear-gradient(transparent, #0008); font-size: 16px; font-weight: 500; }
.recommend-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 10px 0; }
.artist-strip { display: flex; gap: 12px; overflow-x: auto; max-width: 60%; padding: 5px 0; }
.artist-strip button { flex: 0 0 44px; border: 0; padding: 0; border-radius: 50%; overflow: hidden; cursor: pointer; }
.artwork-masonry { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
.artwork-column { min-width: 0; }
.artwork-skeleton { break-inside: avoid; margin-bottom: 20px; }
.feed-footer { text-align: center; padding: 40px; font-size: 12px; opacity: .65; }
.binding-panel { display: grid; justify-items: center; gap: 22px; text-align: center; padding: 70px 24px; margin-top: 35px; }
.binding-panel h2, .binding-panel p { margin: 0; }
.binding-panel p { opacity: .6; line-height: 1.9; }
.binding-symbol { width: 68px; height: 68px; display: grid; place-items: center; background: #f586a916; color: var(--ui-primary); border-radius: 22px; font-size: 40px; font-weight: 700; }
@media (max-width: 1024px) { .artwork-masonry { grid-template-columns: repeat(3, minmax(0, 1fr)); } .spotlight-card { flex-basis: 60%; } }
@media (max-width: 640px) { .artwork-masonry { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } .image-heading { align-items: flex-start; } .image-heading h1 { font-size: 24px; } .intro { font-size: 12px; } .channel-switch button { padding: 10px 20px; } .channel-bar { gap: 8px; } .free-caption { font-size: 10px; } .image-search { min-width: 150px; } .filter-controls { gap: 10px; } .spotlight-card { flex-basis: 82%; } .artist-strip { gap: 8px; } .artist-strip button { flex-basis: 38px; } .image-browser h2 { font-size: 22px; } }
</style>
