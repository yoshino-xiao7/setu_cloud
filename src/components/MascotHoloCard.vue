<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMascotFoil } from '@/utils/mascotFoil'

const props = defineProps<{ name: string, role: string, roman: string, front: string, back: string, summer?: boolean }>()
const stage = ref<HTMLButtonElement>()
const rotator = ref<HTMLSpanElement>()
const turn = ref<HTMLSpanElement>()
const foilCanvas = ref<HTMLCanvasElement>()
const shineCanvas = ref<HTMLCanvasElement>()
const foilReady = ref(false)
let foilRenderer: ReturnType<typeof createMascotFoil> = null
let shineRenderer: ReturnType<typeof createMascotFoil> = null
const flipped = ref(false)
const backVisible = ref(false)
const displayedFront = ref(props.front)
const displayedSummer = ref(props.summer)
const editionPhase = ref<'out' | 'in' | null>(null)
let requestedFace = { front: props.front, summer: props.summer }
let faceRequest = 0
const label = computed(() => `${flipped.value ? '回到' : '翻看'}${props.name}${flipped.value ? '正面' : '背面'}`)
let raf = 0
let turnAngle = 0
let turnFrom = 0
let turnStartedAt = 0
let x = 0
let y = 0
let targetX = 0
let targetY = 0
let visible = true
let mounted = false
let reduced: MediaQueryList | undefined
let intersection: IntersectionObserver | undefined
let resize: ResizeObserver | undefined
let pointer: { id: number, x: number, y: number, moved: boolean } | null = null
let suppressClick = false

function changeEdition(now = performance.now()) {
  if (editionPhase.value || (requestedFace.front === displayedFront.value && requestedFace.summer === displayedSummer.value))
    return
  editionPhase.value = 'out'
  turnFrom = turnAngle
  turnStartedAt = now
  resetTilt()
}

watch(() => [props.front, props.summer] as const, async ([front, summer]) => {
  const request = ++faceRequest
  const image = new Image()
  image.src = front
  try {
    await image.decode()
  }
  catch { /* Keep the normal image fallback if decoding fails. */ }
  if (!mounted || request !== faceRequest)
    return
  requestedFace = { front, summer }
  changeEdition()
})

