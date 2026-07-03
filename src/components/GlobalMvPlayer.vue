<script setup lang="ts">
import { CloseOutline, ContractOutline, ExpandOutline, LockClosedOutline, LockOpenOutline, VideocamOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NModal } from 'naive-ui'
import { useGlobalMvPlayer } from '@/composables/useGlobalMvPlayer'

const {
  musicStore,
  mvVideoRef,
  modalVideoContainer,
  miniVideoContainer,
  isDragging,
  playerX,
  playerY,
  isLocked,
  toggleLock,
  handleDragStart,
  toggleMinimize,
  expandFromMinimized,
  handleCloseMv,
  handleVideoDoubleClick,
  handleMvVideoError,
} = useGlobalMvPlayer()
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
    max-width: calc(100vw - 32px);
    bottom: 80px;
    right: 16px;
    left: auto;
  }
}

@media (max-width: 360px) {
  .mini-mv-player {
    width: calc(100vw - 20px);
    right: 10px;
  }
}
</style>
