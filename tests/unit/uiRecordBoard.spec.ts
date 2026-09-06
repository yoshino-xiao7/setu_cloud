import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import UiRecordBoard from '@/components/ui/UiRecordBoard.vue'
import UiRecordCard from '@/components/ui/UiRecordCard.vue'

function renderCard(props = {}) {
  return renderToString(createSSRApp({ render: () => h(UiRecordCard, { headline: '调用记录', ...props }) }))
}

function renderBoard(props = {}, slots = {}) {
  return renderToString(createSSRApp({ render: () => h(UiRecordBoard, { items: [], ...props }, slots) }))
}

describe('uiRecordBoard and UiRecordCard', () => {
  it('renders semantic field names, escaped values and numeric styling', async () => {
    const html = await renderCard({ fields: [{ name: '积分', value: '128' }, { name: '备注', value: '<script>', numeric: false }] })
    expect(html).toContain('<dt>积分</dt>')
    expect(html).toContain('class="record__numeric">128</dd>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('class="record__numeric">&lt;script&gt;')
  })

  it('keeps status text and field values in the focusable accessible label', async () => {
    const html = await renderCard({ supporting: '今日', status: { text: '成功', tone: 'success' }, fields: [{ name: '积分', value: '12' }] })
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-label="调用记录，今日，积分 12，成功"')
    expect(html).toContain('class="record__ribbon" aria-hidden="true"')
    expect(html).toContain('data-tone="success">成功</span>')
  })

  it('defaults to regular density and supports compact cards', async () => {
    expect(await renderCard()).toContain('data-density="regular"')
    expect(await renderCard({ density: 'compact' })).toContain('data-density="compact"')
  })

  it('only renders an action row when provided and preserves test ids', async () => {
    expect(await renderCard()).not.toContain('record__actions')
    const html = await renderToString(createSSRApp({
      render: () => h(UiRecordCard, { 'headline': '审核', 'data-testid': 'existing-record' }, { actions: () => h('button', { 'data-testid': 'existing-approve' }, '通过') }),
    }))
    expect(html).toContain('record__actions')
    expect(html).toContain('data-testid="existing-record"')
    expect(html).toContain('data-testid="existing-approve"')
  })

  it('renders customizable empty content', async () => {
    expect(await renderBoard({ empty: '暂无账单' })).toContain('暂无账单')
    expect(await renderBoard({}, { empty: () => h('button', '创建') })).toContain('<button>创建</button>')
  })

  it('shows shaped loading placeholders instead of an empty state', async () => {
    const html = await renderBoard({ loading: true })
    expect(html).toContain('aria-busy="true"')
    expect(html.match(/board__skeleton/g)).toHaveLength(4)
    expect(html).not.toContain('暂无记录')
  })

  it('retains records when refreshing and exposes filter and pagination slots', async () => {
    const html = await renderBoard({ items: ['first', 'second'], loading: true }, {
      default: ({ item }: { item: string }) => h('article', item),
      filters: () => h('button', '排序'),
      footer: () => h('button', '下一页'),
    })
    expect(html).toContain('<article>first</article>')
    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'))
    expect(html).not.toContain('board__skeleton')
    expect(html).toContain('排序')
    expect(html).toContain('下一页')
  })

  it('shows failures without claiming that failed data is empty', async () => {
    const html = await renderBoard({ error: '加载失败' })
    expect(html).toContain('role="alert"')
    expect(html).toContain('加载失败')
    expect(html).not.toContain('暂无记录')
  })

  it('supports custom minimum widths and safely falls back for invalid widths', async () => {
    expect(await renderBoard()).toContain('--min:320px')
    expect(await renderBoard({ minCardWidth: 440 })).toContain('--min:440px')
    expect(await renderBoard({ minCardWidth: Number.NaN })).toContain('--min:320px')
  })
})
