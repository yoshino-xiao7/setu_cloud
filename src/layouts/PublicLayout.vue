<script setup lang="ts">
import { ArrowForwardOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { RouterLink } from 'vue-router'
import logoSrc from '@/assets/logo-yike.svg'
</script>

<template>
  <div class="public-layout">
    <a href="#public-content" class="public-skip">跳到正文</a>
    <header class="public-header">
      <RouterLink to="/" class="public-brand" aria-label="亦可 YK 首页">
        <img :src="logoSrc" alt="" width="36" height="36">
        <span>亦可 <small>YK</small></span>
      </RouterLink>
      <nav class="public-nav" aria-label="公开导航">
        <RouterLink to="/" exact-active-class="selected">
          发现亦可
        </RouterLink>
        <RouterLink to="/docs" active-class="selected">
          开发文档
        </RouterLink>
        <RouterLink to="/status" active-class="selected">
          服务状态
        </RouterLink>
      </nav>
      <div class="public-account">
        <RouterLink to="/login" class="public-login">
          登录
        </RouterLink>
        <RouterLink to="/register" class="public-join">
          加入亦可 <NIcon><ArrowForwardOutline /></NIcon>
        </RouterLink>
      </div>
    </header>
    <main id="public-content" tabindex="-1">
      <slot />
    </main>
    <footer class="public-footer">
      <div class="public-footer-top">
        <RouterLink to="/" class="public-brand">
          <img :src="logoSrc" alt="" width="28" height="28"><span>亦可 <small>YK</small></span>
        </RouterLink>
        <p>把喜欢，留在日常里。</p>
        <div>
          <RouterLink to="/docs">
            开发文档
          </RouterLink><RouterLink to="/status">
            服务状态
          </RouterLink><a href="/sitemap.xml">网站地图</a>
        </div>
      </div>
      <div class="public-legal">
        <span>© 2024–2026 <a href="https://space.bilibili.com/1042630900" target="_blank" rel="noopener">雪涼</a></span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">湘ICP备2025149178号-1</a>
        <a href="https://beian.mps.gov.cn/#/query/webSearch?code=43102302000181" target="_blank" rel="noopener">湘公网安备43102302000181号</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.public-layout { color: var(--ui-text, #202635); background: #fff; min-height: 100vh; letter-spacing: 0; }
.public-layout :deep(*) { box-sizing: border-box; }
#public-content > :deep(.ui-page) { width: calc(100% - 40px); margin: 32px auto; }
.public-layout a { color: inherit; text-decoration: none; }
.public-layout a:focus-visible { outline: 3px solid var(--ui-primary); outline-offset: 5px; border-radius: 4px; }
.public-header { min-height: 84px; max-width: 1440px; padding: 0 48px; margin: auto; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
.public-brand { display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0; font-size: 23px; font-weight: 750; }
.public-brand img { border-radius: 8px; }
.public-brand small { font-size: 13px; margin-left: 5px; font-weight: 600; color: var(--ui-text-muted, #667085); }
.public-nav, .public-account { display: flex; align-items: center; gap: 32px; font-size: 14px; }
.public-nav a { padding: 14px 0; border-bottom: 2px solid transparent; }
.public-nav a:hover, .public-nav .selected { color: var(--ui-primary-hover); border-bottom-color: var(--ui-primary); }
.public-account { gap: 22px; }
.public-join { display: inline-flex; align-items: center; gap: 12px; min-height: 42px; padding: 0 18px; background: var(--ui-primary-soft, #fff0f5); border: 1px solid var(--ui-primary, #f586a9); border-radius: 6px; font-weight: 600; }
.public-footer { max-width: 1440px; margin: auto; padding: 40px 48px 24px; }
.public-footer-top { display: flex; align-items: center; gap: 28px; padding-bottom: 26px; border-bottom: 1px solid #eef0f3; }
.public-footer-top p { flex: 1; color: var(--ui-text-muted); font-size: 13px; }
.public-footer-top > div { display: flex; flex-wrap: wrap; gap: 24px; font-size: 13px; }
.public-legal { display: flex; flex-wrap: wrap; gap: 12px 24px; padding-top: 22px; color: var(--ui-text-muted); font-size: 11px; }
.public-skip { position: fixed; top: -100px; left: 16px; padding: 12px; z-index: 1000; background: white; }
.public-skip:focus { top: 12px; }
@media (max-width: 760px) {
  .public-header { padding: 16px 20px 0; flex-wrap: wrap; gap: 12px; }
  .public-brand { font-size: 21px; }
  .public-account { gap: 16px; }
  .public-join { padding: 0 12px; }
  .public-nav { order: 3; width: 100%; justify-content: center; gap: 36px; font-size: 13px; }
  .public-nav a { padding: 10px 0 13px; }
  .public-footer { padding: 30px 20px 22px; }
  .public-footer-top { flex-wrap: wrap; gap: 12px; }
  .public-footer-top p { text-align: right; }
  .public-footer-top > div { width: 100%; margin-top: 8px; }
  .public-legal { gap: 10px; flex-direction: column; }
}
</style>
