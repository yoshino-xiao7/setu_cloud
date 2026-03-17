<script setup lang="ts">
/**
 * LiquidGlass.vue
 * 
 * Apple iOS 26 液态玻璃效果 Vue 组件
 * 基于 liquid-glass-react (https://github.com/rdev/liquid-glass-react) 的技术实现
 * 
 * 核心技术点：
 * 1. SVG feDisplacementMap — 使用位移贴图实现边缘折射/弯曲
 * 2. 色散 (Chromatic Aberration) — R/G/B 通道使用不同位移强度
 * 3. 鼠标响应式边框 — 渐变边框角度/强度随鼠标位置变化
 * 4. 弹性形变 — 元素随鼠标位置微弱拉伸
 * 5. 多层混合 — mix-blend-mode: screen / overlay 模拟光线折射
 */

import { ref, computed, onMounted, onUnmounted, useId, type CSSProperties } from 'vue'

// ===== 位移贴图生成 (基于 roundedRect SDF 着色器) =====
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function lengthVec(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}

function roundedRectSDF(x: number, y: number, w: number, h: number, r: number): number {
  const qx = Math.abs(x) - w + r
  const qy = Math.abs(y) - h + r
  return Math.min(Math.max(qx, qy), 0) + lengthVec(Math.max(qx, 0), Math.max(qy, 0)) - r
}

function generateDisplacementMap(width: number, height: number): string {
  const canvas = document.createElement('canvas')
  const dpi = 1
  canvas.width = width * dpi
  canvas.height = height * dpi
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const w = canvas.width
  const h = canvas.height
  const rawValues: number[] = []
  let maxScale = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const uvx = x / w
      const uvy = y / h
      const ix = uvx - 0.5
      const iy = uvy - 0.5

      const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6)
      const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15)
      const scaled = smoothStep(0, 1, displacement)

      const dx = (ix * scaled + 0.5) * w - x
      const dy = (iy * scaled + 0.5) * h - y

      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy))
      rawValues.push(dx, dy)
    }
  }

  if (maxScale > 0) maxScale = Math.max(maxScale, 1)
  else maxScale = 1

  const imageData = ctx.createImageData(w, h)
  const data = imageData.data
  let ri = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = rawValues[ri++] || 0
      const dy = rawValues[ri++] || 0

      const edgeDist = Math.min(x, y, w - x - 1, h - y - 1)
      const edgeFactor = Math.min(1, edgeDist / 2)
      const r = (dx * edgeFactor) / maxScale + 0.5
      const g = (dy * edgeFactor) / maxScale + 0.5

      const pi = (y * w + x) * 4
      data[pi]     = Math.max(0, Math.min(255, r * 255))
      data[pi + 1] = Math.max(0, Math.min(255, g * 255))
      data[pi + 2] = Math.max(0, Math.min(255, g * 255))
      data[pi + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  const url = canvas.toDataURL()
  canvas.remove()
  return url
}

// ===== Props =====
interface LiquidGlassProps {
  /** 位移强度 (数值越大边缘弯曲越明显) */
  displacementScale?: number
  /** 模糊量 (0-1 范围)，调到 0 就是完全透明的纯净液态玻璃 */
  blurAmount?: number
  /** 饱和度增强 (百分比) */
  saturation?: number
  /** 色散强度 */
  aberrationIntensity?: number
  /** 弹性系数 (液态感) */
  elasticity?: number
  /** 圆角 */
  cornerRadius?: number
  /** 内边距 */
  padding?: string
  /** 亮色模式 */
  overLight?: boolean
  /** 是否可点击 */
  clickable?: boolean
  /** 自定义 class */
  class?: string
  /** 标签类型 */
  tag?: string
}

const props = withDefaults(defineProps<LiquidGlassProps>(), {
  displacementScale: 60, // 稍微增强默认位移
  blurAmount: 0,         // 【关键】默认为 0，实现通透的纯净防玻璃，而不是毛玻璃
  saturation: 180,
  aberrationIntensity: 3,
  elasticity: 0.12,
  cornerRadius: 26,
  padding: '24px 32px',
  overLight: false,
  clickable: false,
  tag: 'div'
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

// ===== 状态 =====
const filterId = `lg-filter-${useId()}`
const containerRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isActive = ref(false)
const glassSize = ref({ width: 300, height: 100 })
const displacementMapUrl = ref('')

// ===== 生成位移贴图 =====
function updateDisplacementMap() {
  if (glassSize.value.width > 0 && glassSize.value.height > 0) {
    displacementMapUrl.value = generateDisplacementMap(
      glassSize.value.width,
      glassSize.value.height
    )
  }
}

// ===== 更新尺寸 =====
function updateSize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    glassSize.value = { width: rect.width, height: rect.height }
    updateDisplacementMap()
  }
}

