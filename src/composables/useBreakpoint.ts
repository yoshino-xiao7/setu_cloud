import { computed, onMounted, onUnmounted, ref } from 'vue'

const width = ref(typeof window === 'undefined' ? 1024 : window.innerWidth)
let subscribers = 0
let resizeRaf = 0

const updateWidth = () => {
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    width.value = window.innerWidth
  })
}

export function useBreakpoint() {
  onMounted(() => {
    subscribers += 1
    updateWidth()
    if (subscribers === 1) {
      window.addEventListener('resize', updateWidth, { passive: true })
    }
  })

  onUnmounted(() => {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers === 0) {
      window.removeEventListener('resize', updateWidth)
    }
  })

  return {
    width,
    isMobile: computed(() => width.value <= 640),
    isTablet: computed(() => width.value > 640 && width.value <= 1024),
    isDesktop: computed(() => width.value > 1024),
    isCompact: computed(() => width.value <= 768)
  }
}
