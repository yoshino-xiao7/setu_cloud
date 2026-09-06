import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { fetchMyApiKeys } from '@/api/apiKey'
import { fetchUsageOverview } from '@/api/dashboard'
import { useUserDashboard } from '@/composables/useUserDashboard'

vi.mock('naive-ui', () => ({ useMessage: () => ({ error: vi.fn() }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({}) }))
vi.mock('@/api/apiKey', () => ({ fetchMyApiKeys: vi.fn() }))
vi.mock('@/api/dashboard', () => ({ fetchUsageOverview: vi.fn(), fetchUsageLogs: vi.fn(), normalizeUsageLogsResponse: vi.fn() }))
vi.mock('@/utils/navigation', () => ({ safePush: vi.fn() }))
vi.mock('@/composables/useApiError', () => ({ getApiErrorMessage: () => 'load failed', shouldIgnoreApiError: () => false, showApiError: vi.fn() }))

describe('dashboard retries', () => {
  it('exposes callable retries that recover from failed overview and key requests', async () => {
    vi.mocked(fetchMyApiKeys).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
    vi.mocked(fetchUsageOverview).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { totalCalls: 3, todayCalls: 1 } } as Awaited<ReturnType<typeof fetchUsageOverview>>)
    const scope = effectScope()
    try {
      const page = scope.run(() => useUserDashboard())!
      await Promise.all([page.fetchKeyStats(), page.fetchOverview()])
      expect(page.keyError.value).toBe('load failed')
      expect(page.overviewError.value).toBe('load failed')
      await Promise.all([page.fetchKeyStats(), page.fetchOverview()])
      expect(page.keyError.value).toBe('')
      expect(page.overviewError.value).toBe('')
      expect(page.overview.totalCalls).toBe(3)
    }
    finally { scope.stop() }
  })
})
