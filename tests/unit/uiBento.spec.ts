import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import UiBento from '@/components/ui/UiBento.vue'
import UiBentoTile from '@/components/ui/UiBentoTile.vue'
import UiMetricRing from '@/components/ui/UiMetricRing.vue'
import UiMosaic from '@/components/ui/UiMosaic.vue'

const styles = readFileSync(new URL('../../src/styles/board.css', import.meta.url), 'utf8')

describe('uiBento', () => {
  it.each(['small', 'wide', 'tall', 'hero'] as const)('maps %s to the public data-span contract', async (span) => {
    const html = await renderToString(createSSRApp({ render: () => h(UiBentoTile, { title: '磁贴', span }) }))
    expect(html).toContain(`data-span="${span}"`)
  })

  it('renders values, status and subtitles without losing inherited identifiers', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(UiBentoTile, { 'title': '积分', 'value': '120', 'subtitle': '可用积分', 'status': { text: '正常', tone: 'success' }, 'data-testid': 'metric' }) }))
    expect(html).toContain('data-testid="metric"')
    expect(html).toContain('120')
    expect(html).toContain('可用积分')
    expect(html).toContain('正常')
  })

  it('supports explicit single-column accessibility layout without reordering children', async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(UiBento, { singleColumn: true }, { default: () => ['first', 'second', 'third'].map(title => h(UiBentoTile, { title, span: 'hero' })) }),
    }))
    expect(html).toContain('bento--single')
    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'))
    expect(html.indexOf('second')).toBeLessThan(html.indexOf('third'))
    expect(styles).toMatch(/\.bento--single > \.bento__tile\s*\{[^}]*grid-column: 1;[^}]*grid-row: auto;/)
    expect(styles).not.toContain('grid-auto-flow: dense')
  })

  it('collapses spans below 640px and uses flexible minimum heights', () => {
    expect(styles).toMatch(/@media \(width < 640px\)\s*\{\s*\.bento\s*\{ grid-template-columns: minmax\(0, 1fr\); \}/)
    expect(styles).toMatch(/\.bento > \.bento__tile\s*\{ grid-column: 1; grid-row: auto; min-height: 112px;/)
  })

  it('uses native buttons for actions, including disabled state', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(UiBentoTile, { title: '生成', action: () => {}, disabled: true }) }))
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain(' disabled')
  })

  it('clamps metric progress and handles non-finite values', async () => {
    for (const [progress, label] of [[-1, '0%'], [2, '100%'], [Number.NaN, '0%']]) {
      const html = await renderToString(createSSRApp({ render: () => h(UiMetricRing, { value: '12', progress: Number(progress) }) }))
      expect(html).toContain(label)
      expect(html).not.toContain('NaN')
    }
  })

  it('preserves mosaic ratios and falls back for invalid dimensions', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(UiMosaic, { items: [0.5, 0, Number.POSITIVE_INFINITY], aspectRatio: (ratio: unknown) => Number(ratio) }, { item: () => h('img', { alt: '作品' }) }) }))
    expect(html).toContain('--mosaic-ratio:0.5')
    expect(html.match(/--mosaic-ratio:1/g)).toHaveLength(2)
  })
})