function frame(now: number) {
  raf = 0
  const turnTarget = editionPhase.value ? (editionPhase.value === 'out' ? 90 : 0) : (flipped.value ? 180 : 0)
  const progress = reduced?.matches ? 1 : Math.min(1, Math.max(0, (now - turnStartedAt) / (editionPhase.value ? 300 : 560)))
  const eased = progress * progress * (3 - 2 * progress)
  turnAngle = turnFrom + (turnTarget - turnFrom) * eased
  if (editionPhase.value === 'out' && progress === 1) {
    // Exchange artwork only while edge-on, then rotate the selected front into view.
    displayedFront.value = requestedFace.front
    displayedSummer.value = requestedFace.summer
    flipped.value = false
    editionPhase.value = reduced?.matches ? null : 'in'
    turnAngle = reduced?.matches ? 0 : -90
    turnFrom = turnAngle
    turnStartedAt = now
  }
  else if (editionPhase.value === 'in' && progress === 1) {
    editionPhase.value = null
    changeEdition(now)
  }
  // Swap paintable surfaces at the edge so the hidden face cannot bleed through.
  backVisible.value = turnAngle >= 90
  if (turn.value)
    turn.value.style.transform = `rotateY(${turnAngle}deg)`
  x += (targetX - x) * 0.15
  y += (targetY - y) * 0.15
  if (Math.abs(x - targetX) < 0.002)
    x = targetX
  if (Math.abs(y - targetY) < 0.002)
    y = targetY
  if (rotator.value)
    rotator.value.style.transform = `rotateX(${-y * 8}deg) rotateY(${x * 11}deg)`
  if (!backVisible.value) {
    foilRenderer?.render(x, y, now / 1000)
    shineRenderer?.render(x, y, now / 1000)
  }
  if (editionPhase.value || x !== targetX || y !== targetY || turnAngle !== turnTarget)
    schedule()
}
function schedule() {
  if (mounted && (visible || editionPhase.value) && !document.hidden && !raf)
    raf = requestAnimationFrame(frame)
}
function resetTilt() {
  targetX = 0
  targetY = 0
  schedule()
}
function flip() {
  if (editionPhase.value)
    return
  turnFrom = turnAngle
  turnStartedAt = performance.now()
  flipped.value = !flipped.value
  resetTilt()
}
function click(event: MouseEvent) {
  if (event.detail === 0 || !suppressClick)
    flip()
  suppressClick = false
}
function pointerDown(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary)
    return
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
  suppressClick = false
  stage.value?.setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (pointer && event.pointerId === pointer.id && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8)
    pointer.moved = true
  if (reduced?.matches || (event.pointerType !== 'mouse' && !pointer))
    return
  const bounds = stage.value?.getBoundingClientRect()
  if (!bounds)
    return
  targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
  targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
  schedule()
}
function pointerUp(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id)
    return
  suppressClick = pointer.moved || event.type === 'pointercancel'
  pointer = null
  resetTilt()
}
function pointerLeave() {
  if (!pointer)
    resetTilt()
}
function keydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key))
    return
  event.preventDefault()
  if (event.key === 'Escape') {
    resetTilt()
  }
  else if (!reduced?.matches) {
    if (event.key === 'ArrowLeft')
      targetX = Math.max(-1, targetX - 0.2)
    if (event.key === 'ArrowRight')
      targetX = Math.min(1, targetX + 0.2)
    if (event.key === 'ArrowUp')
      targetY = Math.max(-1, targetY - 0.2)
    if (event.key === 'ArrowDown')
      targetY = Math.min(1, targetY + 0.2)
    schedule()
  }
}
function setupFoil() {
  if (!mounted || !foilCanvas.value || !shineCanvas.value)
    return
  foilRenderer?.dispose()
  shineRenderer?.dispose()
  foilRenderer = createMascotFoil(foilCanvas.value, 'color')
  shineRenderer = createMascotFoil(shineCanvas.value, 'shine')
  foilReady.value = !!foilRenderer && !!shineRenderer
  schedule()
}
function contextLost(event: Event) {
  event.preventDefault()
  foilReady.value = false
}
function visibilityChanged() {
  if (document.hidden) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  else {
    schedule()
  }
}
onMounted(() => {
  mounted = true
  setupFoil()
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', resetTilt)
  document.addEventListener('visibilitychange', visibilityChanged)
  intersection = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    if (!visible && !editionPhase.value) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    else {
      schedule()
    }
  })
  resize = new ResizeObserver(schedule)
  if (stage.value) {
    intersection.observe(stage.value)
    resize.observe(stage.value)
  }
})
onBeforeUnmount(() => {
  mounted = false
  foilRenderer?.dispose()
  shineRenderer?.dispose()
  cancelAnimationFrame(raf)
  intersection?.disconnect()
  resize?.disconnect()
  reduced?.removeEventListener('change', resetTilt)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <button
    ref="stage" type="button" class="holo-card" :class="{ 'is-flipped': flipped, 'is-summer': displayedSummer }"
    :aria-label="label" :aria-pressed="flipped" :aria-busy="!!editionPhase" :data-renderer="foilReady ? 'procedural-foil' : 'image'"
    @click="click" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp"
    @pointercancel="pointerUp" @lostpointercapture="pointerUp" @pointerleave="pointerLeave" @keydown="keydown"
  >
    <span ref="rotator" class="holo-rotator">
      <span ref="turn" class="holo-turn">
        <span class="holo-face holo-front" :hidden="backVisible" :aria-hidden="backVisible">
          <img :src="displayedFront" :alt="name" class="holo-art" width="1024" height="1536" decoding="async" draggable="false">
          <canvas ref="foilCanvas" class="holo-foil" :class="{ ready: foilReady }" aria-hidden="true" @webglcontextlost="contextLost" @webglcontextrestored="setupFoil" />
          <canvas ref="shineCanvas" class="holo-shine" :class="{ ready: foilReady }" aria-hidden="true" @webglcontextlost="contextLost" @webglcontextrestored="setupFoil" />
          <span class="holo-scrim" />
          <span class="holo-top">YIKE · {{ displayedSummer ? 'SUMMER LIMITED' : 'MASCOT COLLECTION' }}</span>
          <span class="holo-caption">
            <span class="holo-name">{{ name }}</span><span class="holo-roman">{{ roman }}</span>
            <span class="holo-role">{{ role }}</span>
          </span>
        </span>
        <span class="holo-face holo-back" :hidden="!backVisible" :aria-hidden="!backVisible">
          <img :src="back" :alt="`Q版${name}`" class="holo-art" width="1024" height="1536" decoding="async" draggable="false">
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.holo-card{position:relative;display:block;width:100%;aspect-ratio:2/3;padding:0;border:0;background:transparent;perspective:1100px;border-radius:19px;cursor:pointer;touch-action:pan-y;isolation:isolate;user-select:none;-webkit-tap-highlight-color:transparent;text-align:left;font:inherit}
.holo-card:focus-visible{outline:3px solid var(--ui-primary);outline-offset:6px}
.holo-rotator,.holo-turn{position:absolute;inset:0;display:block;transform-style:preserve-3d}
.holo-rotator{will-change:transform}
.holo-face[hidden]{display:none}
.holo-face{position:absolute;inset:0;display:block;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:17px;border:1px solid #ffffffdb;background:#e5effc;box-shadow:0 25px 36px -20px #20263570,0 5px 15px #20263512,0 0 0 1px #20263513}
.holo-face::after{content:"";position:absolute;inset:6px;border:1px solid #fff9;border-radius:12px;pointer-events:none;z-index:5}
.holo-art{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
/* Keep every edition in the same card frame; crop wider summer art without stretching. */
.holo-card.is-summer .holo-front .holo-art{object-fit:cover}
.holo-back .holo-art{object-fit:cover}
/* The character is always a normal image, never a sampled GPU texture. */
.holo-foil,.holo-shine{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0}
.holo-foil.ready,.holo-shine.ready{opacity:1}
.holo-foil{mix-blend-mode:overlay}
.holo-shine{mix-blend-mode:screen}

.holo-back{transform:rotateY(180deg)}
.holo-scrim{position:absolute;inset:0;background:linear-gradient(180deg,#17213826,transparent 16%,transparent 65%,#17213818 76%,#17213899);pointer-events:none}
.holo-top{position:absolute;top:22px;left:22px;color:white;font-size:8px;letter-spacing:2px;text-shadow:0 1px 8px #26314960}
.holo-caption{position:absolute;inset:auto 22px 22px;display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:6px 10px;color:white;text-shadow:0 1px 4px #17213880}
.holo-name{font-size:26px;font-weight:600;letter-spacing:2px;line-height:1.25}
.holo-roman{font-size:7px;letter-spacing:1px;justify-self:end;white-space:nowrap}
.holo-role{grid-column:1/-1;font-size:10px;letter-spacing:.5px}
@media(prefers-reduced-motion:reduce){.holo-rotator{will-change:auto}}
</style>
