import type { DataTableColumns } from 'naive-ui'
import type { AdminUserDetail, AdminUserItem } from '@/api/admin'
import {
  BanOutline,
  CashOutline,
  CheckmarkCircleOutline,
  KeyOutline,
  PersonOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NSpace, NSpin, NTag, useDialog, useMessage } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
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
import { formatDate } from '@/utils/dateFormat'

const DETAIL_CACHE_LIMIT = 24

export function useUserManagement() {
  const message = useMessage()
  const dialog = useDialog()
  const { isCompact: isMobile } = useBreakpoint()

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
      if (requestId === listRequestSeq && !shouldIgnoreApiError(e))
        message.error('加载失败')
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

  function renderExpandedRow(row: AdminUserItem) {
    const detail = detailFor(row.id)
    const isLoading = isDetailLoading(row.id)

    if (isLoading)
      return h('div', { class: 'expand-loading slide-in-top' }, h(NSpin, { size: 'small' }))

    if (!detail)
      return h('div', { class: 'expand-loading slide-in-top' }, '加载失败')

    const keyNodes = detail.apiKeys.length === 0
      ? h(NEmpty, { description: '该用户暂无 API Key', size: 'small' })
      : h('div', { class: 'expand-key-grid' }, detail.apiKeys.map((k) => {
          return h('div', { class: 'mini-key-card' }, [
            h('div', { class: 'key-top' }, [
              h('span', { class: 'k-name' }, k.name),
              h(NTag, { type: k.status === 1 ? 'success' : 'error', size: 'tiny', bordered: false, round: true }, { default: () => k.status === 1 ? '启用' : '禁用' }),
            ]),
            h('div', { class: 'key-info' }, `调用: ${k.totalCalls} | 限额: ${k.dailyQuota}`),
          ])
        }))

    return h('div', { class: 'expand-container slide-in-top' }, [
      h('div', { class: 'expand-section info-section' }, [
        h('div', { class: 'sec-title' }, [h(NIcon, null, { default: () => h(PersonOutline) }), ' 详细信息']),
        h('div', { class: 'info-grid' }, [
          h('div', { class: 'info-cell' }, [h('span', 'ID'), h('strong', detail.id)]),
          h('div', { class: 'info-cell' }, [h('span', '注册IP'), h('strong', detail.registerIp || '-')]),
          h('div', { class: 'info-cell' }, [h('span', '最后登录'), h('strong', detail.lastLoginIp || '-')]),
          h('div', { class: 'info-cell' }, [h('span', '注册时间'), h('strong', formatDate(detail.createdAt))]),
        ]),
      ]),
      h('div', { class: 'expand-section key-section' }, [
        h('div', { class: 'sec-title' }, [h(NIcon, null, { default: () => h(KeyOutline) }), ` API Keys (${detail.apiKeys.length})`]),
        keyNodes,
      ]),
    ])
  }

  const columns: DataTableColumns<AdminUserItem> = [
    { type: 'expand', renderExpand: renderExpandedRow },
    { title: 'ID', key: 'id', width: 60, align: 'center' },
    {
      title: '用户',
      key: 'email',
      width: 200,
      render(row) {
        return h('div', { class: 'user-col' }, [
          h('span', { class: 'u-nick' }, row.nickname || '-'),
          h('span', { class: 'u-email' }, row.email),
        ])
      },
    },
    {
      title: '角色',
      key: 'role',
      width: 100,
      align: 'center',
      render(row) {
        return h(NTag, { type: row.role === 1 ? 'error' : 'info', bordered: false, round: true, size: 'small' }, { default: () => row.role === 1 ? '管理员' : '用户' })
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      align: 'center',
      render(row) {
        if (row.status === 0)
          return h(NTag, { type: 'error', bordered: false, size: 'small' }, { default: () => '封禁' })

        if (!row.emailVerified)
          return h(NTag, { type: 'warning', bordered: false, size: 'small' }, { default: () => '待验证' })

        return h(NTag, { type: 'success', bordered: false, size: 'small' }, { default: () => '正常' })
      },
    },
    {
      title: '邮箱',
      key: 'emailVerified',
      width: 90,
      align: 'center',
      render(row) {
        return h(NTag, {
          type: row.emailVerified ? 'success' : 'warning',
          bordered: false,
          size: 'small',
        }, {
          default: () => row.emailVerified ? '✓ 已验证' : '✗ 未验证',
        })
      },
    },
    { title: '注册时间', key: 'createdAt', width: 140, render: row => formatDate(row.createdAt) },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      align: 'center',
      render(row) {
        return h(NSpace, { justify: 'center' }, { default: () => [
          h(NButton, { size: 'tiny', text: true, type: 'warning', onClick: e => openPointsGrant(row, e) }, { icon: () => h(NIcon, null, { default: () => h(CashOutline) }), default: () => '加积分' }),
          row.status === 1
            ? h(NButton, { size: 'tiny', text: true, type: 'error', onClick: e => handleBan(row, e) }, { icon: () => h(NIcon, null, { default: () => h(BanOutline) }), default: () => '封禁' })
            : h(NButton, { size: 'tiny', text: true, type: 'success', onClick: e => handleUnban(row, e) }, { icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }), default: () => '解封' }),
          h(NButton, { size: 'tiny', text: true, type: 'error', onClick: e => handleDelete(row, e) }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }), default: () => '删除' }),
        ] })
      },
    },
  ]

  onMounted(() => {
    void loadData()
  })
  onUnmounted(() => {
    listRequestSeq += 1
    detailRequestSeq += 1
    detailRequests.clear()
  })

  return {
    canSubmitPointsGrant,
    columns,
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