// ===== 鼠标跟踪 =====
function handleMouseMove() {
  // 仅保留基础的固定角度光泽，不随鼠标移动
}

function handleMouseEnter() {
  // 无 hover 效果
}

function handleMouseLeave() {
  // 无 hover 效果
}

function handleMouseDown() {
  isActive.value = true
}

function handleMouseUp() {
  isActive.value = false
}

function handleClick() {
  if (props.clickable) emit('click')
}

// ===== 生命周期 =====
onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
})

// ===== 计算属性 =====

/** 边框渐变 — 永久显示，静态 */
const borderGradient1 = computed(() => {
  const angle = 135
  return `linear-gradient(${angle}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0) 100%)`
})

const borderGradient2 = computed(() => {
  const angle = 135
  return `linear-gradient(${angle}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0) 100%)`
})

/** 边缘遮罩中间停止点 */
const edgeMaskMidStop = computed(() =>
  `${Math.max(30, 80 - props.aberrationIntensity * 2)}%`
)

/** backdrop-filter：改为完全靠 SVG 滤镜，本身不带高斯模糊，除非手动传 blurAmount */
const backdropStyle = computed(() => {
  const blur = props.blurAmount * 20
  if (blur > 0) {
     return `blur(${blur}px) saturate(${props.saturation}%)`
  }
  return `saturate(${props.saturation}%)`
})

/** scale 点击效果 */
const activeScale = computed(() => isActive.value && props.clickable ? 0.97 : 1)

/** hover glow 不透明度 */
const hoverOpacity = computed(() => {
  if (isActive.value && props.clickable) return 0.8
  if (isHovered.value && props.clickable) return 0.4
  return 0
})
</script>

<template>
  <component
    :is="tag"
    ref="containerRef"
    class="liquid-glass-root"
    :style="{
      '--lg-corner-radius': `${cornerRadius}px`,
      '--lg-active-scale': activeScale,
    } as CSSProperties"
    @mousemove="handleMouseMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @click="handleClick"
  >
    <!-- SVG 滤镜定义 — 边缘位移 + 色散 -->
    <svg class="liquid-glass-svg" :width="glassSize.width" :height="glassSize.height" aria-hidden="true">
      <defs>
        <radialGradient :id="`${filterId}-edge-mask`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="black" stop-opacity="0" />
          <stop :offset="edgeMaskMidStop" stop-color="black" stop-opacity="0" />
          <stop offset="100%" stop-color="white" stop-opacity="1" />
        </radialGradient>

        <filter :id="filterId" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <!-- 位移贴图 -->
          <feImage
            x="0" y="0" width="100%" height="100%"
            result="DISPLACEMENT_MAP"
            :href="displacementMapUrl"
            preserveAspectRatio="xMidYMid slice"
          />

          <!-- 精简版：单通道位移（大幅提升性能） -->
          <feDisplacementMap
            in="SourceGraphic" in2="DISPLACEMENT_MAP"
            :scale="displacementScale" xChannelSelector="R" yChannelSelector="B"
            result="DISPLACED"
          />
          
          <!-- 边缘遮罩以平滑过渡 -->
          <feColorMatrix
            in="DISPLACEMENT_MAP" type="matrix"
            values="0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0"
            result="EDGE_INTENSITY"
          />
          <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
            <feFuncA type="discrete" tableValues="0 0.1 1" />
          </feComponentTransfer>
          
          <feComposite in="DISPLACED" in2="EDGE_MASK" operator="in" result="EDGE_REFRACTION" />
          <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          
          <!-- 原始未位移图像(中心) -->
          <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
          <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
          
          <!-- 合并边缘折射与清晰中心 -->
          <feComposite in="EDGE_REFRACTION" in2="CENTER_CLEAN" operator="over" />
        </filter>
      </defs>
    </svg>

    <!-- 玻璃主体 -->
    <div
      class="liquid-glass-body"
      :style="{
        borderRadius: `${cornerRadius}px`,
        padding,
        boxShadow: overLight
          ? '0px 16px 70px rgba(0, 0, 0, 0.75)'
          : '0px 12px 40px rgba(0, 0, 0, 0.15)',
      }"
    >
      <!-- 背景折射层 (应用 SVG 滤镜) -->
      <span
        class="liquid-glass-warp"
        :style="{
          filter: `url(#${filterId})`,
          backdropFilter: backdropStyle,
          WebkitBackdropFilter: backdropStyle,
        } as CSSProperties"
      />

      <!-- 内容(保持清晰) -->
      <div class="liquid-glass-content">
        <slot />
      </div>
    </div>

    <!-- 边框层 1 — mix-blend-mode: screen -->
    <span
      class="liquid-glass-border liquid-glass-border--screen"
      :style="{
        borderRadius: `${cornerRadius}px`,
        background: borderGradient1,
      }"
    />

    <!-- 边框层 2 — mix-blend-mode: overlay -->
    <span
      class="liquid-glass-border liquid-glass-border--overlay"
      :style="{
        borderRadius: `${cornerRadius}px`,
        background: borderGradient2,
      }"
    />

    <!-- Hover 效果层 -->
    <div
      v-if="clickable"
      class="liquid-glass-hover"
      :style="{
        borderRadius: `${cornerRadius}px`,
        opacity: hoverOpacity,
      }"
    />
  </component>
