<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { NButton, NIcon } from 'naive-ui'
import { HomeOutline, ArrowBackOutline } from '@vicons/ionicons5'

import mascotImg from '@/assets/mascot-xueliang.webp'
import { BG_IMAGE_URL } from '@/api/env'

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})


const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="not-found-page">
    <div class="bg-layer"></div>

    <div class="glass-card content-box">

      <div class="mascot-container">
        <div class="aurora-glow"></div>
        <img :src="mascotImg" alt="雪涼云吉祥物 - 迷路的雪涼" class="mascot-img" />
      </div>

      <div class="text-container">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">这里...是哪里？</h2>

        <div class="dialog-box">
          <p class="dialog-text xueliang">
            <span class="name">雪涼：</span>
            「呜哇，好像迷路了……这里的路径在地图上找不到呢。」
          </p>
          <p class="dialog-sub">
            (可能是链接输错了，或者页面已经被移除了。)
          </p>
        </div>

        <div class="actions">
          <n-button quaternary class="glass-btn-secondary" @click="goBack">
            <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
            返回上一页
          </n-button>
          <n-button type="primary" round color="#f586a9" class="glass-btn-primary" @click="goHome">
            <template #icon><n-icon><HomeOutline /></n-icon></template>
            回到首页
          </n-button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 全屏容器 */
.not-found-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  /* 字体设置，确保数字好看 */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 背景层 */
.bg-layer {
  position: absolute;
  inset: 0;
  background-image: v-bind(`url('${BG_IMAGE_URL}')`); /* 全局背景图 */
  background-size: cover;
  background-position: center;
  z-index: -2;
}
.bg-layer::after {
  content: '';
  position: absolute; inset: 0;
  background: rgba(255, 255, 255, 0.1); /* 稍微提亮一点 */
  backdrop-filter: blur(10px); /* 模糊背景，突出前景 */
  z-index: -1;
}

/* --- 核心毛玻璃卡片 --- */
.glass-card {
  display: flex;
  align-items: center;
  gap: 50px; /* 增加一点间距 */
  padding: 50px 60px;
  max-width: 900px;
  width: 100%;

  background: rgba(255, 255, 255, 0.7); /* 稍微不透明一点，保证文字可读性 */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 32px;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset;

  animation: floatUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 左侧插图区 */
.mascot-container {
  position: relative;
  width: 260px;
  height: 340px;
  flex-shrink: 0;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center;
}

.mascot-img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 保证角色不被裁切 */
  animation: slightBounce 4s ease-in-out infinite;
  filter: drop-shadow(0 10px 20px rgba(245, 134, 169, 0.25));
  z-index: 2;
}

/* 角色背后的极光光晕 */
.aurora-glow {
  position: absolute;
  top: 50%; left: 50%;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.8) 0%, rgba(244, 114, 182, 0) 70%);
  filter: blur(40px);
  opacity: 0.5;
  z-index: 1;
  transform: translate(-50%, -50%);
  animation: pulseGlow 5s ease-in-out infinite alternate;
}

/* 右侧文本区 */
.text-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

/* 404 大标题 */
.error-code {
  font-size: 110px;
  line-height: 0.9;
  font-weight: 900;
  margin: 0 0 16px 0;
  background: linear-gradient(120deg, #f586a9, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 8px 30px rgba(245, 134, 169, 0.25);
  letter-spacing: -4px;
}

.error-title {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 32px 0;
  letter-spacing: -0.5px;
}

/* 对话框 */
.dialog-box {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 24px;
  border-radius: 20px;
  margin-bottom: 36px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

/* PC端：左侧小尖角 */
.dialog-box::before {
  content: '';
  position: absolute;
  left: -12px; top: 40px;
  width: 0; height: 0;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  border-right: 12px solid rgba(255, 255, 255, 0.8); /* 实色边框 */
  filter: drop-shadow(-2px 0 2px rgba(0,0,0,0.02));
}

.dialog-text {
  font-size: 16px;
  color: #374151;
  line-height: 1.7;
  margin: 0;
}
.dialog-text .name {
  color: #f586a9;
  font-weight: 700;
  margin-right: 4px;
}

.dialog-sub {
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
}

/* 按钮组 */
.actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.glass-btn-primary {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  padding: 0 32px;
  box-shadow: 0 10px 25px rgba(245, 134, 169, 0.35);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-btn-primary:hover {
  box-shadow: 0 15px 35px rgba(245, 134, 169, 0.5);
  transform: translateY(-2px) scale(1.02);
}

.glass-btn-secondary {
  height: 48px;
  font-size: 16px;
  color: #6b7280;
}
.glass-btn-secondary:hover {
  color: #f586a9;
  background: rgba(245, 134, 169, 0.08);
}

/* --- 动画 --- */
@keyframes floatUp {
  from { opacity: 0; transform: translateY(40px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slightBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes pulseGlow {
  0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
  100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
}

/* --- 📱 移动端适配 --- */
@media (max-width: 768px) {
  .not-found-page {
    padding: 16px;
    align-items: flex-start; /* 手机上靠上一点 */
    padding-top: 60px;
  }

  .glass-card {
    flex-direction: column;
    padding: 40px 24px;
    gap: 24px;
    text-align: center;
    border-radius: 24px;
  }

  /* 图片缩小 */
  .mascot-container {
    width: 200px;
    height: 200px;
  }

  .text-container {
    width: 100%;
    align-items: center;
  }

  .error-code { font-size: 80px; margin-bottom: 8px; }
  .error-title { font-size: 24px; margin-bottom: 24px; }

  /* 对话框适配 */
  .dialog-box {
    text-align: left; /* 保持左对齐阅读 */
    width: 100%;
    padding: 20px;
    margin-bottom: 32px;
  }

  /* 手机端：尖角改到上方，指向图片 */
  .dialog-box::before {
    left: 50%; top: -12px;
    border-right: 12px solid transparent; /* 清除右边 */
    border-left: 12px solid transparent;  /* 加上左边 */
    border-bottom: 12px solid rgba(255, 255, 255, 0.8); /* 底边实色 */
    border-top: none;
    transform: translateX(-50%);
  }

  .actions {
    width: 100%;
    flex-direction: column-reverse; /* 返回上一页放下面 */
    gap: 12px;
  }

  .glass-btn-primary, .glass-btn-secondary {
    width: 100%;
  }
}
</style>