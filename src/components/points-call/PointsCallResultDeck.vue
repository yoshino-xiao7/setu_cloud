<script setup lang="ts">
import type { SetuImageItem } from '@/api/setu'
import type { PointsCallDeckCard } from '@/composables/usePointsCallDefaults'

import {
  ChevronBackOutline,
  ChevronForwardOutline,
  ImageOutline,
  PersonOutline,
  PricetagOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImageGroup,
  NSkeleton,
  NTag,
  NTooltip,
} from 'naive-ui'
import PointsCallResultCard from '@/components/points-call/PointsCallResultCard.vue'
import {
  getHiddenPointsCallTagCount,
  getVisiblePointsCallTags,
} from '@/composables/usePointsCallDefaults'

defineProps<{
  activeIndex: number
  activeResult: SetuImageItem | null
  deckCards: PointsCallDeckCard[]
  loading: boolean
  results: SetuImageItem[]
}>()

const emit = defineEmits<{
  deleteRequest: [item: SetuImageItem]
  download: [src: string, item: SetuImageItem]
  favorite: [item: SetuImageItem]
  openOriginal: [src: string]
  select: [index: number]
  showNext: []
  showPrevious: []
}>()
</script>

<template>
  <NCard class="glass-card ui-card right-card" :bordered="false">
    <div class="right-title">
      <div class="rt">
        <NIcon><ImageOutline /></NIcon>
        <span>返回结果（点击图片预览）</span>
      </div>
      <NTag size="small" round :bordered="false" type="info">
        {{ results.length }}
      </NTag>
    </div>

    <div v-if="loading" class="loading-grid">
      <div v-for="n in 8" :key="n" class="skeleton-card">
        <NSkeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
      </div>
    </div>

    <div v-else-if="!results.length" class="empty-box">
      <NEmpty description="还没有调用结果" size="large">
        <template #icon>
          <NIcon><ImageOutline /></NIcon>
        </template>
      </NEmpty>
    </div>

    <NImageGroup v-else>
      <div class="result-deck">
        <div v-if="results.length > 1" class="deck-toolbar">
          <NTooltip trigger="hover">
            <template #trigger>
              <NButton circle secondary class="deck-nav-button" aria-label="上一张" @click="emit('showPrevious')">
                <template #icon>
                  <NIcon><ChevronBackOutline /></NIcon>
                </template>
              </NButton>
            </template>
            上一张
          </NTooltip>

          <div class="deck-counter">
            <span>{{ activeIndex + 1 }}</span>
            <span>/</span>
            <span>{{ results.length }}</span>
          </div>

          <NTooltip trigger="hover">
            <template #trigger>
              <NButton circle secondary class="deck-nav-button" aria-label="下一张" @click="emit('showNext')">
                <template #icon>
                  <NIcon><ChevronForwardOutline /></NIcon>
                </template>
              </NButton>
            </template>
            下一张
          </NTooltip>
        </div>

        <div class="deck-stage">
          <div
            v-for="card in deckCards"
            :key="card.key"
            class="deck-card-shell"
            :class="{ 'is-active': card.index === activeIndex }"
            :style="card.style"
            @click="card.index !== activeIndex && emit('select', card.index)"
          >
            <PointsCallResultCard
              :index="card.index"
              :is-active="card.index === activeIndex"
              :item="card.item"
              @delete-request="item => emit('deleteRequest', item)"
              @download="(src, item) => emit('download', src, item)"
              @favorite="item => emit('favorite', item)"
              @open-original="src => emit('openOriginal', src)"
            />
          </div>
        </div>

        <div v-if="results.length > 1" class="deck-tabs">
          <button
            v-for="(it, index) in results"
            :key="`${it.pid}-${it.p ?? 0}-dot-${index}`"
            type="button"
            class="deck-dot"
            :class="{ 'is-active': index === activeIndex }"
            @click="emit('select', index)"
          >
            {{ index + 1 }}
          </button>
        </div>

        <div v-if="activeResult" class="info-box deck-info">
          <div class="img-title" :title="activeResult.title || ''">
            {{ activeResult.title || '无标题' }}
          </div>

          <div class="img-meta">
            <div class="author">
              <NIcon><PersonOutline /></NIcon>
              <span>{{ activeResult.author || '未知画师' }}</span>
            </div>
            <span class="pid">ID: {{ activeResult.pid }}</span>
          </div>

          <div v-if="Array.isArray(activeResult.tags) && activeResult.tags.length" class="tag-row">
            <div class="tag-row-title">
              <NIcon size="14" style="opacity:.75;">
                <PricetagOutline />
              </NIcon>
              <span>标签</span>
            </div>
            <div class="tags">
              <NTag
                v-for="t in getVisiblePointsCallTags(activeResult)"
                :key="t"
                size="small"
                round
                :bordered="false"
                type="info"
                class="tag"
              >
                {{ t }}
              </NTag>

              <NTag
                v-if="getHiddenPointsCallTagCount(activeResult) > 0"
                size="small"
                round
                :bordered="false"
                type="default"
                class="tag more"
              >
                +{{ getHiddenPointsCallTagCount(activeResult) }}
              </NTag>
            </div>
          </div>
        </div>
      </div>
    </NImageGroup>
  </NCard>
