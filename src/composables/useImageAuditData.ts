import type { Ref } from 'vue'
import type { ImageAuditListDTO, ImageAuditListStats } from '@/api/admin'
import { computed, reactive, ref, shallowRef } from 'vue'
import {
  fetchImageAuditList,
  fetchImageAuditQueue,
} from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import { useImageAuditFilters } from '@/composables/useImageAuditFilters'
import {
  getImageAuditScopeStatKey,
  IMAGE_AUDIT_DESKTOP_PAGE_SIZE,
} from '@/composables/useImageAuditViewHelpers'

export interface UseImageAuditDataOptions {
  isMobile: Ref<boolean>
  shouldIgnoreError: (error: unknown) => boolean
  showError: (error: unknown, fallbackMessage: string) => void
  warn: (content: string) => void
}

export interface ImageAuditSelectionHandlers {
  clearSelectedImages: () => void
  syncSelectedImages: () => void
}

export function useImageAuditData(options: UseImageAuditDataOptions) {
  const loadError = ref('')
  const loading = ref(false)
  const list = shallowRef<ImageAuditListDTO[]>([])
  const pagination = reactive({
    page: 1,
    pageSize: IMAGE_AUDIT_DESKTOP_PAGE_SIZE,
    itemCount: 0,
    onChange: handlePaginationChange,
    showQuickJumper: true,
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(pagination.itemCount / pagination.pageSize)))
  const stats = ref<ImageAuditListStats | null>(null)
  const dueBefore = ref<string | null>(null)
  let listRequestSeq = 0
  let selectionHandlers: ImageAuditSelectionHandlers = {
    clearSelectedImages: () => {},
    syncSelectedImages: () => {},
  }

  const {
    activePageSize,
    availabilityStatus,
    buildListQuery,
    onlyBroken,
    pFilter,
    pidFilter,
    resetFilters: resetFilterValues,
    scope,
    shouldUseMobileQueue,
    staleDays,
  } = useImageAuditFilters({
    isMobile: options.isMobile,
    pagination,
    warn: options.warn,
  })

  function setSelectionHandlers(handlers: ImageAuditSelectionHandlers) {
    selectionHandlers = handlers
  }

  function getCurrentScopeTotal(hasMore: boolean) {
    const count = stats.value?.[getImageAuditScopeStatKey(scope.value)]
    if (typeof count === 'number')
      return count

    return hasMore
      ? pagination.page * pagination.pageSize + 1
      : Math.max(0, (pagination.page - 1) * pagination.pageSize + list.value.length)
  }

  function clearSelectionAndFetch() {
    pagination.page = 1
    selectionHandlers.clearSelectedImages()
    void fetchData()
  }

  function handlePaginationChange(page: number) {
    pagination.page = page
    selectionHandlers.clearSelectedImages()
    void fetchData()
  }

  async function fetchData() {
    const query = buildListQuery()
    if (!query)
      return

    loadError.value = ''
    const requestId = ++listRequestSeq
    pagination.pageSize = activePageSize.value
    loading.value = true
    try {
      if (shouldUseMobileQueue(query)) {
        const [res, statData] = await Promise.all([
          fetchImageAuditQueue({
            scope: query.scope as 'UNREVIEWED' | 'DUE_REVIEW',
            cursor: String(pagination.page),
            pageSize: activePageSize.value,
            pid: query.pid,
            p: query.p,
            staleDays: query.staleDays,
          }),
          fetchAuditStats(query),
        ])
        if (requestId !== listRequestSeq)
          return
        const data = unwrapApiData(res, {
          list: [] as ImageAuditListDTO[],
          hasMore: false,
          nextCursor: null,
        })
        list.value = data.list || []
        stats.value = data.stats ?? statData?.stats ?? stats.value
        dueBefore.value = data.dueBefore ?? statData?.dueBefore ?? dueBefore.value
        pagination.pageSize = activePageSize.value
        pagination.itemCount = getCurrentScopeTotal(data.hasMore)
      }
      else {
        const res = await fetchImageAuditList(query)
        if (requestId !== listRequestSeq)
          return
        const data = unwrapApiData(res, {
          list: [] as ImageAuditListDTO[],
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: 0,
        })
        list.value = data.list || []
        stats.value = data.stats ?? null
        dueBefore.value = data.dueBefore ?? null
        pagination.itemCount = data.total
        pagination.page = data.page
        pagination.pageSize = data.pageSize
      }
      selectionHandlers.syncSelectedImages()
    }
    catch (e: unknown) {
      if (requestId === listRequestSeq && !options.shouldIgnoreError(e)) {
        loadError.value = '加载列表失败'
        options.showError(e, '加载列表失败')
      }
    }
    finally {
      if (requestId === listRequestSeq)
        loading.value = false
    }
  }

  async function fetchAuditStats(query: NonNullable<ReturnType<typeof buildListQuery>>) {
    try {
      const data = unwrapApiData(await fetchImageAuditList({
        page: 1,
        pageSize: 1,
        scope: 'ALL',
        staleDays: query.staleDays,
        pid: query.pid,
        p: query.p,
      }), {
        list: [] as ImageAuditListDTO[],
        page: 1,
        pageSize: 1,
        total: 0,
      })
      return {
        stats: data.stats ?? null,
        dueBefore: data.dueBefore ?? null,
      }
    }
    catch (e: unknown) {
      if (!options.shouldIgnoreError(e))
        console.warn('[ImageAudit] 加载审核数量失败', e)
      return null
    }
  }

  function handleFilterSearch() {
    clearSelectionAndFetch()
  }

  function handleScopeChange() {
    clearSelectionAndFetch()
  }

  function resetFilters() {
    resetFilterValues()
    selectionHandlers.clearSelectedImages()
    void fetchData()
  }

  function dispose() {
    listRequestSeq += 1
    loading.value = false
    list.value = []
    stats.value = null
    dueBefore.value = null
    selectionHandlers.clearSelectedImages()
  }

  return {
    loadError,
    activePageSize,
    availabilityStatus,
    dueBefore,
    fetchData,
    handleFilterSearch,
    handleScopeChange,
    list,
    loading,
    onlyBroken,
    pFilter,
    pageCount,
    pagination,
    pidFilter,
    resetFilters,
    scope,
    setSelectionHandlers,
    staleDays,
    stats,
    dispose,
  }
}
