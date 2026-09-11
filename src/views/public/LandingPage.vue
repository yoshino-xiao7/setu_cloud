<script setup lang="ts">
import { ArrowForwardOutline, CodeSlashOutline, HeadsetOutline, ImagesOutline, SparklesOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PublicArtwork from '@/components/PublicArtwork.vue'
import { useLandingShowcase } from '@/composables/useLandingShowcase'
import { useSeo } from '@/composables/useSeo'

useSeo({
  title: '亦可 YK - 图片、AI 创作与音乐',
  description: '在亦可发现喜欢的图片，收藏常听的音乐，让新的灵感成为作品。图片浏览、AI 创作、音乐与收藏，都在你的个人空间。',
  keywords: '亦可, YK, 图片, AI绘画, 音乐, 收藏, 图片API, 音乐API',
})

const { tiles, loading, failed } = useLandingShowcase()

// 单张图裂了就把它从墙上摘掉，不留灰块。
const brokenTiles = ref(new Set<string>())
const visibleTiles = computed(() => tiles.value.filter(tile => !brokenTiles.value.has(tile.key)))
function dropTile(key: string) {
  brokenTiles.value = new Set(brokenTiles.value).add(key)
}

// 首屏铺作品，拿不到内容时退回单张随机图，保证第一屏不空。
const hasTiles = computed(() => visibleTiles.value.length > 0)
const showFallbackArt = computed(() => !loading.value && !hasTiles.value)
// 骨架数量与真实瓦片数接近，避免加载完成时首屏高度突变。
const skeletons = 10

const spaces = [
  { title: '遇见一张心动的图', label: '图片与收藏', description: '从随手浏览，到认真收藏。', icon: ImagesOutline, to: '/dashboard/images' },
  { title: '留一点时间给音乐', label: '音乐与歌单', description: '让喜欢的旋律，陪你久一点。', icon: HeadsetOutline, to: '/dashboard/music' },
  { title: '把脑海里的画面画出来', label: 'AI 创作', description: '一个想法，也可以是一幅作品。', icon: SparklesOutline, to: '/dashboard/ai-draw' },
]
</script>

<template>
  <div class="landing-page">
    <section class="landing-stage" aria-labelledby="landing-title">
      <!-- 作品墙：未登录第一屏直接是内容本身 -->
      <div class="stage-wall" :class="{ 'is-placeholder': !hasTiles }" aria-hidden="true">
        <template v-if="loading">
          <div v-for="n in skeletons" :key="`s${n}`" class="wall-tile is-skeleton" :class="n % 3 === 0 ? 'tile-wide' : 'tile-tall'" />
        </template>
        <template v-else-if="hasTiles">
          <div
            v-for="tile in visibleTiles"
            :key="tile.key"
            class="wall-tile"
            :class="tile.portrait ? 'tile-tall' : 'tile-wide'"
          >
            <img
              :src="tile.url"
              alt=""
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="dropTile(tile.key)"
            >
          </div>
        </template>
        <PublicArtwork v-else class="wall-fallback" :slot-index="0" decorative eager />
      </div>
      <div class="stage-veil" />

      <div class="stage-inner">
        <p class="stage-eyebrow">
          图片 · 音乐 · 创作
        </p>
        <h1 id="landing-title">
          亦可 <span>YK</span>
        </h1>
        <p class="stage-line">
          把喜欢，留在日常里。
        </p>
        <p class="stage-description">
          遇见一张图，循环一首歌，<br>再给灵感一点自由生长的空间。
        </p>
        <div class="stage-actions">
          <RouterLink to="/register" class="landing-button">
            开启我的空间 <NIcon><ArrowForwardOutline /></NIcon>
          </RouterLink>
          <RouterLink to="/login" class="stage-login">
            已有账号，去登录
          </RouterLink>
        </div>
        <!-- 空/失败态也说明这里本该有作品，而不是静默留白 -->
        <p v-if="showFallbackArt" class="stage-note">
          {{ failed ? '作品暂时加载不出来，先四处看看也可以。' : '广场还没有公开作品，你可以成为第一个分享的人。' }}
        </p>
        <p v-else-if="hasTiles" class="stage-note">
          正在展示广场上的公开作品
        </p>
      </div>
    </section>

    <section id="discover" class="discover-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">
            YOUR LITTLE WORLD
          </p><h2>喜欢的事，都有一个位置。</h2>
        </div>
        <p>看见、听见，也创造一点新鲜。</p>
      </div>
      <div class="space-grid">
        <RouterLink v-for="space in spaces" :key="space.to" :to="space.to" class="space-item">
          <NIcon class="space-icon">
            <component :is="space.icon" />
          </NIcon>
          <div class="space-copy">
            <p class="space-label">
              {{ space.label }}
            </p>
            <h3>{{ space.title }}</h3>
            <p class="space-desc">
              {{ space.description }}
            </p>
          </div>
          <NIcon class="space-arrow">
            <ArrowForwardOutline />
          </NIcon>
        </RouterLink>
      </div>
    </section>

    <section class="developer-section">
      <div class="developer-inner">
        <NIcon class="developer-icon">
          <CodeSlashOutline />
        </NIcon>
        <div>
          <p class="section-kicker">
            FOR YOUR NEXT IDEA
          </p><h2>让灵感，连接更多可能。</h2><p>图片与音乐 API，连接你的网站、应用和小工具。</p>
        </div>
        <RouterLink to="/docs" class="developer-link">
          阅读开发文档 <NIcon><ArrowForwardOutline /></NIcon>
        </RouterLink>
      </div>
    </section>
    <section class="join-section">
      <p>下一次心动，从这里开始。</p><RouterLink to="/register" class="landing-button">
        加入亦可 <NIcon><ArrowForwardOutline /></NIcon>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.landing-page { letter-spacing: 0; }
.landing-page a { text-decoration: none; color: inherit; }
.landing-page a:focus-visible { outline: 3px solid var(--ui-primary-hover); outline-offset: 5px; }

/* ---- 首屏：作品墙 ---- */
.landing-stage { position: relative; min-height: 560px; overflow: hidden; background: #edf7fb; }
.stage-wall { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 132px; grid-auto-flow: dense; gap: 8px; padding: 8px; }
.stage-wall.is-placeholder { display: block; padding: 0; }
.wall-tile { overflow: hidden; border-radius: 10px; background: #e3ecf1; }
.wall-tile img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
.tile-tall { grid-row: span 3; }
.tile-wide { grid-row: span 2; }
.wall-fallback { position: absolute; inset: 0; width: 100%; height: 100%; object-position: center top; }
.is-skeleton { background: linear-gradient(100deg, #e6eef2 30%, #f2f7fa 50%, #e6eef2 70%); background-size: 220% 100%; animation: wall-shimmer 1.5s infinite; }
@keyframes wall-shimmer { to { background-position: -120% 0; } }

/* 白纱：保证标题在任何作品上都可读 */
.stage-veil { position: absolute; inset: 0; background: linear-gradient(92deg, #fffffff5 0%, #fffffff0 32%, #ffffffc4 52%, #ffffff5c 72%, #ffffff2e 100%); pointer-events: none; }
.stage-inner { position: relative; max-width: 1344px; padding: 84px 48px 76px; margin: auto; pointer-events: none; }
.stage-inner a { pointer-events: auto; }
.stage-inner h1, .stage-inner p { text-shadow: 0 1px 16px rgba(255,255,255,.75); }
.stage-eyebrow { font-size: 13px; font-weight: 600; margin: 0 0 22px; }
.stage-inner h1 { font-size: 76px; line-height: 1.12; margin: 0 0 20px; font-weight: 750; }
.stage-inner h1 span { font-size: 32px; font-weight: 400; margin-left: 8px; }
.stage-line { font-size: 30px; line-height: 1.5; font-weight: 600; margin: 0 0 14px; }
.stage-description { font-size: 16px; line-height: 1.9; margin: 0 0 28px; }
.stage-actions { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.stage-note { font-size: 12px; color: var(--ui-text-muted); margin: 26px 0 0; }
.landing-button { display: inline-flex; align-items: center; justify-content: center; gap: 22px; min-height: 50px; padding: 0 23px; border-radius: 6px; background: #fff; border: 1px solid var(--ui-primary); font-size: 14px; font-weight: 650; box-shadow: 0 5px 20px #2026350c; transition: transform .2s, background .2s; }
.landing-button:hover { transform: translateY(-2px); background: #fff2f6; }
.stage-login { font-size: 13px; border-bottom: 1px solid currentColor; padding: 8px 0; }

/* ---- 功能入口 ---- */
.discover-section { max-width: 1344px; padding: 54px 48px 64px; margin: auto; scroll-margin-top: 20px; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.section-kicker { font-size: 10px; color: var(--ui-text-muted); font-weight: 650; margin: 0 0 10px; }
.section-heading h2, .developer-inner h2 { font-size: 27px; line-height: 1.45; margin: 0; font-weight: 650; }
.section-heading > p, .developer-inner > div > p:last-child { color: var(--ui-text-muted); font-size: 13px; line-height: 1.8; }
.space-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.space-item { display: flex; align-items: center; gap: 16px; min-width: 0; padding: 22px; border: 1px solid #e9eef2; border-radius: 10px; background: #fff; transition: border-color .2s, transform .2s; }
.space-item:hover { border-color: var(--ui-primary); transform: translateY(-2px); }
.space-icon { flex-shrink: 0; font-size: 26px; color: var(--ui-primary-hover); }
.space-copy { flex: 1; min-width: 0; }
.space-label { font-size: 11px; color: var(--ui-text-muted); margin: 0 0 6px; }
.space-copy h3 { margin: 0; font-size: 17px; line-height: 1.5; font-weight: 650; }
.space-desc { font-size: 13px; color: var(--ui-text-muted); margin: 6px 0 0; }
.space-arrow { flex-shrink: 0; font-size: 18px; color: var(--ui-primary-hover); }

.developer-section { background: #f7fafb; border-block: 1px solid #edf1f3; }
.developer-inner { max-width: 1344px; margin: auto; display: flex; align-items: center; gap: 30px; padding: 44px 48px; }
.developer-icon { font-size: 36px; color: #5e8796; flex-shrink: 0; }
.developer-inner > div { flex: 1; }
.developer-inner h2 { font-size: 22px; }
.developer-link { display: inline-flex; align-items: center; gap: 18px; font-size: 13px; min-height: 44px; }
.join-section { background: #fff6f9; padding: 44px 24px; display: flex; justify-content: center; align-items: center; gap: 36px; }
.join-section p { font-size: 22px; font-weight: 600; margin: 0; }

@media (max-width: 760px) {
  .landing-stage { min-height: 0; }
  /* 移动端作品墙铺满上方，文案叠在下方半透明区，避免遮住全部作品 */
  .stage-wall { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 96px; inset: 0 0 auto; height: 300px; }
  .stage-veil { background: linear-gradient(180deg, #ffffff5c 0%, #ffffffcc 34%, #fffffff7 46%, #fff 60%); }
  .stage-inner { padding: 214px 20px 34px; }
  .stage-eyebrow { font-size: 11px; margin-bottom: 14px; }
  .stage-inner h1 { font-size: 52px; margin-bottom: 16px; }
  .stage-inner h1 span { font-size: 24px; }
  .stage-line { font-size: 22px; }
  .stage-description { font-size: 14px; margin-bottom: 24px; }
  .stage-actions { gap: 16px; }
  .landing-button { padding: 0 17px; gap: 14px; }
  .stage-login { font-size: 12px; }
  .stage-note { margin-top: 20px; }
  .discover-section { padding: 32px 20px 40px; }
  .section-heading { display: block; margin-bottom: 24px; }
  .section-heading h2 { font-size: 23px; }
  .section-heading > p { margin: 10px 0 0; }
  .space-grid { grid-template-columns: minmax(0,1fr); gap: 12px; }
  .space-item { padding: 18px; gap: 14px; }
  .developer-inner { padding: 32px 20px; gap: 16px; flex-wrap: wrap; }
  .developer-icon { display: none; }
  .developer-inner > div { flex-basis: 100%; }
  .developer-inner h2 { font-size: 21px; }
  .join-section { flex-direction: column; gap: 22px; padding: 34px 20px; }
  .join-section p { font-size: 21px; }
}
@media (prefers-reduced-motion: reduce) {
  .landing-button, .space-item { transition: none; }
  .is-skeleton { animation: none; }
}
</style>
