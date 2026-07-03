import type { ComputedRef } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'

export interface UsePointsCallPageEffectsOptions {
  isMobile: ComputedRef<boolean>
  refreshAll: () => Promise<void>
}

export function usePointsCallPageEffects(options: UsePointsCallPageEffectsOptions) {
  const scrollProgress = ref(0)
  let scrollRaf = 0

  function updateScrollProgress() {
    cancelAnimationFrame(scrollRaf)
    scrollRaf = requestAnimationFrame(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      scrollProgress.value = (scrollTop / scrollHeight) * 100
    })
  }

  function createClickSpark(event: MouseEvent) {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || options.isMobile.value)
      return

    const x = event.clientX
    const y = event.clientY

    for (let index = 0; index < 8; index++) {
      const spark = document.createElement('div')
      spark.className = 'click-spark'
      spark.style.left = `${x}px`
      spark.style.top = `${y}px`

      const angle = (Math.PI * 2 * index) / 8
      const velocity = 50 + Math.random() * 50
      spark.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`)
      spark.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`)

      document.body.appendChild(spark)
      setTimeout(() => spark.remove(), 600)
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', updateScrollProgress)
    void options.refreshAll()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScrollProgress)
    cancelAnimationFrame(scrollRaf)
  })

  return {
    createClickSpark,
    scrollProgress,
  }
}
