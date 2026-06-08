<script setup lang="ts">
import { CloseOutline, ContractOutline, ExpandOutline, LockClosedOutline, LockOpenOutline, VideocamOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NModal } from 'naive-ui'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const { width } = useBreakpoint()
const mvVideoRef = ref<HTMLVideoElement>()
const modalVideoContainer = ref<HTMLElement>()
const miniVideoContainer = ref<HTMLElement>()

// ✅ 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const playerX = ref(20) // 距离右侧
const playerY = ref(20) // 距离底部

// ✅ 锁定状态
const isLocked = ref(false)

// ✅ 跟踪定时器 ID，便于组件销毁时清理
let autoplayTimer: ReturnType<typeof setTimeout> | null = null

// ✅ 加载保存的位置
function loadPosition() {
  try {
    const saved = localStorage.getItem('mv_player_position')
    if (saved) {
      const { x, y, locked } = JSON.parse(saved)
      playerX.value = x
      playerY.value = y
      isLocked.value = locked || false
    }
  }
  catch {}
}

// ✅ 保存位置
function savePosition() {
  try {
    localStorage.setItem('mv_player_position', JSON.stringify({
      x: playerX.value,
      y: playerY.value,
      locked: isLocked.value
    }))
  }
  catch {}
}

// ✅ 切换锁定状态
function toggleLock() {
  isLocked.value = !isLocked.value
  savePosition()
}

// ✅ 开始拖拽
function handleDragStart(e: MouseEvent | TouchEvent) {
  // ✅ 如果已锁定，不允许拖拽
  if (isLocked.value)
    return

  isDragging.value = true

  if (e instanceof MouseEvent) {
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
  }
  else if (e.touches && e.touches.length > 0) {
    dragStartX.value = e.touches[0]!.clientX
    dragStartY.value = e.touches[0]!.clientY
  }

  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchmove', handleDragMove, { passive: false })
  document.addEventListener('touchend', handleDragEnd)

  e.preventDefault()
}

// ✅ 拖拽中
function handleDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value)
    return

  let clientX: number, clientY: number
  if (e instanceof MouseEvent) {
    clientX = e.clientX
    clientY = e.clientY
  }
  else if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0]!.clientX
    clientY = e.touches[0]!.clientY
  }
  else {
    return
  }

  const deltaX = dragStartX.value - clientX
  const deltaY = dragStartY.value - clientY // ✅ 修正：向上拖动减小bottom，向下拖动增大bottom

  // ✅ 更新位置（限制在视窗范围内）
  const maxPlayerX = Math.max(10, width.value - 300)
  const newX = Math.max(10, Math.min(maxPlayerX, playerX.value + deltaX))
  const newY = Math.max(10, Math.min(window.innerHeight - 200, playerY.value + deltaY))

  playerX.value = newX
  playerY.value = newY

  dragStartX.value = clientX
  dragStartY.value = clientY

  e.preventDefault()
}

// ✅ 结束拖拽
function handleDragEnd() {
  if (isDragging.value) {
    isDragging.value = false
    savePosition()

    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)
  }
}

// 切换到画中画模式
async function toggleMinimize() {
  musicStore.toggleMvMinimize()

  // ✅ 等待 DOM 更新，然后移动 video 元素
  await nextTick()
  if (mvVideoRef.value && miniVideoContainer.value) {
    miniVideoContainer.value.appendChild(mvVideoRef.value)
  }
}

// 从画中画恢复
async function expandFromMinimized() {
  musicStore.toggleMvMinimize()

  // ✅ 等待 DOM 更新，然后移动 video 元素
  await nextTick()
  if (mvVideoRef.value && modalVideoContainer.value) {
    modalVideoContainer.value.appendChild(mvVideoRef.value)
  }
}

// 关闭 MV
function handleCloseMv() {
  musicStore.closeMv()
}

// 双击全屏
function handleVideoDoubleClick() {
  if (mvVideoRef.value) {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    else {
      mvVideoRef.value.requestFullscreen()
    }
  }
}

