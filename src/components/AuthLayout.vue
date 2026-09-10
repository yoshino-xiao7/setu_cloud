<script setup lang="ts">
import PublicArtwork from '@/components/PublicArtwork.vue'

defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="auth-page">
    <PublicArtwork class="auth-art" :slot-index="0" decorative eager />
    <div class="auth-content">
      <div class="auth-card">
        <div class="auth-heading">
          <p class="auth-eyebrow">
            YOUR SPACE, YOUR INSPIRATION
          </p>
          <h1>{{ title || '亦可 YK' }}</h1>
          <p>{{ subtitle || '图片、AI 创作与音乐的个人空间' }}</p>
        </div>
        <slot />
        <div v-if="$slots.footer" class="auth-footer">
          <slot name="footer" />
        </div>
      </div>
      <p class="auth-art-caption">
        一首歌的时间，也可以遇见新的灵感。
      </p>
    </div>
  </div>
</template>

<style>
.auth-page { min-height: 740px; position: relative; background: #fff6f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
.auth-page .auth-art { position: absolute; inset: 0; width: 100%; height: 100%; object-position: center top; }
.auth-page .auth-art.is-portrait img { object-fit: contain; object-position: right center; }
.auth-page .auth-content { position: relative; max-width: 1248px; margin: auto; padding: 56px 48px; display: flex; align-items: end; justify-content: space-between; gap: 30px; }
.auth-page .auth-card { width: 424px; max-width: 100%; flex-shrink: 0; padding: 34px 32px; box-sizing: border-box; border: 1px solid #ffffff; border-radius: 8px; background: rgba(255,255,255,.97); box-shadow: 0 16px 60px #25334512; }
.auth-page .auth-heading { margin-bottom: 28px; }
.auth-page .auth-eyebrow { font-size: 9px; color: var(--ui-primary-hover); font-weight: 650; margin: 0 0 14px; }
.auth-page .auth-heading h1 { font-size: 27px; font-weight: 650; line-height: 1.4; margin: 0 0 8px; color: var(--ui-text); }
.auth-page .auth-heading > p:last-child { font-size: 13px; line-height: 1.7; color: var(--ui-text-muted); margin: 0; }
.auth-page .auth-art-caption { padding: 10px 14px; background: #ffffffdc; border-radius: 4px; font-size: 13px; color: var(--ui-text); }
.auth-page .auth-form { display: flex; flex-direction: column; gap: 18px; }
.auth-page .auth-input-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.auth-page .auth-label { font-size: 13px; font-weight: 600; color: var(--ui-text); }
.auth-page .auth-input { width: 100%; min-width: 0; min-height: 46px; padding: 12px 14px; border-radius: 6px; font-size: 15px; outline: none; box-sizing: border-box; color: var(--ui-text); background: #fcfcfd; border: 1px solid #dfe4eb; transition: border-color .2s, box-shadow .2s; }
.auth-page .auth-input:focus { border-color: var(--ui-primary); background: #fff; box-shadow: 0 0 0 3px #f586a91f; }
.auth-page .auth-input::placeholder { color: #87909c; }
.auth-page .auth-btn { width: 100%; min-height: 48px; margin-top: 4px; border: 1px solid var(--ui-primary); border-radius: 6px; padding: 12px; background: #ffedf3; color: #793a53; font-size: 15px; font-weight: 650; cursor: pointer; transition: background .2s; }
.auth-page .auth-btn:hover:not(:disabled) { background: #ffdfeb; }
.auth-page .auth-btn:disabled { opacity: .6; cursor: wait; }
.auth-page .auth-btn:focus-visible, .auth-page .auth-link:focus-visible { outline: 3px solid var(--ui-primary); outline-offset: 3px; }
.auth-page .auth-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #edf0f4; font-size: 13px; color: var(--ui-text-muted); }
.auth-page .auth-link { color: inherit; text-decoration: none; cursor: pointer; }
.auth-page .auth-link:hover { color: var(--ui-primary-hover); }
@media (max-width: 760px) {
  .auth-page { min-height: 0; }
  .auth-page .auth-art { height: 270px; object-position: center top; }
  .auth-page .auth-content { padding: 112px 20px 32px; display: block; }
  .auth-page .auth-card { width: 100%; max-width: 424px; margin: auto; padding: 28px 24px; }
  .auth-page .auth-art-caption { display: none; }
  .auth-page .auth-heading h1 { font-size: 25px; }
  .auth-page .auth-input { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) { .auth-page .auth-input, .auth-page .auth-btn { transition: none; } }
</style>