</template>

<style scoped>
.glass-card {
  border-radius: var(--ui-radius-xl) !important;
}

.right-card {
  overflow: hidden;
}

.right-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ui-border-subtle);
}

.rt {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 18px;
  color: var(--ui-text);
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.skeleton-card {
  aspect-ratio: 2 / 3;
  border-radius: 20px;
  overflow: hidden;
}

.empty-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.result-deck {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.deck-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
}

.deck-nav-button {
  width: 38px;
  height: 38px;
}

.deck-counter {
  min-width: 84px;
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ui-text);
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(245, 134, 169, 0.18);
  box-shadow: 0 8px 22px rgba(31, 41, 55, 0.07);
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.deck-stage {
  position: relative;
  width: 100%;
  height: clamp(600px, 64vw, 720px);
  overflow: hidden;
  perspective: 1200px;
}

.deck-card-shell {
  position: absolute;
  top: 0;
  left: 50%;
  width: min(430px, calc(100% - 104px));
  transform-origin: center top;
  cursor: pointer;
  will-change: transform, opacity;
  transition:
    transform 0.44s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.28s ease;
}

.deck-card-shell.is-active {
  cursor: default;
}

.deck-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  width: min(520px, 100%);
}

.deck-dot {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.22);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.deck-dot:hover {
  transform: translateY(-1px);
  color: #f586a9;
  box-shadow: inset 0 0 0 1px rgba(245, 134, 169, 0.32), 0 8px 18px rgba(245, 134, 169, 0.12);
}

.deck-dot.is-active {
  color: #fff;
  background: #f586a9;
  box-shadow: 0 10px 22px rgba(245, 134, 169, 0.28);
}

.deck-info {
  width: min(520px, 100%);
  border-radius: 18px;
  border: 1px solid rgba(245, 134, 169, 0.14);
  box-shadow: 0 16px 36px rgba(31, 41, 55, 0.08);
}

.info-box {
  padding: 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.img-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ui-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.img-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.author {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 60%;
}

.author span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pid {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.75;
  background: rgba(245, 134, 169, 0.1);
  color: #f586a9;
  padding: 4px 8px;
  border-radius: 10px;
}

.tag-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.tag-row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 800;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  max-width: 100%;
  font-weight: 600;
}

.more {
  opacity: 0.7;
}

@media (max-width: 640px) {
  .deck-toolbar {
    gap: 12px;
  }

  .deck-counter {
    min-width: 76px;
    height: 34px;
    padding: 0 12px;
  }

  .deck-stage {
    height: clamp(510px, 142vw, 600px);
  }

  .deck-card-shell {
    width: min(360px, calc(100% - 44px));
  }

  .deck-tabs {
    gap: 6px;
  }

  .deck-dot {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .deck-info {
    width: 100%;
    border-radius: 16px;
  }

  .info-box {
    padding: 14px 16px 16px;
  }

  .img-title {
    font-size: 15px;
  }

  .img-meta {
    font-size: 12px;
  }

  .tags {
    gap: 6px;
  }

}
</style>
