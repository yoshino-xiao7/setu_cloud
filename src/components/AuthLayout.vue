<script setup lang="ts">
import logoImg from '@/assets/logo-setu.png'
import LiquidGlass from '@/components/LiquidGlass.vue'

defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="auth-page">
    <img
      src="https://img.yukiryou.icu/pic?img=ua"
      class="bg-image"
      alt="background"
    />

    <div class="bg-overlay"></div>

    <!-- 🧊 使用 LiquidGlass 组件包裹登录卡片 -->
    <LiquidGlass
      class="auth-card-wrapper"
      :displacement-scale="40"
      :blur-amount="0.06"
      :saturation="200"
      :aberration-intensity="2"
      :elasticity="0.08"
      :corner-radius="34"
      padding="40px 32px"
    >
      <div class="brand">
        <div class="brand-icon">
          <img :src="logoImg" alt="Logo" />
        </div>
        <div class="brand-text">
          <div class="brand-title">{{ title || '雪涼云 API' }}</div>
          <div class="brand-subtitle">{{ subtitle || '安全、高速、稳定的 API 服务' }}</div>
        </div>
      </div>

      <slot></slot>

      <div class="auth-footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
    </LiquidGlass>
  </div>
</template>

<style>
/* ==============================================
   🧊 Auth Layout — Liquid Glass Style
   ============================================== */

/* --- 基础容器 --- */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  touch-action: manipulation;
}

.bg-image {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}

.bg-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  /* 更轻的遮罩，让更多背景色渗透进玻璃 */
  background: rgba(0, 0, 0, 0.05);
  z-index: 1;
  pointer-events: none;
}

/* ==============================================
   卡片 — 液态玻璃核心
   ============================================== */
.auth-card {
  position: relative;
  z-index: 2;
  width: 400px;
  max-width: 90%;
  padding: 40px 32px;
  border-radius: var(--lg-radius-xl, 34px);

  /* 🧊 环境色浸染 — 不再是纯白，加入微量色调 */
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(230, 240, 255, 0.12) 40%,
    rgba(255, 230, 245, 0.12) 70%,
    rgba(255, 255, 255, 0.15) 100%
  );

  /* 移除浓郁的高斯模糊，完全交给 LiquidGlass 组件去做边缘位移和透明折射 */
  backdrop-filter: saturate(220%) brightness(1.1) contrast(1.05);
  -webkit-backdrop-filter: saturate(220%) brightness(1.1) contrast(1.05);

  /* 🧊 渐变发光边框 — 模拟光线在玻璃边缘的折射 */
  border: 1.5px solid rgba(255, 255, 255, 0.45);
  border-top-color: rgba(255, 255, 255, 0.7);
  border-left-color: rgba(255, 255, 255, 0.6);

  /* 🧊 多层阴影：外阴影 + 内发光 + 底部内光 */
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.06),
    inset 0 1px 1px rgba(255, 255, 255, 0.7),
    inset 0 -1px 1px rgba(255, 255, 255, 0.2),
    inset 0 0 40px rgba(255, 255, 255, 0.15);

  /* 弹性入场动画 */
  animation: authLiquidIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
  isolation: isolate;
}

/* 🧊 弧形高光 — Specular Highlight（液态玻璃标志性效果）
   模拟光线从上方照射到圆弧玻璃上的高光带 */
.auth-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 55%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.03) 50%,
    transparent 100%
  );
  /* 底部用椭圆裁出弧形不要动画，避免重绘卡顿 */
  border-radius: var(--lg-radius-xl, 34px) var(--lg-radius-xl, 34px) 50% 50% / auto auto 25% 25%;
  z-index: 1;
  pointer-events: none;
}

/* 🧊 折射光斑 — 缓慢漂移的径向光晕
   模拟光线穿过不均匀厚度玻璃产生的折射色散 */
