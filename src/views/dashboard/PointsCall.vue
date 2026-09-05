<script setup lang="ts">
import ImageDeleteSubmitModal from '@/components/ImageDeleteSubmitModal.vue'
import PointsCallFavoriteModal from '@/components/points-call/PointsCallFavoriteModal.vue'
import PointsCallOverview from '@/components/points-call/PointsCallOverview.vue'
import PointsCallRequestCard from '@/components/points-call/PointsCallRequestCard.vue'
import PointsCallResultDeck from '@/components/points-call/PointsCallResultDeck.vue'
import { usePointsCallPage } from '@/composables/usePointsCallPage'

const {
  activeResult,
  activeResultIndex,
  canCall,
  calling,
  callSetu,
  costPerCall,
  createClickSpark,
  deckCards,
  form,
  deleteRequestImageData,
  deleteRequestModalVisible,
  downloadOriginal,
  favCollections,
  favLoading,
  favModal,
  favSelectedId,
  goToPointsLogs,
  isAdmin,
  onDeleteRequestSuccess,
  openFav,
  openOriginal,
  openDeleteRequest,
  points,
  pointsLoading,
  refreshAll,
  resultLoading,
  results,
  scrollProgress,
  setActiveResultIndex,
  showNextResult,
  showPreviousResult,
  submitFav,
} = usePointsCallPage()
</script>

<template>
  <div class="page-container ui-page">
    <!-- ✅ 滚动进度条 -->
    <div class="scroll-progress-bar">
      <div class="scroll-progress-fill" :style="{ width: `${scrollProgress}%` }" />
    </div>

    <div class="header-section ui-page-header">
      <div>
        <h2 class="title ui-page-title">
          积分调用
        </h2>
        <p class="subtitle ui-page-subtitle">
          每次调用 <b>/setu/v2</b> 消耗 <b>{{ costPerCall }}</b> 积分 · 每日登录可领 <b>1000</b> 积分
        </p>
      </div>
    </div>

    <PointsCallOverview
      :cost-per-call="costPerCall"
      :is-admin="isAdmin"
      :points="points"
      :points-loading="pointsLoading"
      :result-count="results.length"
    />

    <div class="layout">
      <!-- 左侧：积分 + 调用表单 -->
      <div class="left">
        <PointsCallRequestCard
          v-model:exclude-ai="form.excludeAI"
          v-model:keyword="form.keyword"
          v-model:num="form.num"
          v-model:r18="form.r18"
          v-model:size="form.size"
          v-model:tag-text="form.tagText"
          :can-call="canCall"
          :calling="calling"
          :cost-per-call="costPerCall"
          :is-admin="isAdmin"
          :points="points"
          :points-loading="pointsLoading"
          @call="(e) => { createClickSpark(e); callSetu(); }"
          @logs="goToPointsLogs"
          @refresh="refreshAll"
        />
      </div>

      <!-- 右侧：结果展示（点击图片可预览大图） -->
      <div class="right">
        <PointsCallResultDeck
          :active-index="activeResultIndex"
          :active-result="activeResult"
          :deck-cards="deckCards"
          :loading="resultLoading"
          :results="results"
          @delete-request="openDeleteRequest"
          @download="downloadOriginal"
          @favorite="openFav"
          @open-original="openOriginal"
          @select="setActiveResultIndex"
          @show-next="showNextResult"
          @show-previous="showPreviousResult"
        />
      </div>
    </div>

    <PointsCallFavoriteModal
      v-model:selected-id="favSelectedId"
      v-model:show="favModal"
      :collections="favCollections"
      :loading="favLoading"
      @submit="submitFav"
    />

    <!-- 申请删除图片弹窗 -->
    <ImageDeleteSubmitModal
      v-model:show="deleteRequestModalVisible"
      :image-data="deleteRequestImageData"
      @success="onDeleteRequestSuccess"
    />
  </div>
</template>

<style scoped>
/* ======================
   ✅ 滚动进度条
   ====================== */
.scroll-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(245, 134, 169, 0.1);
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.scroll-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ui-primary) 0%, #fca5c8 50%, #ff9a9e 100%);
  transition: width 0.1s ease;
  box-shadow: 0 0 10px rgba(245, 134, 169, 0.5);
}

/* ======================
   ✅ 涟漪效果
   ====================== */
.ripple-container {
  position: relative;
  overflow: hidden;
}

.ripple-effect {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* ======================
   ✨ 点击火花效果（ClickSpark）
   ====================== */
.click-spark {
  position: fixed;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffd700, #ff69b4, transparent);
  pointer-events: none;
  z-index: 9999;
  animation: spark-fly 0.6s ease-out forwards;
}

@keyframes spark-fly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}

.page-container {
  padding-bottom: 100px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.header-section {
  text-align: left;
}

.title {
  margin: 0;
}

.subtitle {
  margin-top: 8px;
}

.layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .page-container {
    gap: 24px;
  }

  .layout {
    gap: 20px;
  }

}
</style>
