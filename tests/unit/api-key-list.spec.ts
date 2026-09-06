import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { fetchMyApiKeys } from '@/api/apiKey'
import { useApiKeyList } from '@/composables/useApiKeyList'

vi.mock('naive-ui', () => ({ useMessage: () => ({ error: vi.fn(), warning: vi.fn(), success: vi.fn() }), useDialog: () => ({}) }))
vi.mock('@/api/apiKey', () => ({ fetchMyApiKeys: vi.fn(), createApiKey: vi.fn(), deleteApiKey: vi.fn(), renameApiKey: vi.fn(), setApiKeyStatus: vi.fn() }))
vi.mock('@/composables/useApiError', () => ({ getApiErrorMessage: () => 'load failed', shouldIgnoreApiError: () => false, showApiError: vi.fn() }))

describe('API Key list setup and loading', () => {
  it('initializes the clipboard helper and loads the list without a ReferenceError', async () => {
    vi.mocked(fetchMyApiKeys).mockResolvedValue([])
    const scope = effectScope()
    try {
      const page = scope.run(() => useApiKeyList())!
      await page.loadData()
      expect(fetchMyApiKeys).toHaveBeenCalledOnce()
      expect(page.items.value).toEqual([])
      expect(page.loading.value).toBe(false)
      expect(page.loadError.value).toBe('')
    }
    finally { scope.stop() }
  })
})
