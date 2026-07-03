<script setup lang="ts">
import type { SetuImageItem } from '@/api/setu'

import {
  DownloadOutline,
  EyeOutline,
  HeartOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
  NImage,
  NTag,
  NTooltip,
} from 'naive-ui'
import {
  pickPointsCallCoverSrc,
  pickPointsCallOriginalSrc,
  pickPointsCallPreviewSrc,
} from '@/composables/usePointsCallDefaults'

defineProps<{
  index: number
  isActive: boolean
  item: SetuImageItem
}>()

const emit = defineEmits<{
  deleteRequest: [item: SetuImageItem]
  download: [src: string, item: SetuImageItem]
  favorite: [item: SetuImageItem]
  openOriginal: [src: string]
}>()
</script>

<template>
  <div class="img-card ui-card deck-image-card" :class="{ 'is-muted': !isActive }">
    <div class="img-box deck-img-box">
      <NImage
        v-if="isActive"
        lazy
        :src="pickPointsCallCoverSrc(item)"
        :preview-src="pickPointsCallPreviewSrc(item)"
        object-fit="cover"
        class="img"
        :img-props="{ referrerpolicy: 'no-referrer' }"
      />

      <img
        v-else
        :src="pickPointsCallCoverSrc(item)"
        :alt="item.title || ''"
        class="deck-img-plain"
        referrerpolicy="no-referrer"
        draggable="false"
        loading="lazy"
        decoding="async"
      >

      <div v-if="isActive" class="corner-actions">
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              circle
              color="#fff"
              class="action-btn"
              @click.stop="emit('openOriginal', pickPointsCallOriginalSrc(item))"
            >
              <template #icon>
                <NIcon color="#333">
                  <EyeOutline />
                </NIcon>
              </template>
            </NButton>
          </template>
          查看原图
        </NTooltip>

        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              circle
              color="#fff"
              class="action-btn"
              @click.stop="emit('download', pickPointsCallOriginalSrc(item), item)"
            >
              <template #icon>
                <NIcon color="#333">
                  <DownloadOutline />
                </NIcon>
              </template>
            </NButton>
          </template>
          原图下载
        </NTooltip>

        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              circle
              color="#f586a9"
              class="action-btn"
              @click.stop="emit('favorite', item)"
            >
              <template #icon>
                <NIcon color="#fff">
                  <HeartOutline />
                </NIcon>
              </template>
            </NButton>
          </template>
          收藏到收藏夹
        </NTooltip>

        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              circle
              color="#ef4444"
              class="action-btn"
              @click.stop="emit('deleteRequest', item)"
            >
              <template #icon>
                <NIcon color="#fff">
                  <TrashOutline />
                </NIcon>
              </template>
            </NButton>
          </template>
          申请删除图片
        </NTooltip>
      </div>

      <div class="badges">
        <NTag v-if="item.r18 === true || item.r18 === 1" type="error" size="tiny" round class="badge">
          R-18
        </NTag>
        <NTag v-if="Number(item.p) > 0" type="warning" size="tiny" round class="badge">
          P{{ item.p }}
        </NTag>
      </div>

      <div v-if="!isActive" class="deck-card-number">
        {{ index + 1 }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-image-card {
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(31, 41, 55, 0.14), 0 18px 42px rgba(245, 134, 169, 0.12);
  background: rgba(255, 255, 255, 0.9);
}

.deck-image-card.is-muted {
  filter: saturate(0.92) contrast(0.96);
}

.deck-image-card.is-muted:hover {
  box-shadow: 0 22px 46px rgba(31, 41, 55, 0.14), 0 10px 24px rgba(245, 134, 169, 0.1);
}

.deck-img-box {
  border-radius: 20px;
}

.deck-img-plain {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  user-select: none;
}

.deck-card-number {
  position: absolute;
  left: 12px;
  bottom: 12px;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2);
  font-size: 13px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.img-card {
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.26s ease, box-shadow 0.26s ease, border-color 0.26s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: fadeInUp 0.6s ease-out both;
}

.img-card:nth-child(1) { animation-delay: 0.05s; }
.img-card:nth-child(2) { animation-delay: 0.1s; }
.img-card:nth-child(3) { animation-delay: 0.15s; }
.img-card:nth-child(4) { animation-delay: 0.2s; }
.img-card:nth-child(5) { animation-delay: 0.25s; }
.img-card:nth-child(6) { animation-delay: 0.3s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.img-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(135deg, rgba(245, 134, 169, 0.4), rgba(252, 165, 200, 0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
  z-index: 1;
}

.img-card:hover::before {
  opacity: 1;
}

.img-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 50px rgba(31, 41, 55, 0.12), 0 16px 34px rgba(245, 134, 169, 0.12);
  border-color: rgba(245, 134, 169, 0.22);
  z-index: 10;
}

.img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  overflow: hidden;
  flex-shrink: 0;
}

.img {
  width: 100%;
  height: 100%;
  display: block;
}

:deep(.img img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  cursor: zoom-in;
}

.img-card:hover :deep(.img img) {
  transform: scale(1.05);
}

.corner-actions {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 10px;
  z-index: 3;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 40px;
  height: 40px;
}

.action-btn:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.badges {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  pointer-events: none;
  z-index: 3;
}

.badge {
  font-weight: 800;
  opacity: 0.95;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 640px) {
  .img-card {
    max-width: 100%;
    border-radius: 16px;
  }

  .img-card:hover {
    transform: translateY(-6px) scale(1.01);
  }

  .deck-card-number {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }

  .corner-actions {
    right: 10px;
    bottom: 10px;
    gap: 8px;
  }

  .action-btn {
    width: 42px;
    height: 42px;
  }

  .deck-img-box {
    aspect-ratio: 2 / 3;
  }
}
</style>
