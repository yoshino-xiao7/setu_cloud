<script setup lang="ts">
import { ArrowDownOutline, ArrowForwardOutline, CodeSlashOutline, HeadsetOutline, ImagesOutline, SparklesOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { RouterLink } from 'vue-router'
import PublicArtwork from '@/components/PublicArtwork.vue'
import { useSeo } from '@/composables/useSeo'

useSeo({
  title: '亦可 YK - 图片、AI 创作与音乐',
  description: '在亦可发现喜欢的图片，收藏常听的音乐，让新的灵感成为作品。图片浏览、AI 创作、音乐与收藏，都在你的个人空间。',
  keywords: '亦可, YK, 图片, AI绘画, 音乐, 收藏, 图片API, 音乐API',
})

const spaces = [
  { title: '遇见一张心动的图', label: '图片与收藏', description: '从随手浏览，到认真收藏。', slot: 1, icon: ImagesOutline, to: '/dashboard/images', tone: 'blue' },
  { title: '留一点时间给音乐', label: '音乐与歌单', description: '让喜欢的旋律，陪你久一点。', slot: 2, icon: HeadsetOutline, to: '/dashboard/music', tone: 'pink' },
  { title: '把脑海里的画面画出来', label: 'AI 创作', description: '一个想法，也可以是一幅作品。', slot: 3, icon: SparklesOutline, to: '/dashboard/ai-draw', tone: 'mint' },
]
</script>

<template>
  <div class="landing-page">
    <section class="landing-hero" aria-labelledby="landing-title">
      <PublicArtwork class="hero-art" :slot-index="0" caption eager retryable />
      <div class="hero-wash" />
      <div class="hero-inner">
        <p class="hero-eyebrow">
          图片 · 音乐 · 创作
        </p>
        <h1 id="landing-title">
          亦可 <span>YK</span>
        </h1>
        <p class="hero-line">
          把喜欢，留在日常里。
        </p>
        <p class="hero-description">
          遇见一张图，循环一首歌，<br>再给灵感一点自由生长的空间。
        </p>
        <div class="hero-actions">
          <RouterLink to="/register" class="landing-button">
            开启我的空间 <NIcon><ArrowForwardOutline /></NIcon>
          </RouterLink>
          <RouterLink to="/login" class="hero-login">
            已有账号，去登录
          </RouterLink>
        </div>
        <a href="#discover" class="hero-discover"><NIcon><ArrowDownOutline /></NIcon> 看看这里有什么</a>
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
        <RouterLink v-for="space in spaces" :key="space.to" :to="space.to" class="space-item" :class="`space-${space.tone}`">
          <div class="space-image">
            <PublicArtwork :slot-index="space.slot" /><span class="space-label"><NIcon><component :is="space.icon" /></NIcon>{{ space.label }}</span>
          </div>
          <div class="space-copy">
            <div><h3>{{ space.title }}</h3><p>{{ space.description }}</p></div><NIcon class="space-arrow">
              <ArrowForwardOutline />
            </NIcon>
          </div>
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
.landing-hero { position: relative; height: min(660px, 76svh); min-height: 490px; overflow: hidden; background: #edf7fb; }
.hero-art { position: absolute; width: 100%; height: 100%; object-position: center top; }
.hero-art.is-portrait :deep(img) { object-fit: contain; object-position: 85% center; }
.hero-art:not(.has-image) + .hero-wash { display: none; }
.hero-wash { position: absolute; inset: 0; background: linear-gradient(90deg, #ffffffec, #ffffff88 46%, #ffffff00 75%); pointer-events: none; }
.hero-inner { position: relative; max-width: 1344px; padding: 70px 48px 40px; margin: auto; pointer-events: none; }
.hero-inner a { pointer-events: auto; }
.hero-art :deep(.artwork-state) { align-items: flex-end; justify-content: flex-end; padding: 24px; }
.hero-eyebrow { font-size: 13px; font-weight: 600; margin: 0 0 22px; }
.hero-inner h1 { font-size: 76px; line-height: 1.12; margin: 0 0 20px; font-weight: 750; }
.hero-inner h1 span { font-size: 32px; font-weight: 400; margin-left: 8px; }
.hero-line { font-size: 30px; line-height: 1.5; font-weight: 600; margin: 0 0 14px; }
.hero-description { font-size: 16px; line-height: 1.9; margin: 0 0 28px; }
.hero-inner h1, .hero-inner p { text-shadow: 0 1px 16px rgba(255,255,255,.7); }
.hero-actions { display: flex; gap: 24px; align-items: center; }
.landing-button { display: inline-flex; align-items: center; justify-content: center; gap: 22px; min-height: 50px; padding: 0 23px; border-radius: 6px; background: #fff; border: 1px solid var(--ui-primary); font-size: 14px; font-weight: 650; box-shadow: 0 5px 20px #2026350c; transition: transform .2s, background .2s; }
.landing-button:hover { transform: translateY(-2px); background: #fff2f6; }
.hero-login { font-size: 13px; border-bottom: 1px solid currentColor; padding: 8px 0; }
.hero-discover { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; margin-top: 46px; }
.discover-section { max-width: 1344px; padding: 54px 48px 64px; margin: auto; scroll-margin-top: 20px; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.section-kicker { font-size: 10px; color: var(--ui-text-muted); font-weight: 650; margin: 0 0 10px; }
.section-heading h2, .developer-inner h2 { font-size: 27px; line-height: 1.45; margin: 0; font-weight: 650; }
.section-heading > p, .developer-inner > div > p:last-child { color: var(--ui-text-muted); font-size: 13px; line-height: 1.8; }
.space-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
.space-item { min-width: 0; }
.space-image { aspect-ratio: 1.4; overflow: hidden; border-radius: 8px; position: relative; background: #f1f5f9; }
.space-image .public-artwork { width: 100%; height: 100%; object-position: center top; transition: transform .35s; }
.space-item:hover .space-image .public-artwork { transform: scale(1.035); }
.space-label { position: absolute; bottom: 14px; left: 14px; display: inline-flex; align-items: center; gap: 8px; border-radius: 4px; background: #ffffffed; padding: 8px 12px; font-size: 12px; }
.space-copy { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 0 0; }
.space-copy h3 { margin: 0; font-size: 18px; line-height: 1.5; font-weight: 650; }
.space-copy p { font-size: 13px; color: var(--ui-text-muted); margin: 8px 0 0; }
.space-arrow { flex-shrink: 0; font-size: 20px; color: var(--ui-primary-hover); }
.developer-section { background: #f7fafb; border-block: 1px solid #edf1f3; }
.developer-inner { max-width: 1344px; margin: auto; display: flex; align-items: center; gap: 30px; padding: 44px 48px; }
.developer-icon { font-size: 36px; color: #5e8796; flex-shrink: 0; }
.developer-inner > div { flex: 1; }
.developer-inner h2 { font-size: 22px; }
.developer-link { display: inline-flex; align-items: center; gap: 18px; font-size: 13px; min-height: 44px; }
.join-section { background: #fff6f9; padding: 44px 24px; display: flex; justify-content: center; align-items: center; gap: 36px; }
.join-section p { font-size: 22px; font-weight: 600; margin: 0; }
@media (max-width: 760px) {
  .landing-hero { min-height: 500px; height: 68svh; max-height: 620px; }
  .hero-art { object-position: center top; }
  .hero-wash { background: linear-gradient(90deg, #ffffffed, #ffffff80); }
  .hero-inner { padding: 40px 24px 30px; }
  .hero-eyebrow { font-size: 11px; margin-bottom: 18px; }
  .hero-inner h1 { font-size: 56px; margin-bottom: 20px; }
  .hero-inner h1 span { font-size: 25px; }
  .hero-line { font-size: 23px; }
  .hero-description { font-size: 14px; margin-bottom: 24px; }
  .hero-actions { gap: 16px; flex-wrap: wrap; }
  .landing-button { padding: 0 17px; gap: 14px; }
  .hero-login { font-size: 12px; }
  .hero-discover { margin-top: 28px; }
  .discover-section { padding: 32px 20px 40px; }
  .section-heading { display: block; margin-bottom: 24px; }
  .section-heading h2 { font-size: 23px; }
  .section-heading > p { margin: 10px 0 0; }
  .space-grid { grid-template-columns: minmax(0,1fr); gap: 30px; }
  .space-image { aspect-ratio: 1.5; }
  .space-copy { padding-top: 14px; }
  .developer-inner { padding: 32px 20px; gap: 16px; flex-wrap: wrap; }
  .developer-icon { display: none; }
  .developer-inner > div { flex-basis: 100%; }
  .developer-inner h2 { font-size: 21px; }
  .join-section { flex-direction: column; gap: 22px; padding: 34px 20px; }
  .join-section p { font-size: 21px; }
}
@media (prefers-reduced-motion: reduce) { .landing-button, .space-image .public-artwork { transition: none; } }
</style>
