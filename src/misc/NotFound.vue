<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { NButton, NIcon } from 'naive-ui'
import { HomeOutline, ArrowBackOutline } from '@vicons/ionicons5'
import mascotImg from '@/assets/mascot-xueliang.webp'
import { BG_IMAGE_URL } from '@/api/env'

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  title: '404 - 页面未找到 | 雪涼云'
})

const router = useRouter()
const mounted = ref(false)

// 浮动粒子坐标（随机生成一次）
const particles = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 10 + Math.random() * 80,
  size: 4 + Math.random() * 8,
  delay: Math.random() * 4,
  duration: 6 + Math.random() * 6
}))

onMounted(() => {
  requestAnimationFrame(() => { mounted.value = true })
})
</script>

<template>
  <div class="not-found-page" :class="{ mounted }">
    <!-- 背景 -->
    <div class="bg-layer" :style="{ backgroundImage: `url(${BG_IMAGE_URL})` }"></div>
    <div class="bg-overlay"></div>

    <!-- 浮动粒子 -->
    <div class="particles" aria-hidden="true">
      <span
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`
        }"
      />
    </div>

    <!-- 主体卡片 -->
    <div class="glass-card">
      <!-- 左侧：吉祥物 -->
      <div class="mascot-area">
        <div class="mascot-halo"></div>
        <img :src="mascotImg" alt="" class="mascot-img" />
      </div>

      <!-- 右侧：内容 -->
      <div class="content">
        <div class="error-code-row">
          <span class="error-code">404</span>
        </div>
        <h1 class="error-title">这里...是哪里？</h1>

        <div class="dialog">
          <p class="dialog-main">
            <span class="speaker">雪涼</span>
            呜哇，好像迷路了……这里的路径在地图上找不到呢。
          </p>
          <p class="dialog-hint">可能是链接输错了，或者页面已经被移除了。</p>
        </div>

        <div class="actions">
          <n-button size="large" quaternary class="btn-back" @click="router.go(-1)">
            <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
            返回上一页
          </n-button>
          <n-button size="large" type="primary" round color="#f586a9" class="btn-home" @click="router.push('/')">
            <template #icon><n-icon><HomeOutline /></n-icon></template>
            回到首页
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 全屏容器 ============ */
.not-found-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ============ 背景 ============ */
.bg-layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: -2;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: -1;
}

/* ============ 浮动粒子 ============ */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 134, 169, 0.6), rgba(167, 139, 250, 0.3));
  opacity: 0;
  animation: particleFloat ease-in-out infinite alternate;
}

.mounted .particle {
  opacity: 0.45;
}

@keyframes particleFloat {
  0%   { transform: translateY(0) scale(1);   opacity: 0.3; }
  50%  { transform: translateY(-18px) scale(1.15); opacity: 0.55; }
  100% { transform: translateY(6px) scale(0.9);  opacity: 0.25; }
}

/* ============ 毛玻璃卡片 ============ */
.glass-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 48px;
  padding: 52px 56px;
  max-width: 880px;
  width: 100%;

  background: var(--ui-bg-card, rgba(255, 255, 255, 0.74));
  backdrop-filter: blur(var(--lg-blur, 28px)) saturate(var(--lg-saturation, 200%));
  -webkit-backdrop-filter: blur(var(--lg-blur, 28px)) saturate(var(--lg-saturation, 200%));
  border: var(--lg-border-width, 1.5px) solid var(--lg-border-glow, rgba(255, 255, 255, 0.6));
  border-radius: var(--lg-radius-xl, 34px);
  box-shadow: var(--lg-shadow-lg);

  opacity: 0;
  transform: translateY(36px) scale(0.96);
  transition: opacity 0.7s var(--lg-ease-spring), transform 0.7s var(--lg-ease-spring);
}

.mounted .glass-card {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ============ 吉祥物区域 ============ */
.mascot-area {
  position: relative;
  width: 240px;
  height: 300px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mascot-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 24px rgba(245, 134, 169, 0.2));
  animation: mascotFloat 5s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.mascot-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 180px;
  height: 180px;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(245, 134, 169, 0.35) 0%,
    rgba(167, 139, 250, 0.2) 40%,
    transparent 70%
  );
  filter: blur(36px);
  z-index: 1;
  animation: haloBreath 6s ease-in-out infinite alternate;
}

@keyframes mascotFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-14px); }
}

@keyframes haloBreath {
  0%   { opacity: 0.5; transform: translate(-50%, -50%) scale(0.85); }
  100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.15); }
}

/* ============ 右侧内容 ============ */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.error-code-row {
  margin-bottom: 12px;
}

.error-code {
  font-size: 100px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -3px;
  background: linear-gradient(135deg, #f586a9 0%, #ec4899 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--ui-text, #202635);
  margin: 0 0 28px;
  letter-spacing: -0.3px;
}

/* ============ 对话框 ============ */
.dialog {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.72));
  border-radius: var(--lg-radius-md, 20px);
  padding: 22px 24px;
  margin-bottom: 32px;
  position: relative;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}

/* 左侧小三角 */
.dialog::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 36px;
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 10px solid rgba(255, 255, 255, 0.55);
}

.dialog-main {
  font-size: 15px;
  line-height: 1.75;
  color: var(--ui-text, #202635);
  margin: 0;
}

.speaker {
  display: inline-block;
  color: var(--lg-accent, #f586a9);
  font-weight: 700;
  margin-right: 6px;
}

.dialog-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--ui-text-muted, #667085);
  font-style: italic;
}

/* ============ 按钮组 ============ */
.actions {
  display: flex;
  gap: 14px;
  align-items: center;
}

.btn-home {
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  padding: 0 28px;
  box-shadow: 0 8px 24px var(--lg-accent-shadow, rgba(245, 134, 169, 0.35));
  transition: all var(--lg-duration-normal) var(--lg-ease-smooth);
}

.btn-home:hover {
  box-shadow: 0 14px 32px var(--lg-accent-shadow, rgba(245, 134, 169, 0.5));
  transform: translateY(-2px);
}

.btn-back {
  height: 46px;
  font-size: 15px;
  color: var(--ui-text-muted, #667085);
  transition: all var(--lg-duration-fast);
}

.btn-back:hover {
  color: var(--lg-accent, #f586a9);
  background: var(--lg-accent-light, rgba(245, 134, 169, 0.15));
}

/* ============ 移动端适配 ============ */
@media (max-width: 768px) {
  .not-found-page {
    padding: 16px;
    padding-top: 48px;
    align-items: flex-start;
  }

  .glass-card {
    flex-direction: column;
    padding: 36px 24px;
    gap: 20px;
    text-align: center;
    border-radius: var(--lg-radius-lg, 26px);
  }

  .mascot-area {
    width: 180px;
    height: 180px;
  }

  .mascot-halo {
    width: 140px;
    height: 140px;
  }

  .content {
    align-items: center;
    width: 100%;
  }

  .error-code {
    font-size: 76px;
  }

  .error-title {
    font-size: 22px;
    margin-bottom: 20px;
  }

  .dialog {
    text-align: left;
    width: 100%;
    padding: 18px 20px;
    margin-bottom: 28px;
  }

  /* 手机端三角改朝上 */
  .dialog::before {
    left: 50%;
    top: -10px;
    border-right: 10px solid transparent;
    border-left: 10px solid transparent;
    border-bottom: 10px solid rgba(255, 255, 255, 0.55);
    border-top: none;
    transform: translateX(-50%);
  }

  .actions {
    width: 100%;
    flex-direction: column-reverse;
    gap: 10px;
  }

  .btn-home,
  .btn-back {
    width: 100%;
  }
}

/* ============ 减弱动画偏好 ============ */
@media (prefers-reduced-motion: reduce) {
  .mascot-img,
  .mascot-halo,
  .particle {
    animation: none;
  }

  .glass-card {
    transition-duration: 0.01ms;
  }
}
</style>
