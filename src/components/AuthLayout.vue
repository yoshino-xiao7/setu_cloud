<script setup lang="ts">
import logoImg from '@/assets/logo-setu.png'

defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="auth-page">
    <div class="bg-overlay"></div>

    <div class="auth-card">
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
    </div>
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
  background:
    radial-gradient(circle at 18% 16%, rgba(106, 168, 255, 0.24), transparent 32%),
    radial-gradient(circle at 86% 20%, rgba(245, 134, 169, 0.26), transparent 34%),
    linear-gradient(135deg, #f6fbff 0%, #fff4fa 58%, #ffffff 100%);
}

.bg-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background:
    radial-gradient(circle at 18% 18%, rgba(106, 168, 255, 0.18), transparent 32%),
    radial-gradient(circle at 86% 20%, rgba(245, 134, 169, 0.24), transparent 34%),
    linear-gradient(135deg, rgba(246, 251, 255, 0.94), rgba(255, 244, 250, 0.96) 58%, #ffffff);
  z-index: 1;
  pointer-events: none;
}

/* ==============================================
   卡片 — 液态玻璃核心
   ============================================== */
.auth-card {
  position: relative;
  z-index: 2;
  width: min(420px, calc(100% - 32px));
  padding: 40px 32px;
  border-radius: var(--ui-radius-xl, 20px);

  /* 🧊 环境色浸染 — 不再是纯白，加入微量色调 */
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 249, 252, 0.96) 55%, rgba(248, 252, 255, 0.98) 100%);

  backdrop-filter: none;
  -webkit-backdrop-filter: none;

  /* 🧊 渐变发光边框 — 模拟光线在玻璃边缘的折射 */
  border: 1px solid rgba(255, 255, 255, 0.84);

  /* 🧊 多层阴影：外阴影 + 内发光 + 底部内光 */
  box-shadow:
    0 26px 64px rgba(31, 41, 55, 0.18),
    0 8px 24px rgba(245, 134, 169, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.78);

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
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(245, 134, 169, 0.2),
    transparent
  );
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
  background: radial-gradient(ellipse at 70% 20%, rgba(245, 134, 169, 0.06) 0%, transparent 42%);
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
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.86);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}
.brand-icon img { width: 100%; height: 100%; object-fit: cover; }
.brand-text { display: flex; flex-direction: column; }
.brand-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--ui-text, #202635);
  text-shadow: 0 2px 12px rgba(255, 255, 255, 0.9);
  letter-spacing: -0.5px;
}
.brand-subtitle {
  font-size: 13px;
  color: var(--ui-text-muted, #667085);
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
  color: var(--ui-text, #202635);
  margin-left: 4px;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
}

/* 🧊 液态玻璃输入框 */
.auth-input {
  width: 100%;
  padding: 13px 16px;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  color: var(--ui-text, #202635);
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 18px rgba(31, 41, 55, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.7);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform: translateZ(0); /* 开启硬件加速以防止输入框重绘闪烁 */
}

.auth-input:focus {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(245, 134, 169, 0.48);
  box-shadow:
    0 0 0 3px rgba(245, 134, 169, 0.15),
    0 10px 24px rgba(245, 134, 169, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.auth-input::placeholder { color: #667085; opacity: 0.72; }

/* 🧊 液态玻璃登录按钮 */
.auth-btn {
  position: relative;
  margin-top: 10px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  padding: 13px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;

  /* 🧊 半透明粉色渐变 */
  background: linear-gradient(135deg, #f586a9, #ff9cc0);
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  /* 🧊 多层阴影：外发光 + 内高光 */
  box-shadow:
    0 14px 30px rgba(245, 134, 169, 0.24),
    inset 0 1px 1px rgba(255, 255, 255, 0.62);
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
  transform: translateY(-2px);
  box-shadow:
    0 18px 42px rgba(245, 134, 169, 0.34),
    inset 0 1px 1px rgba(255, 255, 255, 0.66);
  filter: brightness(1.03);
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
  color: var(--ui-text-muted, #667085);
  padding: 0 4px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  transform: translateZ(0); /* 防止重绘闪烁 */
}
.auth-link {
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
  color: inherit;
}
.auth-link:hover { color: #f26d99; text-decoration: underline; }

/* --- 响应式 --- */
@media (max-width: 480px) {
  .auth-card {
    width: 100%;
    margin: 0 16px;
    padding: 32px 24px;
  background: rgba(255, 255, 255, 0.95);
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
