<script setup lang="ts">
import logoImg from '@/assets/logo-setu.png' // 你的 Logo 路径

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

    <div class="auth-card">
      <div class="brand">
        <div class="brand-icon">
          <img :src="logoImg" alt="Logo" />
        </div>
        <div class="brand-text">
          <div class="brand-title">{{ title || 'Setu API' }}</div>
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
/* 注意：这里不用 scoped，或者用 :deep()，
   为了让插槽里的 input 和 button 也能吃到样式，
   我直接写在 style 里，但用 .auth- 前缀隔离 */

/* --- 基础容器 --- */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.bg-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  z-index: 1;
  pointer-events: none;
}

/* --- 卡片样式 --- */
.auth-card {
  position: relative;
  z-index: 2;
  width: 380px;
  max-width: 90%;
  padding: 40px 32px;
  border-radius: 24px;

  /* 极致通透毛玻璃 */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);

  border: 1px solid rgba(255, 255, 255, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  border-left: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);

  animation: authSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes authSlideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* --- Brand 样式 --- */
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}
.brand-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.brand-icon img { width: 100%; height: 100%; object-fit: cover; }
.brand-text { display: flex; flex-direction: column; }
.brand-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  text-shadow: 0 2px 10px rgba(255, 255, 255, 0.8);
  letter-spacing: -0.5px;
}
.brand-subtitle {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  text-shadow: 0 1px 5px rgba(255, 255, 255, 0.8);
}

/* --- 通用表单元素 (供插槽内部使用) --- */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.auth-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(5px);
}
.auth-input:focus {
  background: rgba(255, 255, 255, 0.85);
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
}
.auth-input::placeholder { color: #475569; opacity: 0.7; }

.auth-btn {
  margin-top: 10px;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  color: #ffffff;
  box-shadow: 0 10px 20px -5px rgba(139, 92, 246, 0.5);
  transition: all 0.3s ease;
  border-top: 1px solid rgba(255, 255, 255, 0.4);
}
.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 25px -5px rgba(139, 92, 246, 0.6);
  filter: brightness(1.1);
}
.auth-btn:disabled { opacity: 0.7; cursor: wait; }

/* --- 底部链接 --- */
.auth-footer {
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
  padding: 0 4px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}
.auth-link {
  cursor: pointer;
  transition: color 0.2s;
}
.auth-link:hover { color: #7c3aed; text-decoration: underline; }

/* --- 响应式 --- */
@media (max-width: 480px) {
  .auth-card {
    width: 100%;
    margin: 0 16px;
    padding: 32px 24px;
    background: rgba(255, 255, 255, 0.2);
  }
  .auth-input { padding: 14px 16px; font-size: 16px; }
  .auth-btn { padding: 14px; margin-top: 16px; }
}
</style>