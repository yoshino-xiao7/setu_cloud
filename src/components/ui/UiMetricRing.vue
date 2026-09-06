<script setup lang="ts">
import type { RecordTone } from './boardTypes'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: string
  caption?: string
  progress: number
  tone?: RecordTone
  diameter?: number
  lineWidth?: number
  accessibilityDescription?: string
}>(), { tone: 'brand', diameter: 88, lineWidth: 9 })
const progressValue = computed(() => Number.isFinite(props.progress) ? Math.min(1, Math.max(0, props.progress)) : 0)
const stroke = computed(() => Number.isFinite(props.lineWidth) ? Math.min(40, Math.max(1, props.lineWidth)) : 9)
const radius = computed(() => (100 - stroke.value) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const size = computed(() => Number.isFinite(props.diameter) ? Math.max(44, props.diameter) : 88)
</script>

<template>
  <div class="metric-ring" :data-tone="tone" :style="{ '--ring-size': `${size}px` }" role="img" :aria-label="accessibilityDescription ?? `${caption ?? ''} ${value}，${Math.round(progressValue * 100)}%`">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="metric-ring__track" cx="50" cy="50" :r="radius" fill="none" :stroke-width="stroke" />
      <circle class="metric-ring__progress" cx="50" cy="50" :r="radius" fill="none" :stroke-width="stroke" :stroke-dasharray="circumference" :stroke-dashoffset="circumference * (1 - progressValue)" transform="rotate(-90 50 50)" stroke-linecap="round" />
    </svg>
    <div class="metric-ring__label" aria-hidden="true">
      <strong>{{ value }}</strong><span v-if="caption">{{ caption }}</span>
    </div>
  </div>
</template>
