<template>
  <transition name="slide-fade">
    <div
      v-show="visible"
      class="my-message"
      :class="type"
    >
      <span class="icon">{{ iconMap[type] }}</span>
      <span class="text">{{ text }}</span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';

// 定义 Props
const props = defineProps<{
  text: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
}>();

const visible = ref(false);

// 简单的图标映射 (你可以换成 SVG 或 iconfont)
const iconMap = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️'
};

let timer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  visible.value = true;

  if (props.duration !== 0) {
    timer = setTimeout(() => {
      close();
    }, props.duration ?? 3000);
  }
});

onUnmounted(() => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
});

// 关闭方法
const close = () => {
  visible.value = false;
};

// 暴露给父组件/外部使用 (非常重要，否则 index.ts 无法监听过渡结束)
defineExpose({
  close
});
</script>

<style scoped>
.my-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;

  min-width: 300px;
  padding: 10px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: #fff;
  font-size: 14px;
  pointer-events: none; /* 防止遮挡点击 */
}

.icon {
  margin-right: 8px;
}

/* 颜色变体 */
.success { background-color: #f0f9eb; color: #67c23a; border: 1px solid #e1f3d8; }
.warning { background-color: #fdf6ec; color: #e6a23c; border: 1px solid #faecd8; }
.error   { background-color: #fef0f0; color: #f56c6c; border: 1px solid #fde2e2; }
.info    { background-color: #f4f4f5; color: #909399; border: 1px solid #e9e9eb; }

/* 动画效果 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translate(-50%, -20px);
  opacity: 0;
}
</style>