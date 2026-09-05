import type { ComputedRef } from 'vue'
import { computed, ref } from 'vue'

export interface AiDrawCharacterMaskPoint {
  x: number
  y: number
}

export interface AiDrawCharacterMaskStroke {
  role: 'primary' | 'secondary'
  brush: number
  points: AiDrawCharacterMaskPoint[]
}

export interface AiDrawCharacterMaskOptions {
  isEnabled: ComputedRef<boolean>
  getDimensions: () => { width: number, height: number }
}

export function simplifyAiDrawMaskPoints(points: AiDrawCharacterMaskPoint[], maxPoints = 220) {
  if (points.length <= maxPoints)
    return points

  const step = Math.ceil(points.length / maxPoints)
  return points.filter((_, index) => index % step === 0 || index === points.length - 1)
}

export function parseAiDrawCharacterMask(maskJson: string) {
  if (!maskJson.trim())
    return []

  try {
    const payload = JSON.parse(maskJson) as { strokes?: AiDrawCharacterMaskStroke[] }
    return (payload.strokes || [])
      .filter(stroke => (stroke.role === 'primary' || stroke.role === 'secondary') && Array.isArray(stroke.points))
      .map(stroke => ({
        role: stroke.role,
        brush: Number(stroke.brush) || 0.07,
        points: stroke.points
          .map(point => ({ x: Number(point.x), y: Number(point.y) }))
          .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)),
      }))
      .filter(stroke => stroke.points.length > 0)
  }
  catch {
    return []
  }
}

export function createAiDrawCharacterMaskJson(
  strokes: AiDrawCharacterMaskStroke[],
  dimensions: { width: number, height: number },
  enabled: boolean,
) {
  if (!enabled)
    return undefined

  const hasPrimary = strokes.some(stroke => stroke.role === 'primary')
  const hasSecondary = strokes.some(stroke => stroke.role === 'secondary')
  if (!hasPrimary || !hasSecondary)
    return undefined

  const serializedStrokes = strokes
    .filter(stroke => stroke.points.length > 0)
    .map(stroke => ({
      role: stroke.role,
      brush: Number(stroke.brush.toFixed(4)),
      points: simplifyAiDrawMaskPoints(stroke.points).map(point => ({
        x: Number(point.x.toFixed(4)),
        y: Number(point.y.toFixed(4)),
      })),
    }))
    .filter(stroke => stroke.points.length > 0)

  if (!serializedStrokes.length)
    return undefined

  return JSON.stringify({
    version: 1,
    width: dimensions.width,
    height: dimensions.height,
    strokes: serializedStrokes,
  })
}

