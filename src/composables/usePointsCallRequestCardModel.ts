import type { PointsCallImageSize, PointsCallR18Mode } from '@/composables/usePointsCallDefaults'
import { computed } from 'vue'

export interface PointsCallRequestCardProps {
  canCall: boolean
  calling: boolean
  costPerCall: number
  excludeAi: boolean
  isAdmin: boolean
  keyword: string
  num: number
  points: number
  pointsLoading: boolean
  r18: PointsCallR18Mode
  size: PointsCallImageSize
  tagText: string
}

export interface PointsCallRequestCardEmit {
  (event: 'update:excludeAi', value: boolean): void
  (event: 'update:keyword', value: string): void
  (event: 'update:num', value: number): void
  (event: 'update:r18', value: PointsCallR18Mode): void
  (event: 'update:size', value: PointsCallImageSize): void
  (event: 'update:tagText', value: string): void
}

export function usePointsCallRequestCardModel(
  props: PointsCallRequestCardProps,
  emit: PointsCallRequestCardEmit,
) {
  const r18Value = computed({
    get: () => props.r18,
    set: value => emit('update:r18', value),
  })

  const numValue = computed({
    get: () => props.num,
    set: (value) => {
      if (typeof value === 'number')
        emit('update:num', value)
    },
  })

  const keywordValue = computed({
    get: () => props.keyword,
    set: value => emit('update:keyword', value),
  })

  const tagTextValue = computed({
    get: () => props.tagText,
    set: value => emit('update:tagText', value),
  })

  const sizeValue = computed({
    get: () => props.size,
    set: value => emit('update:size', value),
  })

  const excludeAIValue = computed({
    get: () => props.excludeAi,
    set: value => emit('update:excludeAi', value),
  })

  return {
    excludeAIValue,
    keywordValue,
    numValue,
    r18Value,
    sizeValue,
    tagTextValue,
  }
}
