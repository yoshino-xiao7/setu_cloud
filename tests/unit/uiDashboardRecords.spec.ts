import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import http from '@/api/http'
import UiBoard from '@/components/ui/UiBoard.vue'
import { useUserDashboard } from '@/composables/useUserDashboard'

vi.mock('@/api/http', () => ({ default: { get: vi.fn() } }))
vi.mock('naive-ui', async () => ({ ...await vi.importActual<typeof import('naive-ui')>('naive-ui'), useMessage: () => ({ error: vi.fn() }), useOsTheme: () => ref(null) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/composables/useApiError', () => ({ getApiErrorMessage: (_: unknown, fallback: string) => fallback, shouldIgnoreApiError: () => false, showApiError: vi.fn() }))

async function createDashboard() {
  let dashboard!: ReturnType<typeof useUserDashboard>
  await renderToString(createSSRApp({ setup() {
    dashboard = useUserDashboard()
    return () => h('div')
  } }))
  return dashboard
}

const record = { id: 42, endpoint: '/api/setu/random', status: 200, ip: '127.0.0.1', timestamp: '2026-09-06T12:00:00' }
beforeEach(() => vi.clearAllMocks())

describe('dashboard record migration', () => {
  it('exposes the original overview, key and log requests for failure recovery', async () => {
    const state = await createDashboard()
    vi.mocked(http.get).mockRejectedValue(new Error('offline'))
    await Promise.all([state.fetchOverview(), state.fetchKeyStats(), state.fetchLogs()])
    expect(state.overviewError.value).toBeTruthy()
    expect(state.keyError.value).toBeTruthy()
    expect(state.logsError.value).toBeTruthy()
    vi.mocked(http.get).mockImplementation(async (url) => {
      if (url === '/usage/overview')
        return { data: { totalCalls: 9, todayCalls: 3 } } as never
      if (url === '/usage/logs')
        return { data: { list: [record], total: 51 } } as never
      return { data: [{ id: 1 }] } as never
    })
    await Promise.all([state.fetchOverview(), state.fetchKeyStats(), state.fetchLogs()])
    expect(state.overview.todayCalls).toBe(3)
    expect(state.keyState.count).toBe(1)
    expect(state.tableState.data).toEqual([record])
    expect([state.overviewError.value, state.keyError.value, state.logsError.value]).toEqual(['', '', ''])
    expect(http.get).toHaveBeenCalledTimes(6)
  })

  it('keeps remote page selection and renders the returned page without slicing twice', async () => {
    const state = await createDashboard()
    vi.mocked(http.get).mockResolvedValue({ data: { list: [record], total: 51 } } as never)
    state.handlePageChange(3)
    await vi.waitFor(() => expect(state.tableState.loading).toBe(false))
    expect(http.get).toHaveBeenCalledWith('/usage/logs', { params: { page: 3, limit: 10 } })
    expect(state.tableState.data).toEqual([record])
    expect(state.pagination.itemCount).toBe(51)
  })

  it('resets page one when changing the remote page size or refreshing', async () => {
    const state = await createDashboard()
    vi.mocked(http.get).mockResolvedValue({ data: { list: [record], total: 51 } } as never)
    state.pagination.page = 3
    state.handlePageSizeChange(20)
    await vi.waitFor(() => expect(state.tableState.loading).toBe(false))
    expect(http.get).toHaveBeenLastCalledWith('/usage/logs', { params: { page: 1, limit: 20 } })
    state.pagination.page = 2
    state.refreshLogs()
    await vi.waitFor(() => expect(state.tableState.loading).toBe(false))
    expect(http.get).toHaveBeenLastCalledWith('/usage/logs', { params: { page: 1, limit: 20 } })
  })
})

describe('board theme integration', () => {
  it('keeps existing identifiers, classes and named slots on the board surface', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(UiBoard, { 'data-testid': 'existing-page', 'class': 'page-container' }, { header: () => h('h1', '标题'), default: () => h('p', '正文'), dock: () => h('button', '操作') }) }))
    expect(html).toContain('data-testid="existing-page"')
    expect(html).toContain('page-container board')
    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('board__dock')
    expect(html).toContain('<button>操作</button>')
  })
})
