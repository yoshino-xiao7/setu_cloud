<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ name: string, role: string, roman: string, front: string, back: string }>()
const stage = ref<HTMLButtonElement>()
const rotator = ref<HTMLSpanElement>()
const turn = ref<HTMLSpanElement>()
const flipped = ref(false)
const backVisible = ref(false)
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

function frame(now: number) {
  raf = 0
  const turnTarget = flipped.value ? 180 : 0
  const progress = reduced?.matches ? 1 : Math.min(1, Math.max(0, (now - turnStartedAt) / 560))
  const eased = progress * progress * (3 - 2 * progress)
  turnAngle = turnFrom + (turnTarget - turnFrom) * eased
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
  if (rotator.value) {
    rotator.value.style.setProperty('--foil-x', `${50 + x * 35}%`)
    rotator.value.style.setProperty('--foil-y', `${50 + y * 35}%`)
  }
  if (x !== targetX || y !== targetY || turnAngle !== turnTarget)
    schedule()
}
function schedule() {
  if (mounted && visible && !document.hidden && !raf)
    raf = requestAnimationFrame(frame)
}
function resetTilt() {
  targetX = 0
  targetY = 0
  schedule()
}
function flip() {
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
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', resetTilt)
  document.addEventListener('visibilitychange', visibilityChanged)
  intersection = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    if (!visible) {
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
  cancelAnimationFrame(raf)
  intersection?.disconnect()
  resize?.disconnect()
  reduced?.removeEventListener('change', resetTilt)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <button
    ref="stage" type="button" class="holo-card" :class="{ 'is-flipped': flipped }"
    :aria-label="label" :aria-pressed="flipped" data-renderer="css"
    @click="click" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp"
    @pointercancel="pointerUp" @lostpointercapture="pointerUp" @pointerleave="pointerLeave" @keydown="keydown"
  >
    <span ref="rotator" class="holo-rotator">
      <span ref="turn" class="holo-turn">
        <span class="holo-face holo-front" :hidden="backVisible" :aria-hidden="backVisible">
          <img :src="front" :alt="name" class="holo-art" width="1024" height="1536" decoding="async" draggable="false">
          <span class="holo-foil" aria-hidden="true" />
          <span class="holo-scrim" />
          <span class="holo-top">YIKE · MASCOT COLLECTION</span>
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
/* The character is always a normal image, never a sampled GPU texture. */
.holo-foil{position:absolute;inset:0;pointer-events:none;opacity:.22;mix-blend-mode:soft-light;background-image:linear-gradient(115deg,transparent 14%,#7fcfff 28%,#edb8ff 40%,#ffe5a5 51%,#a9edee 64%,transparent 78%);background-size:250% 250%;background-position:var(--foil-x,50%) var(--foil-y,50%)}
.holo-foil::after{content:"";position:absolute;inset:0;opacity:.65;mix-blend-mode:screen;background:linear-gradient(115deg,transparent 35%,#ffffffb0 48%,transparent 59%);background-size:250% 200%;background-position:var(--foil-x,50%) var(--foil-y,50%)}
.holo-back{transform:rotateY(180deg)}
.holo-scrim{position:absolute;inset:0;background:linear-gradient(180deg,#17213826,transparent 16%,transparent 65%,#17213818 76%,#17213899);pointer-events:none}
.holo-top{position:absolute;top:22px;left:22px;color:white;font-size:8px;letter-spacing:2px;text-shadow:0 1px 8px #26314960}
.holo-caption{position:absolute;inset:auto 22px 22px;display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:6px 10px;color:white;text-shadow:0 1px 4px #17213880}
.holo-name{font-size:26px;font-weight:600;letter-spacing:2px;line-height:1.25}
.holo-roman{font-size:7px;letter-spacing:1px;justify-self:end;white-space:nowrap}
.holo-role{grid-column:1/-1;font-size:10px;letter-spacing:.5px}
@media(prefers-reduced-motion:reduce){.holo-rotator{will-change:auto}}
</style>