// 监听 MV URL 变化，自动播放
watch(() => musicStore.currentMvUrl, async (url) => {
  if (url) {
    // ✅ 等待 DOM 更新
    await nextTick()

    if (mvVideoRef.value) {
      // ✅ 将 video 元素放入对应的容器
      const container = musicStore.mvPlayerMinimized ? miniVideoContainer.value : modalVideoContainer.value
      if (container && mvVideoRef.value.parentElement !== container) {
        container.appendChild(mvVideoRef.value)
      }

      // 延迟确保视频已加载
      autoplayTimer = setTimeout(() => {
        if (mvVideoRef.value) {
          mvVideoRef.value.play().catch(() => {})
        }
      }, 100)
    }
  }
})

// ✅ MV 视频加载错误处理：静默降级到 HTTP
function handleMvVideoError(_e: Event) {
  const mvInfo = musicStore.currentMvInfo

  // 检查是否有原始 HTTP URL 可用于降级
  if (mvInfo?.originalUrl && musicStore.currentMvUrl !== mvInfo.originalUrl) {
    // 静默降级：更新 store 中的 URL
    musicStore.currentMvUrl = mvInfo.originalUrl

    // 清除原始 URL，防止重复降级
    musicStore.currentMvInfo = {
      ...mvInfo,
      originalUrl: undefined
    }
  }
}

// ✅ 组件挂载时加载位置
onMounted(() => {
  loadPosition()
})

// ✅ 组件销毁时清理所有事件监听器和定时器，防止内存泄漏
onUnmounted(() => {
  // 清理拖拽事件监听器（即使拖拽尚未结束）
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('touchend', handleDragEnd)
  isDragging.value = false

  // 清理自动播放定时器
  if (autoplayTimer) {
    clearTimeout(autoplayTimer)
    autoplayTimer = null
  }
})
</script>

<template>
  <!-- ✅ 共享的 video 元素 -->
  <video
    v-if="musicStore.currentMvUrl"
    ref="mvVideoRef"
    :src="musicStore.currentMvUrl"
    controls
    autoplay
    controlsList="nodownload"
    class="shared-video"
    @dblclick="handleVideoDoubleClick"
    @error="handleMvVideoError"
  />

  <!-- ✅ MV 模态框 -->
  <NModal
    v-model:show="musicStore.showMvModal"
    preset="card"
    :style="{ width: '90%', maxWidth: '1200px' }"
    :bordered="false"
    :segmented="{
      content: true,
      footer: 'soft',
    }"
  >
    <template #header>
      <div class="mv-player-header">
        <div class="mv-info">
          <NIcon size="24" color="#f586a9">
            <VideocamOutline />
          </NIcon>
          <div class="mv-title">
            <div class="mv-name">
              {{ musicStore.currentMvInfo?.name }}
            </div>
            <div class="mv-artist">
              {{ musicStore.currentMvInfo?.artist }}
            </div>
          </div>
        </div>
        <div class="mv-header-actions">
          <NButton circle quaternary title="缩小" @click="toggleMinimize">
            <template #icon>
              <NIcon><ContractOutline /></NIcon>
            </template>
          </NButton>
          <NButton circle quaternary title="关闭" @click="handleCloseMv">
            <template #icon>
              <NIcon><CloseOutline /></NIcon>
            </template>
          </NButton>
        </div>
      </div>
    </template>

    <!-- ✅ 模态框中的 video 容器 -->
    <div ref="modalVideoContainer" class="mv-player-content" />
  </NModal>

  <!-- ✅ 画中画浮动卡片 -->
  <transition name="mini-player">
    <div
      v-if="musicStore.mvPlayerMinimized && musicStore.currentMvUrl"
      class="mini-mv-player glass-card"
      :class="{ 'is-dragging': isDragging }"
      :style="{ right: `${playerX}px`, bottom: `${playerY}px` }"
    >
      <div
        class="mini-mv-header"
        :class="{ 'is-locked': isLocked }"
        @mousedown="handleDragStart"
        @touchstart="handleDragStart"
      >
        <div class="mini-mv-info">
          <NIcon size="18" color="#f586a9">
            <VideocamOutline />
          </NIcon>
          <div class="mini-mv-title">
            <div class="mini-mv-name">
              {{ musicStore.currentMvInfo?.name }}
            </div>
            <div class="mini-mv-artist">
              {{ musicStore.currentMvInfo?.artist }}
            </div>
          </div>
        </div>
        <div class="mini-mv-actions">
          <NButton
            circle
            size="small"
            :type="isLocked ? 'primary' : 'default'"
            quaternary
            :title="isLocked ? '解锁' : '锁定'"
            @click.stop="toggleLock"
          >
            <template #icon>
              <NIcon size="16">
                <LockClosedOutline v-if="isLocked" />
                <LockOpenOutline v-else />
              </NIcon>
            </template>
          </NButton>
          <NButton circle size="small" quaternary title="放大" @click="expandFromMinimized">
            <template #icon>
              <NIcon size="16">
                <ExpandOutline />
              </NIcon>
            </template>
          </NButton>
          <NButton circle size="small" quaternary title="关闭" @click="handleCloseMv">
            <template #icon>
              <NIcon size="16">
                <CloseOutline />
              </NIcon>
            </template>
          </NButton>
        </div>
      </div>
      <!-- ✅ 画中画中的 video 容器 -->
      <div ref="miniVideoContainer" class="mini-mv-video-wrapper" />
    </div>
  </transition>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
}

