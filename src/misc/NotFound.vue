<script setup lang="ts">
import { useHead } from '@vueuse/head'
import { useRouter } from 'vue-router'
import { safePush } from '@/utils/navigation'

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  title: '404 - 页面未找到 | 亦可',
})

const router = useRouter()

function goHome() {
  void safePush(router, '/')
}

function goBack() {
  if (router.options.history.state.back)
    router.back()
  else
    void safePush(router, '/')
}
</script>

<template>
  <main class="not-found-page" aria-labelledby="not-found-title">
    <div class="not-found-content">
      <p class="error-code" aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title">
        页面未找到
      </h1>
      <p class="description">
        这条链接可能已失效，或页面已经搬家。<br class="desktop-break">
        你可以回到首页，或者返回上一页。
      </p>
      <div class="actions">
        <button class="glass-action glass-action--home" type="button" @click="goHome">
          回到首页
        </button>
        <button class="glass-action glass-action--back" type="button" @click="goBack">
          返回上一页
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.not-found-page {
  display: grid;
  min-height: 100vh;
  min-height: 100svh;
  place-items: center;
  padding: 48px 24px;
  color: var(--ui-text, #202635);
  background:
    radial-gradient(ellipse 38% 44% at 51% 4%, rgba(245, 134, 169, 0.15), transparent 85%),
    radial-gradient(ellipse 33% 47% at 3% 80%, rgba(245, 134, 169, 0.13), transparent 85%),
    radial-gradient(ellipse 32% 48% at 98% 94%, rgba(245, 134, 169, 0.1), transparent 85%),
    #fff;
}

.not-found-content {
  width: min(100%, 560px);
  margin-top: -16px;
  text-align: center;
}

.error-code {
  margin: 0 0 14px;
  color: color-mix(in srgb, var(--ui-primary, #f586a9) 70%, #fff);
  font-size: clamp(96px, 12vw, 136px);
  font-weight: 520;
  letter-spacing: -0.085em;
  line-height: 1;
}

h1 {
  margin: 0;
  color: var(--ui-text, #202635);
  font-size: clamp(25px, 3vw, 30px);
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1.4;
}

.description {
  margin: 14px 0 0;
  color: var(--ui-text-muted, #667085);
  font-size: 15px;
  line-height: 1.8;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 28px;
}

.glass-action {
  display: inline-flex;
  width: 156px;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 999px;
  color: #813151;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  box-shadow: 0 8px 22px rgba(127, 47, 77, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.glass-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(127, 47, 77, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.glass-action:active { transform: translateY(0); }
.glass-action:focus-visible { outline: 2px solid var(--ui-primary, #f586a9); outline-offset: 3px; }
.glass-action--home { background: rgba(245, 134, 169, 0.48); }
.glass-action--back { background: rgba(255, 255, 255, 0.42); }

@media (max-width: 640px) {
  .not-found-page { padding: 32px 24px; }
  .not-found-content { margin-top: -8px; }
  .description { font-size: 14px; }
  .desktop-break { display: none; }
  .actions { width: min(100%, 156px); flex-direction: column; margin-inline: auto; }
}

@media (prefers-reduced-motion: reduce) {
  .glass-action { transition: none; }
  .glass-action:hover { transform: none; }
}
</style>
