import type { AiDrawCharacterMaskStroke } from '@/composables/useAiDrawCharacterMask'
import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import {
  createAiDrawCharacterMaskJson,
  parseAiDrawCharacterMask,
  simplifyAiDrawMaskPoints,
  useAiDrawCharacterMask,
} from '@/composables/useAiDrawCharacterMask'

function createStroke(role: AiDrawCharacterMaskStroke['role'], points = [{ x: 0.1, y: 0.2 }]) {
  return {
    role,
    brush: 0.07123,
    points,
  }
}

describe('ai draw character mask helpers', () => {
  it('simplifies dense strokes while preserving endpoints', () => {
    const points = Array.from({ length: 500 }, (_, index) => ({
      x: index / 499,
      y: 1 - index / 499,
    }))

    const simplified = simplifyAiDrawMaskPoints(points, 100)

    expect(simplified.length).toBeLessThan(points.length)
    expect(simplified[0]).toEqual(points[0])
    expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1])
  })

  it('parses only usable restored strokes', () => {
    const restored = parseAiDrawCharacterMask(JSON.stringify({
      strokes: [
        createStroke('primary', [{ x: '0.2' as unknown as number, y: 0.3 }]),
        createStroke('secondary', [{ x: 'bad' as unknown as number, y: 0.5 }]),
        { role: 'invalid', brush: 1, points: [{ x: 0.1, y: 0.2 }] },
      ],
    }))

    expect(restored).toEqual([
      {
        role: 'primary',
        brush: 0.07123,
        points: [{ x: 0.2, y: 0.3 }],
      },
    ])
    expect(parseAiDrawCharacterMask('{bad json')).toEqual([])
  })

  it('serializes only complete dual-character masks', () => {
    expect(createAiDrawCharacterMaskJson([createStroke('primary')], { width: 832, height: 1216 }, true)).toBeUndefined()
    expect(createAiDrawCharacterMaskJson([createStroke('primary'), createStroke('secondary')], { width: 832, height: 1216 }, false)).toBeUndefined()

    const json = createAiDrawCharacterMaskJson([
      createStroke('primary', [{ x: 0.123456, y: 0.654321 }]),
      createStroke('secondary', [{ x: 0.777777, y: 0.111111 }]),
    ], { width: 1216, height: 832 }, true)

    expect(JSON.parse(json || '')).toEqual({
      version: 1,
      width: 1216,
      height: 832,
      strokes: [
        { role: 'primary', brush: 0.0712, points: [{ x: 0.1235, y: 0.6543 }] },
        { role: 'secondary', brush: 0.0712, points: [{ x: 0.7778, y: 0.1111 }] },
      ],
    })
  })

  it('keeps prompt guard and hint aligned with mask completeness', () => {
    const enabled = ref(true)
    const mask = useAiDrawCharacterMask({
      isEnabled: computed(() => enabled.value),
      getDimensions: () => ({ width: 1216, height: 832 }),
    })

    expect(mask.hint.value).toContain('普通双角色生成')
    expect(mask.promptGuard.value).toContain('left and right characters')

    mask.strokes.value = [createStroke('primary')]
    expect(mask.hint.value).toContain('需要同时画出角色 A 和角色 B')

    mask.strokes.value = [createStroke('primary'), createStroke('secondary')]
    expect(mask.hint.value).toContain('已绘制 2 笔角色区域')
    expect(mask.promptGuard.value).toContain('natural close interaction')

    enabled.value = false
    expect(mask.hint.value).toBe('')
    expect(mask.buildJson()).toBeUndefined()
  })
})
