<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton, NIcon } from 'naive-ui'
import { HomeOutline, ArrowBackOutline } from '@vicons/ionicons5'

// 使用雪涼的图片作为“迷路向导”
// 确保路径正确，如果你想换成玲奈也可以
import mascotImg from '@/assets/mascot-xueliang.png'

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
        <img :src="mascotImg" alt="Mascot" class="mascot-img" />
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
          <n-button type="primary" round color="#8b5cf6" class="glass-btn-primary" @click="goHome">
            <template #icon><n-icon><HomeOutline /></n-icon></template>
            回到首页
          </n-button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 全屏容器，居中对齐 */
.not-found-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 背景层 (如果全局已有，可移除此部分) */
.bg-layer {
  position: absolute;
  inset: 0;
  /* 使用你全局统一的背景图 URL */
  background-image: url('https://img.yukiryou.icu/pic?img=ua');
  background-size: cover;
  background-position: center;
  z-index: -2;
}
/* 加一层淡淡的遮罩让文字更清晰 */
.bg-layer::after {
  content: '';
  position: absolute; inset: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  z-index: -1;
}


/* --- 核心毛玻璃卡片 --- */
.glass-card {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 40px 50px;
  max-width: 800px;
  width: 100%;

  /* 熟悉的配方 */
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 30px;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;

  animation: floatUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 左侧插图区 */
.mascot-container {
  position: relative;
  width: 240px;
  height: 320px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mascot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  /* 给角色加一点惊讶的浮动感 */
  animation: slightBounce 3s ease-in-out infinite;
  filter: drop-shadow(0 8px 16px rgba(139, 92, 246, 0.2));
  z-index: 2;
}

/* 角色背后的极光光晕 */
.aurora-glow {
  position: absolute;
  top: 50%; left: 50%;
  width: 180px; height: 180px;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  filter: blur(60px);
  opacity: 0.4;
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
}

/* 极光渐变大数字 */
.error-code {
  font-size: 100px;
  line-height: 1;
  font-weight: 900;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  /* 稍微带点文字阴影增加层次 */
  text-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 24px 0;
}

/* 对话框区域 */
.dialog-box {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 30px;
  position: relative;
}
/* 模拟对话气泡的小尖角 */
.dialog-box::before {
  content: '';
  position: absolute;
  left: -10px; top: 30px;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 10px solid rgba(255, 255, 255, 0.5);
}

.dialog-text {
  font-size: 16px;
  color: #374151;
  line-height: 1.6;
  margin: 0;
}
.dialog-text .name {
  color: #8b5cf6; /* 雪涼的代表色 */
  font-weight: 700;
  margin-right: 8px;
}

.dialog-sub {
  margin-top: 12px;
  font-size: 13px;
  color: #9ca3af;
}

/* 按钮组 */
.actions {
  display: flex;
  gap: 16px;
}

.glass-btn-primary {
  font-weight: 600;
  padding: 0 24px;
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
  transition: all 0.3s ease;
}
.glass-btn-primary:hover {
  box-shadow: 0 12px 28px rgba(139, 92, 246, 0.5);
  transform: translateY(-2px);
}

.glass-btn-secondary {
  color: #6b7280;
}
.glass-btn-secondary:hover {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

/* --- 动画定义 --- */
@keyframes floatUp {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slightBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulseGlow {
  0% { opacity: 0.3; scale: 0.9; }
  100% { opacity: 0.6; scale: 1.1; }
}

/* --- 响应式适配 --- */
@media (max-width: 768px) {
  .glass-card {
    flex-direction: column;
    padding: 30px 24px;
    gap: 30px;
    text-align: center;
  }

  .mascot-container {
    height: 240px; /* 手机上图片小一点 */
  }

  .text-container {
    align-items: center;
  }

  .error-code { font-size: 80px; }
  .error-title { font-size: 22px; }

  .dialog-box {
    text-align: left;
  }
  /* 手机上气泡尖角改到上面 */
  .dialog-box::before {
    left: 50%; top: -10px;
    transform: translateX(-50%) rotate(90deg);
  }

  .actions {
    width: 100%;
    justify-content: center;
  }
}
</style>