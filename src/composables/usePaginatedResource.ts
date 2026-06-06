import { reactive, ref, shallowRef } from 'vue'
import { useRequestGuard } from '@/composables/useRequestGuard'

export type PaginationState = {
  page: number
  size: number
  total: number
}

export type PageLike<T> = {
  total?: number
  items?: T[]
  records?: T[]
  list?: T[]
}

type LoadOptions = {
  keepItems?: boolean
}

export function readPageItems<T>(page: PageLike<T> | T[] | null | undefined): T[] {
  if (Array.isArray(page)) return page
  if (!page) return []
  if (Array.isArray(page.items)) return page.items
  if (Array.isArray(page.records)) return page.records
  if (Array.isArray(page.list)) return page.list
  return []
}

export function readPageTotal<T>(page: PageLike<T> | T[] | null | undefined, fallback = 0): number {
  if (Array.isArray(page)) return page.length
  return Number(page?.total ?? fallback)
}

export function usePaginatedResource<T>(options: {
  pageSize?: number
  fetcher: (params: { page: number; size: number }) => Promise<PageLike<T> | T[] | null | undefined>
}) {
  const items = shallowRef<T[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  const pagination = reactive<PaginationState>({
    page: 1,
    size: options.pageSize ?? 20,
    total: 0
  })
  const guard = useRequestGuard()

  const load = async (page = pagination.page, loadOptions: LoadOptions = {}) => {
    pagination.page = page
    loading.value = true
    error.value = null
    if (!loadOptions.keepItems) items.value = []

    try {
      const result = await guard.run(() => options.fetcher({
        page: pagination.page,
        size: pagination.size
      }))
      if (result.stale) return

      items.value = readPageItems(result.value)
      pagination.total = readPageTotal(result.value)
    } catch (e) {
      error.value = e
      if (!loadOptions.keepItems) {
        items.value = []
        pagination.total = 0
      }
      throw e
    } finally {
      loading.value = false
    }
  }

  const reset = async () => {
    pagination.page = 1
    await load(1)
  }

  return {
    items,
    loading,
    error,
    pagination,
    load,
    reset,
    invalidate: guard.invalidate
  }
}
