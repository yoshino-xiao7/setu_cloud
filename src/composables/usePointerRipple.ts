import type { Ref } from 'vue'

interface PointerRippleOptions {
  disabled?: Ref<boolean>
}

export function usePointerRipple(options: PointerRippleOptions = {}) {
  function createRipple(event: MouseEvent) {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || options.disabled?.value)
      return

    const button = event.currentTarget as HTMLElement
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.classList.add('ripple-effect')

    button.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 600)
  }

  return {
    createRipple,
  }
}
