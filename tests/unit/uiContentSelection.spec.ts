import type { ImageDeleteRequestItem } from '@/api/imageDeleteRequest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import http from '@/api/http'
import { useAdminImageDeleteRequests } from '@/composables/useAdminImageDeleteRequests'

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }))
vi.mock('@/api/http', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('naive-ui', () => ({ useMessage: () => ({ warning: vi.fn(), success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: confirm }) }))
vi.mock('@/composables/useApiError', () => ({ shouldIgnoreApiError: () => false, showApiError: vi.fn() }))

async function createBoard() {
  let state!: ReturnType<typeof useAdminImageDeleteRequests>
  await renderToString(createSSRApp({
    setup() {
      state = useAdminImageDeleteRequests()
      return () => h('div')
    },
  }))
  state.list.value = [{ id: 1, status: 0 }, { id: 2, status: 1 }, { id: 3, status: 0 }] as ImageDeleteRequestItem[]
  return state
}
beforeEach(() => vi.clearAllMocks())

describe('deletion record selection', () => {
  it('selects only current pending cards and keeps indeterminate feedback', async () => {
    const state = await createBoard()
    state.setRequestSelected(state.list.value[1]!, true)
    expect(state.selectedRequestIds.value).toEqual([])
    state.setRequestSelected(state.list.value[0]!, true)
    expect(state.currentPendingIndeterminate.value).toBe(true)
    state.toggleCurrentPendingSelection(true)
    expect(state.selectedRequestIds.value).toEqual([1, 3])
    expect(state.allCurrentPendingSelected.value).toBe(true)
    state.toggleCurrentPendingSelection(false)
    expect(state.selectedRequestIds.value).toEqual([])
  })

  it('requires the original confirmation before a batch write and does not select processed records', async () => {
    const state = await createBoard()
    state.handleBatchReview(true)
    expect(confirm).not.toHaveBeenCalled()
    state.toggleCurrentPendingSelection(true)
    state.handleBatchReview(false)
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '确认批量拒绝', content: '确定批量拒绝 2 条删除申请吗？', positiveText: '确认', negativeText: '取消', onPositiveClick: expect.any(Function) }))
    expect(http.post).not.toHaveBeenCalled()
  })
})