export function useAiDrawCharacterMask(options: AiDrawCharacterMaskOptions) {
  const canvas = ref<HTMLCanvasElement | null>(null)
  const role = ref<'primary' | 'secondary'>('primary')
  const brush = ref(0.07)
  const strokes = ref<AiDrawCharacterMaskStroke[]>([])
  let painting = false
  let activeStroke: AiDrawCharacterMaskStroke | null = null

  const hasStrokes = computed(() => strokes.value.length > 0)
  const hasCompleteStrokes = computed(() => {
    const roles = new Set(strokes.value.map(stroke => stroke.role))
    return roles.has('primary') && roles.has('secondary')
  })
  const promptGuard = computed(() => {
    if (!options.isEnabled.value)
      return ''
    return '2girls, duo, distinct faces, one continuous scene, consistent lighting, consistent art style'
  })
  const hint = computed(() => {
    if (!options.isEnabled.value)
      return ''
    if (hasCompleteStrokes.value)
      return `已绘制 ${strokes.value.length} 笔位置参考；两人仍在同一场景中生成，动作可以跨区、交汇和遮挡。`
    if (hasStrokes.value)
      return '同时画出角色 A 和角色 B 可提供大致位置参考；只画一边时按普通双角色生成。'
    return '两人共享场景和画风，不固定左右站位。手绘仅表示大致上下左右位置，不是身体边界；具体动作和前后遮挡请写在描述中。'
  })

  function buildJson() {
    return createAiDrawCharacterMaskJson(strokes.value, options.getDimensions(), options.isEnabled.value)
  }

  function restore(maskJson: string) {
    strokes.value = parseAiDrawCharacterMask(maskJson)
  }

  function clear() {
    strokes.value = []
    redrawSoon()
  }

  function undo() {
    strokes.value = strokes.value.slice(0, -1)
    redrawSoon()
  }

  function startPaint(event: PointerEvent) {
    if (!options.isEnabled.value)
      return

    const point = pointFromEvent(event)
    if (!point)
      return

    painting = true
    activeStroke = {
      role: role.value,
      brush: brush.value,
      points: [point],
    }
    canvas.value?.setPointerCapture(event.pointerId)
    redrawSoon()
  }

  function movePaint(event: PointerEvent) {
    if (!painting || !activeStroke)
      return

    const point = pointFromEvent(event)
    if (!point)
      return

    const lastPoint = activeStroke.points[activeStroke.points.length - 1]
    if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 0.006)
      return

    activeStroke.points.push(point)
    redrawSoon()
  }

  function endPaint(event: PointerEvent) {
    if (!painting || !activeStroke)
      return

    painting = false
    canvas.value?.releasePointerCapture(event.pointerId)
    if (activeStroke.points.length > 0)
      strokes.value = [...strokes.value, activeStroke]
    activeStroke = null
    redrawSoon()
  }

  function pointFromEvent(event: PointerEvent): AiDrawCharacterMaskPoint | null {
    if (!canvas.value)
      return null

    const rect = canvas.value.getBoundingClientRect()
    if (!rect.width || !rect.height)
      return null

    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
  }

  function redrawSoon() {
    window.requestAnimationFrame(drawCanvas)
  }

  function drawCanvas() {
    if (!canvas.value)
      return

    const rect = canvas.value.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    const width = Math.max(320, Math.round(rect.width * ratio))
    const height = Math.max(180, Math.round(rect.height * ratio))
    if (canvas.value.width !== width || canvas.value.height !== height) {
      canvas.value.width = width
      canvas.value.height = height
    }

    const context = canvas.value.getContext('2d')
    if (!context)
      return

    context.clearRect(0, 0, width, height)
    drawGuide(context, width, height)
    for (const stroke of [...strokes.value, ...(activeStroke ? [activeStroke] : [])])
      drawStroke(context, stroke, width, height)
  }

  return {
    brush,
    buildJson,
    canvas,
    clear,
    hasCompleteStrokes,
    hasStrokes,
    hint,
    movePaint,
    promptGuard,
    redrawSoon,
    restore,
    role,
    startPaint,
    strokes,
    undo,
    endPaint,
  }
}

function drawGuide(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save()
  context.strokeStyle = 'rgba(100, 116, 139, 0.12)'
  context.lineWidth = 1
  const grid = Math.max(24, Math.round(Math.min(width, height) / 8))
  for (let x = grid; x < width; x += grid) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = grid; y < height; y += grid) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
  context.restore()
}

function drawStroke(context: CanvasRenderingContext2D, stroke: AiDrawCharacterMaskStroke, width: number, height: number) {
  const points = stroke.points
  if (!points.length)
    return

  const color = stroke.role === 'primary' ? 'rgba(14, 165, 233, 0.48)' : 'rgba(244, 63, 94, 0.48)'
  const edge = stroke.role === 'primary' ? 'rgba(2, 132, 199, 0.82)' : 'rgba(225, 29, 72, 0.82)'
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(16, stroke.brush * Math.min(width, height))
  context.strokeStyle = color
  context.beginPath()
  points.forEach((point, index) => {
    const x = point.x * width
    const y = point.y * height
    if (index === 0)
      context.moveTo(x, y)
    else
      context.lineTo(x, y)
  })
  context.stroke()
  context.lineWidth = Math.max(2, context.lineWidth * 0.08)
  context.strokeStyle = edge
  context.stroke()
  context.restore()
}