/* ✅ 共享 video 元素（默认隐藏） */
video.shared-video {
  position: absolute;
  top: -9999px;
  left: -9999px;
  visibility: hidden;
}

/* ✅ 在容器内时显示 */
.mv-player-content video,
.mini-mv-video-wrapper video {
  position: static;
  visibility: visible;
}

/* ✅ MV 播放器样式 */
.mv-player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.mv-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mv-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mv-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mv-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.mv-artist {
  font-size: 14px;
  color: #6b7280;
}

.mv-player-content {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

/* ✅ video 元素通用样式 */
.mv-player-content video,
.mini-mv-video-wrapper video {
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
}

/* ✅ 模态框中的 video */
.mv-player-content video {
  max-height: 70vh;
}

/* ✅ 画中画浮动卡片 */
.mini-mv-player {
  position: fixed;
  /* bottom 和 right 由 style 动态绑定 */
  width: 400px;
  max-width: calc(100vw - 40px);
  z-index: 2500;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-mv-player:hover {
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.4);
}

/* ✅ 拖拽状态 */
.mini-mv-player.is-dragging {
  box-shadow: 0 20px 64px rgba(0, 0, 0, 0.5);
  cursor: move;
  cursor: grab;
  cursor: -webkit-grab;
  transition: none;
}

.mini-mv-player.is-dragging:active {
  cursor: grabbing;
  cursor: -webkit-grabbing;
}

.mini-mv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: move;
  cursor: grab;
  cursor: -webkit-grab;
  user-select: none;
  transition: background 0.3s ease;
}

.mini-mv-header:active {
  cursor: grabbing;
  cursor: -webkit-grabbing;
}

/* ✅ 锁定状态 */
.mini-mv-header.is-locked {
  cursor: default;
  background: rgba(240, 248, 255, 0.95);
}

.mini-mv-header.is-locked:active {
  cursor: default;
}

.mini-mv-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.mini-mv-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.mini-mv-name {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-mv-artist {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-mv-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mini-mv-video-wrapper {
  width: 100%;
  background: #000;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

/* ✅ 画中画中的 video */
.mini-mv-video-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ✅ 浮动卡片动画 */
.mini-player-enter-active,
.mini-player-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-player-enter-from {
  opacity: 0;
  transform: translateY(100px) scale(0.8);
}

.mini-player-leave-to {
  opacity: 0;
  transform: translateY(100px) scale(0.8);
}

/* ✅ 移动端适配 */
@media (max-width: 768px) {
  .mini-mv-player {
    width: 300px;
    bottom: 80px;
    right: 16px;
  }
}
</style>
