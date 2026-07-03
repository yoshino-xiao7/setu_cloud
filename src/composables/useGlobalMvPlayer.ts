import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'

const MV_PLAYER_POSITION_KEY = 'mv_player_position'

export function useGlobalMvPlayer() {
  const musicStore = useMusicStore()
  const { width } = useBreakpoint()
  const mvVideoRef = ref<HTMLVideoElement>()
  const modalVideoContainer = ref<HTMLElement>()
  const miniVideoContainer = ref<HTMLElement>()

  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const playerX = ref(20)
  const playerY = ref(20)
  const isLocked = ref(false)

  let autoplayTimer: ReturnType<typeof setTimeout> | null = null

  function getPlayerSize() {
    const playerWidth = width.value <= 360
      ? Math.max(0, width.value - 20)
      : width.value <= 768
        ? Math.min(300, Math.max(0, width.value - 32))
        : 400

    return {
      width: playerWidth,
      height: playerWidth * 9 / 16 + 50,
    }
  }

  function clampPosition() {
    const size = getPlayerSize()
    const maxPlayerX = Math.max(10, width.value - size.width - 10)
    const maxPlayerY = Math.max(10, window.innerHeight - size.height)

    playerX.value = Math.max(10, Math.min(maxPlayerX, playerX.value))
    playerY.value = Math.max(10, Math.min(maxPlayerY, playerY.value))
  }

  function handleViewportResize() {
    clampPosition()
    savePosition()
  }

  function loadPosition() {
    try {
      const saved = localStorage.getItem(MV_PLAYER_POSITION_KEY)
      if (saved) {
        const { x, y, locked } = JSON.parse(saved)
        playerX.value = x
        playerY.value = y
        isLocked.value = locked || false
        clampPosition()
      }
    }
    catch {}
  }

  function savePosition() {
    try {
      clampPosition()
      localStorage.setItem(MV_PLAYER_POSITION_KEY, JSON.stringify({
        x: playerX.value,
        y: playerY.value,
        locked: isLocked.value,
      }))
    }
    catch {}
  }

  function toggleLock() {
    isLocked.value = !isLocked.value
    savePosition()
  }

  function handleDragStart(e: MouseEvent | TouchEvent) {
    if (isLocked.value)
      return

    isDragging.value = true

    if (e instanceof MouseEvent) {
      dragStartX.value = e.clientX
      dragStartY.value = e.clientY
    }
    else if (e.touches && e.touches.length > 0) {
      dragStartX.value = e.touches[0]!.clientX
      dragStartY.value = e.touches[0]!.clientY
    }

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('touchend', handleDragEnd)

    e.preventDefault()
  }

  function handleDragMove(e: MouseEvent | TouchEvent) {
    if (!isDragging.value)
      return

    let clientX: number
    let clientY: number
    if (e instanceof MouseEvent) {
      clientX = e.clientX
      clientY = e.clientY
    }
    else if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0]!.clientX
      clientY = e.touches[0]!.clientY
    }
    else {
      return
    }

    const deltaX = dragStartX.value - clientX
    const deltaY = dragStartY.value - clientY

    playerX.value += deltaX
    playerY.value += deltaY
    clampPosition()

    dragStartX.value = clientX
    dragStartY.value = clientY

    e.preventDefault()
  }

  function handleDragEnd() {
    if (isDragging.value) {
      isDragging.value = false
      savePosition()

      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchend', handleDragEnd)
    }
  }

  async function toggleMinimize() {
    musicStore.toggleMvMinimize()

    await nextTick()
    if (mvVideoRef.value && miniVideoContainer.value) {
      miniVideoContainer.value.appendChild(mvVideoRef.value)
    }
  }

  async function expandFromMinimized() {
    musicStore.toggleMvMinimize()

    await nextTick()
    if (mvVideoRef.value && modalVideoContainer.value) {
      modalVideoContainer.value.appendChild(mvVideoRef.value)
    }
  }

  function handleCloseMv() {
    musicStore.closeMv()
  }

  function handleVideoDoubleClick() {
    if (mvVideoRef.value) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
      else {
        mvVideoRef.value.requestFullscreen()
      }
    }
  }

  watch(() => musicStore.currentMvUrl, async (url) => {
    if (url) {
      await nextTick()

      if (mvVideoRef.value) {
        const container = musicStore.mvPlayerMinimized ? miniVideoContainer.value : modalVideoContainer.value
        if (container && mvVideoRef.value.parentElement !== container) {
          container.appendChild(mvVideoRef.value)
        }

        autoplayTimer = setTimeout(() => {
          if (mvVideoRef.value) {
            mvVideoRef.value.play().catch(() => {})
          }
        }, 100)
      }
    }
  })

  function handleMvVideoError() {
    const mvInfo = musicStore.currentMvInfo

    if (mvInfo?.originalUrl && musicStore.currentMvUrl !== mvInfo.originalUrl) {
      musicStore.currentMvUrl = mvInfo.originalUrl
      musicStore.currentMvInfo = {
        ...mvInfo,
        originalUrl: undefined,
      }
    }
  }

  onMounted(() => {
    loadPosition()
    window.addEventListener('resize', handleViewportResize)
  })

  watch(width, () => {
    handleViewportResize()
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)
    isDragging.value = false

    if (autoplayTimer) {
      clearTimeout(autoplayTimer)
      autoplayTimer = null
    }
    window.removeEventListener('resize', handleViewportResize)
  })

  return {
    musicStore,
    mvVideoRef,
    modalVideoContainer,
    miniVideoContainer,
    isDragging,
    playerX,
    playerY,
    isLocked,
    toggleLock,
    handleDragStart,
    toggleMinimize,
    expandFromMinimized,
    handleCloseMv,
    handleVideoDoubleClick,
    handleMvVideoError,
  }
}
