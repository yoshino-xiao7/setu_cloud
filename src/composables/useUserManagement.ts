import type { AdminUserDetail, AdminUserItem } from '@/api/admin'

import { useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import {
  banUser,
  deleteUser,
  fetchAdminUserDetail,
  fetchAdminUserList,
  grantUserPoints,
  unbanUser,
} from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'

const DETAIL_CACHE_LIMIT = 24

export function useUserManagement() {
  const message = useMessage()
  const dialog = useDialog()
  const { isCompact: isMobile } = useBreakpoint()

  const loadError = ref('')
  const loading = ref(false)
  const list = shallowRef<AdminUserItem[]>([])
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 人`,
  })
  const searchForm = reactive({ keyword: '', role: null as number | null, status: null as number | null })
  const hasNextPage = computed(() => pagination.page * pagination.pageSize < pagination.itemCount)
  let listRequestSeq = 0

  const pointsModalVisible = ref(false)
  const pointsSubmitting = ref(false)
  const pointsTarget = ref<AdminUserItem | null>(null)
  const pointsForm = reactive({
    amount: null as number | null,
    reason: '',
  })
  const canSubmitPointsGrant = computed(() => Number(pointsForm.amount) > 0 && !pointsSubmitting.value)

  const detailsCache = shallowRef(new Map<number, AdminUserDetail>())
  const detailsLoading = shallowRef(new Set<number>())
  const detailRequests = new Map<number, number>()
  let detailRequestSeq = 0

  const detailFor = (userId: number) => detailsCache.value.get(userId)
  const isDetailLoading = (userId: number) => detailsLoading.value.has(userId)

  function setDetailLoading(userId: number, isLoading: boolean) {
    const next = new Set(detailsLoading.value)
    if (isLoading)
      next.add(userId)
    else next.delete(userId)
    detailsLoading.value = next
  }

  function rememberDetail(userId: number, detail: AdminUserDetail) {
    const next = new Map(detailsCache.value)
    next.delete(userId)
    next.set(userId, detail)

    while (next.size > DETAIL_CACHE_LIMIT) {
      const firstKey = next.keys().next().value
      if (firstKey === undefined)
        break
      next.delete(firstKey)
    }

    detailsCache.value = next
  }

  function pruneDetailCache() {
    if (detailsCache.value.size <= DETAIL_CACHE_LIMIT)
      return

    const visibleIds = new Set(list.value.map(user => user.id))
    const next = new Map(detailsCache.value)
    for (const userId of next.keys()) {
      if (next.size <= DETAIL_CACHE_LIMIT)
        break
      if (!visibleIds.has(userId))
        next.delete(userId)
    }
    detailsCache.value = next
  }

  async function loadDetailData(userId: number) {
    if (detailFor(userId) || isDetailLoading(userId))
      return

    const requestId = ++detailRequestSeq
    detailRequests.set(userId, requestId)
    setDetailLoading(userId, true)
    try {
      const res = await fetchAdminUserDetail(userId)
      if (detailRequests.get(userId) !== requestId)
        return
      rememberDetail(userId, unwrapApiData<AdminUserDetail>(res))
    }
    catch (e: unknown) {
      if (detailRequests.get(userId) === requestId && !shouldIgnoreApiError(e))
        message.error('加载详情失败')
    }
    finally {
      if (detailRequests.get(userId) === requestId) {
        detailRequests.delete(userId)
        setDetailLoading(userId, false)
      }
    }
  }

  const expandedRowKeys = ref<number[]>([])

  function handleUpdateExpanded(keys: (string | number)[]) {
    expandedRowKeys.value = keys as number[]
    const lastKey = keys[keys.length - 1]
    if (lastKey)
      void loadDetailData(lastKey as number)
  }

  function rowProps(row: AdminUserItem) {
    return {
      style: 'cursor: pointer;',
      onClick: () => {
        if (expandedRowKeys.value.includes(row.id)) {
          expandedRowKeys.value = []
          return
        }

        expandedRowKeys.value = [row.id]
        void loadDetailData(row.id)
      },
    }
  }

  const mobileExpandedId = ref<number | null>(null)

  function toggleMobileExpand(id: number) {
    if (mobileExpandedId.value === id) {
      mobileExpandedId.value = null
      return
    }

    mobileExpandedId.value = id
    void loadDetailData(id)
  }

  async function loadData() {
    const requestId = ++listRequestSeq
    loadError.value = ''
    loading.value = true
    expandedRowKeys.value = []
    mobileExpandedId.value = null

    try {
      const res = await fetchAdminUserList({
        page: pagination.page,
        pageSize: pagination.pageSize,
        email: searchForm.keyword || undefined,
        role: searchForm.role ?? undefined,
        status: searchForm.status ?? undefined,
      })
      if (requestId !== listRequestSeq)
        return
      const data = unwrapApiData(res, {
        list: [] as AdminUserItem[],
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: 0,
      })
      list.value = data.list
      pagination.itemCount = data.total
      pruneDetailCache()
    }
    catch (e: unknown) {
      if (requestId === listRequestSeq && !shouldIgnoreApiError(e)) {
        loadError.value = '加载失败'
        message.error('加载失败')
      }
    }
    finally {
      if (requestId === listRequestSeq)
        loading.value = false
    }
  }

  function handlePageChange(page: number) {
    pagination.page = page
    void loadData()
  }

  function handleSearch() {
    pagination.page = 1
    void loadData()
  }

  function handleReset() {
    searchForm.keyword = ''
    searchForm.role = null
    searchForm.status = null
    handleSearch()
  }

  function handleBan(row: AdminUserItem, e?: Event) {
    e?.stopPropagation()
    dialog.warning({
      title: '封禁确认',
      content: `确定要封禁「${row.nickname || row.email}」吗？`,
      positiveText: '确认封禁',
      negativeText: '取消',
      onPositiveClick: async () => {
        await banUser(row.id)
        message.success('已封禁')
        await loadData()
      },
    })
  }

  function handleUnban(row: AdminUserItem, e?: Event) {
    e?.stopPropagation()
    dialog.success({
      title: '解封确认',
      content: `确定要解封「${row.nickname || row.email}」吗？`,
      positiveText: '解封',
      onPositiveClick: async () => {
        await unbanUser(row.id)
        message.success('已解封')
        await loadData()
      },
    })
  }

  function handleDelete(row: AdminUserItem, e?: Event) {
    e?.stopPropagation()
    dialog.error({
      title: '删除用户',
      content: `确定要永久删除用户「${row.nickname || row.email}」吗？\n\n此操作不可撤销！`,
      positiveText: '确认删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          const res = await deleteUser(row.id)
          message.success(unwrapApiData<string | null>(res, null) || '已删除用户')
          await loadData()
        }
        catch (err: unknown) {
          if (shouldIgnoreApiError(err))
            return
          showApiError(message, err, '删除失败')
        }
      },
    })
  }

  function openPointsGrant(row: AdminUserItem, e?: Event) {
    e?.stopPropagation()
    pointsTarget.value = row
    pointsForm.amount = null
    pointsForm.reason = ''
    pointsModalVisible.value = true
  }

  async function submitPointsGrant() {
    const target = pointsTarget.value
    const amount = Number(pointsForm.amount)
    if (!target || !Number.isFinite(amount) || amount <= 0) {
      message.warning('请输入大于 0 的积分数量')
      return
    }

    pointsSubmitting.value = true
    try {
      const res = await grantUserPoints(target.id, {
        amount,
        reason: pointsForm.reason.trim() || undefined,
      })
      const data = unwrapApiData(res)
      message.success(`已给 ${target.nickname || target.email} 发放 ${data.grantedPoints} 积分，当前余额 ${data.balance}`)
      pointsModalVisible.value = false
    }
    catch (err: unknown) {
      if (!shouldIgnoreApiError(err))
        showApiError(message, err, '发放积分失败')
    }
    finally {
      pointsSubmitting.value = false
    }
  }

  onMounted(() => {
    void loadData()
  })
  onUnmounted(() => {
    listRequestSeq += 1
    detailRequestSeq += 1
    detailRequests.clear()
  })

  return {
    loadError,
    canSubmitPointsGrant,
    detailFor,
    expandedRowKeys,
    handleBan,
    handleDelete,
    handlePageChange,
    handleReset,
    handleSearch,
    handleUnban,
    handleUpdateExpanded,
    hasNextPage,
    isDetailLoading,
    isMobile,
    list,
    loadData,
    loading,
    mobileExpandedId,
    openPointsGrant,
    pagination,
    pointsForm,
    pointsModalVisible,
    pointsSubmitting,
    pointsTarget,
    rowProps,
    searchForm,
    submitPointsGrant,
    toggleMobileExpand,
  }
}