</template>

<style scoped>
.liquid-glass-root {
  position: relative;
  display: inline-block;
  /* 移除 hover/active 的 transform scale 动画 */
}

.liquid-glass-svg {
  position: absolute;
  pointer-events: none;
  opacity: 0;
}

.liquid-glass-body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  /* 加入底部的环境浸染，模拟 React 版本中基于背景的高斯混合 */
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(230, 240, 255, 0.08) 40%,
    rgba(255, 230, 245, 0.08) 70%,
    rgba(255, 255, 255, 0.12) 100%
  );
  /* 强制 GPU 渲染，防止父容器级别的重绘导致滤镜闪烁 */
  transform: translateZ(0);
}

/* 🧊 持续的内部光晕和折射 */
.liquid-glass-body::after {
  content: '';
  position: absolute;
  top: -30%;
  left: -30%;
  width: 160%;
  height: 160%;
  background:
    radial-gradient(
      ellipse at 25% 15%,
      rgba(180, 210, 255, 0.15) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 75% 85%,
      rgba(255, 180, 210, 0.12) 0%,
      transparent 50%
    );
  z-index: 0;
  /* 纯静态光晕：移除极其消耗性能的 infinite animation */
  transform: translate(0, 0);
}

/* 背景折射层 — 这一层被 SVG 滤镜处理 */
.liquid-glass-warp {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* 强制 GPU 渲染，修复 Chromium 内核下 hover 导致的重绘闪烁问题 */
  transform: translateZ(0);
  will-change: filter, backdrop-filter;
}

/* 内容层 — 保持在折射层之上，保持清晰 */
.liquid-glass-content {
  position: relative;
  z-index: 1;
  width: 100%;
  /* 防止子内容在 Chromium 中因 SVG 滤镜重绘而闪烁 */
  transform: translateZ(0);
}

/* 🌟 边框层 — 模拟玻璃边缘的光折射，永久可见 */
.liquid-glass-border {
  position: absolute;
  inset: 0;
  pointer-events: none;
  padding: 1.5px;
  /* 仅显示厚边框(掏空中间) */
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  /* 恒定的内发光和三维厚度 */
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.5) inset,
    0 1px 3px rgba(255, 255, 255, 0.25) inset,
    inset 0 -1px 2px rgba(255, 255, 255, 0.1);
}

.liquid-glass-border--screen {
  mix-blend-mode: screen;
  opacity: 0.6; /* 提高基础可见度 */
}

.liquid-glass-border--overlay {
  mix-blend-mode: overlay;
  opacity: 0.8; /* 提高基础可见度 */
}

/* Hover 效果 — 顶部径向渐变发光，增强互动感 */
.liquid-glass-hover {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(
    circle at 50% 0%,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0) 50%
  );
  mix-blend-mode: overlay;
  transition: opacity 0.2s ease-out;
}
</style>
