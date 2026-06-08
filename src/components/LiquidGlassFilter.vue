<script setup lang="ts">
/**
 * LiquidGlassFilter.vue
 * 全局 SVG 滤镜组件 — 提供液态玻璃折射/高光效果的 SVG filter 定义
 * 
 * 使用方式：在 App.vue 中挂载此组件一次即可
 * CSS 中通过 filter: url(#lg-refraction) 引用
 */
</script>

<template>
  <!-- 全局 SVG 滤镜定义（不可见，仅供 CSS filter 引用） -->
  <svg 
    style="position: absolute; width: 0; height: 0; overflow: hidden;" 
    aria-hidden="true"
  >
    <defs>
      <!-- 
        液态折射滤镜 
        用于为玻璃元素添加微妙的折射变形效果
        使用: filter: url(#lg-refraction)
      -->
      <filter id="lg-refraction" x="-10%" y="-10%" width="120%" height="120%">
        <!-- 1. 对源图像进行轻微高斯模糊 -->
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blurred" />
        
        <!-- 2. 生成噪声纹理用于位移映射 -->
        <feTurbulence 
          type="fractalNoise" 
          baseFrequency="0.015" 
          numOctaves="3" 
          seed="42"
          result="noise" 
        />
        
        <!-- 3. 使用噪声做微弱位移，模拟折射 -->
        <feDisplacementMap 
          in="blurred" 
          in2="noise" 
          scale="3" 
          xChannelSelector="R" 
          yChannelSelector="G" 
          result="refracted"
        />
        
        <!-- 4. 与原始图像混合 -->
        <feBlend in="refracted" in2="SourceGraphic" mode="normal" />
      </filter>

      <!-- 
        高光滤镜
        用于为元素添加微妙的顶部高光
        使用: filter: url(#lg-specular)
      -->
      <filter id="lg-specular" x="0" y="0" width="100%" height="100%">
        <!-- 提取亮部 -->
        <feColorMatrix 
          type="luminanceToAlpha" 
          in="SourceGraphic" 
          result="luma" 
        />
        
        <!-- 模糊高光 -->
        <feGaussianBlur in="luma" stdDeviation="8" result="blurredLuma" />
        
        <!-- 叠加到原始图像上 -->
        <feComposite 
          in="SourceGraphic" 
          in2="blurredLuma" 
          operator="over" 
        />
      </filter>

      <!-- 
        光晕滤镜
        用于为品牌色元素添加柔和发光
        使用: filter: url(#lg-glow)
      -->
      <filter id="lg-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="glowed" />
        <feColorMatrix 
          in="glowed" 
          type="matrix" 
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.5 0"
          result="dimmedGlow" 
        />
        <feMerge>
          <feMergeNode in="dimmedGlow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
</template>
