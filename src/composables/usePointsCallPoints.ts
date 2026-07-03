import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type { PointsMeDTO } from '@/api/points'

import { computed, ref } from 'vue'
import { getMyPoints } from '@/api/points'
import { unwrapApiData } from '@/api/response'
import { useRequestGuard } from '@/composables/useRequestGuard'

export interface UsePointsCallPointsOptions {
  costPerCall: number
  isAdmin: ComputedRef<boolean>
  message: MessageApi
}

export function usePointsCallPoints(options: UsePointsCallPointsOptions) {
  const pointsGuard = useRequestGuard()
  const pointsLoading = ref(false)
  const points = ref<number>(0)

  const canCall = computed(() => options.isAdmin.value || points.value >= options.costPerCall)

  function animatePoints(newValue: number) {
    const oldValue = points.value
    const duration = 1000
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOutQuad = (t: number) => t * (2 - t)
      const current = Math.floor(oldValue + (newValue - oldValue) * easeOutQuad(progress))

      points.value = current

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
      else {
        points.value = newValue
      }
    }

    requestAnimationFrame(animate)
  }

  async function fetchPoints() {
    const requestId = pointsGuard.next()
    pointsLoading.value = true
    try {
      const res = await getMyPoints()
      if (!pointsGuard.isCurrent(requestId))
        return

      const data = unwrapApiData<PointsMeDTO>(res, { points: 0 })
      const newPoints = Number(data.points ?? 0)

      if (points.value !== newPoints) {
        animatePoints(newPoints)
      }
      else {
        points.value = newPoints
      }
    }
    catch {
      if (!pointsGuard.isCurrent(requestId))
        return
      options.message.error('获取积分失败（请确认 /points/me + 前端带 Authorization）')
    }
    finally {
      if (pointsGuard.isCurrent(requestId))
        pointsLoading.value = false
    }
  }

  async function refreshPoints() {
    await fetchPoints()
  }

  return {
    canCall,
    fetchPoints,
    points,
    pointsLoading,
    refreshPoints,
  }
}
