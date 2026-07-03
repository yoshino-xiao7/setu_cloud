import { onMounted, onUnmounted, ref } from 'vue'

export function useScrollProgress() {
  const scrollProgress = ref(0)
  let scrollRaf = 0

  function updateScrollProgress() {
    cancelAnimationFrame(scrollRaf)
    scrollRaf = requestAnimationFrame(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      scrollProgress.value = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
    })
  }

  onMounted(() => {
    window.addEventListener('scroll', updateScrollProgress)
    updateScrollProgress()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScrollProgress)
    cancelAnimationFrame(scrollRaf)
  })

  return {
    scrollProgress,
  }
}