.auth-card::after {
  content: '';
  position: absolute;
  top: -30%;
  left: -30%;
  width: 160%;
  height: 160%;
  background:
    radial-gradient(
      ellipse at 25% 15%,
      rgba(180, 210, 255, 0.12) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 75% 85%,
      rgba(255, 180, 210, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 50% 50%,
      rgba(255, 255, 255, 0.05) 0%,
      transparent 60%
    );
  z-index: 0;
  pointer-events: none;
}

@keyframes authLiquidIn {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.92);
  }
  60% {
    transform: translateY(-5px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* --- Brand 样式 --- */
.brand {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  /* 强制创建一个渲染层，防止文字和头像因为父级 SVG filter 重绘而发生闪烁 */
  transform: translateZ(0);
}

.brand-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* 🧊 小型液态玻璃容器 */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.25) 100%
  );
  backdrop-filter: blur(10px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}
.brand-icon img { width: 100%; height: 100%; object-fit: cover; }
.brand-text { display: flex; flex-direction: column; }
.brand-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  text-shadow: 0 2px 12px rgba(255, 255, 255, 0.9);
  letter-spacing: -0.5px;
}
.brand-subtitle {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.9);
}

/* ==============================================
   表单元素 — 液态玻璃风格
   ============================================== */
.auth-form {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transform: translateZ(0); /* 开启硬件加速以防止表单元素闪烁 */
}

.auth-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-left: 4px;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
}

/* 🧊 液态玻璃输入框 */
.auth-input {
  width: 100%;
  padding: 13px 16px;
  border-radius: 14px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  color: #0f172a;
  /* 🧊 纯净通透 + 内部高光，依靠环境和光泽表达玻璃感 */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform: translateZ(0); /* 开启硬件加速以防止输入框重绘闪烁 */
}

.auth-input:focus {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  border-color: rgba(255, 255, 255, 0.9);
  /* 🧊 聚焦光晕 — 粉色环形发光 */
  box-shadow:
    0 0 0 3px rgba(245, 134, 169, 0.15),
    0 0 20px rgba(245, 134, 169, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.9);
}

.auth-input::placeholder { color: #475569; opacity: 0.7; }

/* 🧊 液态玻璃登录按钮 */
.auth-btn {
  position: relative;
  margin-top: 10px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-top-color: rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  padding: 13px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;

  /* 🧊 半透明粉色渐变 */
  background: linear-gradient(
    145deg,
    rgba(245, 134, 169, 0.7) 0%,
    rgba(252, 165, 200, 0.5) 50%,
    rgba(245, 134, 169, 0.6) 100%
  );
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  /* 🧊 多层阴影：外发光 + 内高光 */
  box-shadow:
    0 10px 30px rgba(245, 134, 169, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.8),
    inset 0 -1px 2px rgba(0, 0, 0, 0.05),
    inset 0 0 20px rgba(255, 200, 220, 0.15);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform: translateZ(0); /* 开启硬件加速 */
}

/* 🧊 按钮顶部弧形高光 (静态) */
.auth-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 40%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border-radius: 0 0 50% 50%;
  pointer-events: none;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.01);
  box-shadow:
    0 14px 40px rgba(245, 134, 169, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.6),
    inset 0 0 25px rgba(255, 200, 220, 0.2);
  filter: brightness(1.08);
}

.auth-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.1s;
}

.auth-btn:disabled { opacity: 0.7; cursor: wait; }

/* --- 底部链接 --- */
.auth-footer {
  position: relative;
  z-index: 2;
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
  padding: 0 4px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  transform: translateZ(0); /* 防止重绘闪烁 */
}
.auth-link {
  cursor: pointer;
  transition: color 0.2s;
}
.auth-link:hover { color: #f26d99; text-decoration: underline; }

/* --- 响应式 --- */
@media (max-width: 480px) {
  .auth-card {
    width: 100%;
    margin: 0 16px;
    padding: 32px 24px;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(230, 240, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.18) 100%
    );
  }
  .auth-input { padding: 14px 16px; font-size: 16px; }
  .auth-btn { padding: 14px; margin-top: 16px; }
}

/* --- 去除浏览器自动填充背景 --- */
.auth-input:-webkit-autofill,
.auth-input:-webkit-autofill:hover,
.auth-input:-webkit-autofill:focus,
.auth-input:-webkit-autofill:active {
  transition: background-color 9999s ease-in-out 0s;
  -webkit-text-fill-color: #1e293b !important;
}
</style>