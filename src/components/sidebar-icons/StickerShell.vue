<script setup lang="ts">
defineProps<{
  name: string
  tone: string
}>()
</script>

<template>
  <span class="sidebar-sticker" :class="[`tone-${tone}`, `icon-${name}`]" aria-hidden="true">
    <span class="sticker-shadow" />
    <span class="sticker-base" />
    <slot />
  </span>
</template>

<style scoped>
.sidebar-sticker {
  position: relative;
  display: inline-grid;
  width: 30px;
  height: 30px;
  place-items: center;
  flex: 0 0 30px;
  color: var(--sticker-line);
  transform: translateZ(0);
  transition: transform 0.18s ease, filter 0.18s ease;
}

.sticker-shadow,
.sticker-base {
  position: absolute;
  inset: 2px;
  border-radius: 11px;
}

.sticker-shadow {
  background: rgba(31, 41, 55, 0.1);
  transform: translate(1px, 2px) rotate(-4deg);
  filter: blur(0.4px);
}

.sticker-base {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.66)),
    linear-gradient(145deg, var(--sticker-soft), rgba(255, 255, 255, 0.2));
  border: 1.8px solid rgba(255, 255, 255, 0.95);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 5px 12px var(--sticker-glow);
}

.tone-pink {
  --sticker-accent: #f9a8d4;
  --sticker-glow: rgba(245, 134, 169, 0.2);
  --sticker-line: #e05288;
  --sticker-soft: #ffe4ef;
}

.tone-blue {
  --sticker-accent: #93c5fd;
  --sticker-glow: rgba(96, 165, 250, 0.18);
  --sticker-line: #3b82c4;
  --sticker-soft: #e5f1ff;
}

.tone-mint {
  --sticker-accent: #8ee7cf;
  --sticker-glow: rgba(20, 184, 166, 0.16);
  --sticker-line: #0f9f8c;
  --sticker-soft: #dffcf5;
}

.tone-violet {
  --sticker-accent: #c4b5fd;
  --sticker-glow: rgba(139, 92, 246, 0.17);
  --sticker-line: #7c5bd6;
  --sticker-soft: #f0eaff;
}

.tone-gold {
  --sticker-accent: #fcd34d;
  --sticker-glow: rgba(245, 158, 11, 0.18);
  --sticker-line: #c47a13;
  --sticker-soft: #fff3c4;
}

.tone-rose {
  --sticker-accent: #fda4af;
  --sticker-glow: rgba(244, 63, 94, 0.17);
  --sticker-line: #dc4768;
  --sticker-soft: #ffe1e8;
}
</style>
