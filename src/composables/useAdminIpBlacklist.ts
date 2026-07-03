import type { DataTableColumns, DataTableRowKey, FormInst, FormValidationError } from 'naive-ui'
import type { BlacklistIpItem, TempBlockItem } from '@/api/admin'
import {
  GlobeOutline,
  TimeOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
  NTag,
  NTooltip,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import {
  addIpBlacklist,
  clearAllTempBlocks,
  clearTempBlock,
  fetchIpBlacklist,
  fetchTempBlockList,
  removeIpBlacklist,
} from '@/api/admin'
import { unwrapApiList } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatDate } from '@/utils/dateFormat'

export function useAdminIpBlacklist() {
  const message = useMessage()
  const dialog = useDialog()
  const { isCompact } = useBreakpoint()
  const blacklistGuard = useRequestGuard()
  const tempBlockGuard = useRequestGuard()

  const loading = ref(false)
  const fullList = shallowRef<BlacklistIpItem[]>([])
  const searchText = ref('')
  const checkedRowKeys = ref<DataTableRowKey[]>([])

  const filteredList = computed(() => {
    if (!searchText.value)
      return fullList.value
    const lowerText = searchText.value.toLowerCase()
    return fullList.value.filter(item =>
      item.ip.includes(lowerText)
      || (item.reason && item.reason.toLowerCase().includes(lowerText)),
    )
  })

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 条`,
  })

  const pagedList = computed(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    return filteredList.value.slice(start, start + pagination.pageSize)
  })

  watch(searchText, () => {
    pagination.page = 1
    checkedRowKeys.value = []
  })

  async function loadData() {
    const requestId = blacklistGuard.next()
    loading.value = true
    checkedRowKeys.value = []
    try {
      const res = await fetchIpBlacklist()
      if (!blacklistGuard.isCurrent(requestId))
        return

      fullList.value = unwrapApiList<BlacklistIpItem>(res)
      pagination.page = 1
    }
    catch {
      if (!blacklistGuard.isCurrent(requestId))
        return
      message.error('加载黑名单失败')
    }
    finally {
      if (blacklistGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  const tempBlockList = shallowRef<TempBlockItem[]>([])
  const tempBlockLoading = ref(false)

  async function loadTempBlocks() {
    const requestId = tempBlockGuard.next()
    tempBlockLoading.value = true
    try {
      const res = await fetchTempBlockList()
      if (!tempBlockGuard.isCurrent(requestId))
        return

      tempBlockList.value = unwrapApiList<TempBlockItem>(res)
    }
    catch {
      if (!tempBlockGuard.isCurrent(requestId))
        return
      tempBlockList.value = []
    }
    finally {
      if (tempBlockGuard.isCurrent(requestId))
        tempBlockLoading.value = false
    }
  }

  function handleClearTempBlock(ip: string) {
    dialog.warning({
      title: '解除确认',
      content: `确定解除 IP「${ip}」的临时封禁吗？`,
      positiveText: '解除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await clearTempBlock(ip)
          message.success('已解除临时封禁')
          void loadTempBlocks()
        }
        catch {
          message.error('操作失败')
        }
      },
    })
  }

  function handleClearAllTempBlocks() {
    if (tempBlockList.value.length === 0)
      return
    dialog.warning({
      title: '清空确认',
      content: `确定清除所有 ${tempBlockList.value.length} 个临时封禁吗？`,
      positiveText: '全部清除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await clearAllTempBlocks()
          message.success('已清除所有临时封禁')
          void loadTempBlocks()
        }
        catch {
          message.error('操作失败')
        }
      },
    })
  }

  const showAddModal = ref(false)
  const addLoading = ref(false)
  const formRef = ref<FormInst | null>(null)
  const formModel = reactive({ ips: '', reason: '' })

  function openAddModal() {
    formModel.ips = ''
    formModel.reason = ''
    showAddModal.value = true
  }

  function handleAdd() {
    formRef.value?.validate(async (errors: FormValidationError[] | undefined) => {
      if (errors)
        return

      const ipList = formModel.ips.split(/[\n,]+/).map(ip => ip.trim()).filter(ip => ip.length > 0)
      if (ipList.length === 0) {
        message.warning('请输入有效的 IP')
        return
      }

      addLoading.value = true
      try {
        await Promise.all(ipList.map(ip => addIpBlacklist(ip, formModel.reason)))
        message.success(`已封禁 ${ipList.length} 个 IP`)
        showAddModal.value = false
        void loadData()
      }
      catch {
        message.error('操作失败')
      }
      finally {
        addLoading.value = false
      }
    })
  }

  function handleRemove(row: BlacklistIpItem) {
    dialog.warning({
      title: '移除确认',
      content: `确定解封 IP「${row.ip}」吗？`,
      positiveText: '移除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await removeIpBlacklist(row.ip)
          message.success('已移除')
          void loadData()
        }
        catch {
          message.error('移除失败')
        }
      },
    })
  }

  const batchRemoveLoading = ref(false)
  function handleBatchRemove() {
    const count = checkedRowKeys.value.length
    if (count === 0)
      return
    dialog.warning({
      title: '批量解封',
      content: `确定移除选中的 ${count} 个 IP 吗？`,
      positiveText: `确定移除 (${count})`,
      onPositiveClick: async () => {
        batchRemoveLoading.value = true
        const targets = checkedRowKeys.value.map(ip => String(ip))
        const failures: { ip: string, message: string }[] = []
        let successCount = 0
        try {
          for (const ip of targets) {
            try {
              await removeIpBlacklist(ip)
              successCount += 1
            }
            catch (error) {
              failures.push({
                ip,
                message: shouldIgnoreApiError(error)
                  ? '请求已取消'
                  : getApiErrorMessage(error, '移除失败'),
              })
            }
          }

          const failedCount = failures.length
          if (failedCount === 0) {
            message.success(`成功移除 ${successCount} 个 IP`)
          }
          else if (successCount > 0) {
            const firstFailure = failures[0]
            message.warning(`已移除 ${successCount} 个，${failedCount} 个失败：${firstFailure.ip} ${firstFailure.message}`)
          }
          else {
            message.error(failures[0]?.message || '批量移除失败')
          }

          await loadData()
        }
        finally {
          batchRemoveLoading.value = false
        }
      },
    })
  }

  const columns: DataTableColumns<BlacklistIpItem> = [
    { type: 'selection' },
    {
      title: '被封禁 IP',
      key: 'ip',
      width: 180,
      render(row) {
        return h(NTag, { type: 'error', bordered: false, style: { fontFamily: 'monospace' } }, {
          default: () => row.ip,
          icon: () => h(NIcon, null, { default: () => h(GlobeOutline) }),
        })
      },
    },
    {
      title: '封禁原因',
      key: 'reason',
      render(row) {
        return row.reason
          ? h('span', { class: 'text-gray' }, row.reason)
          : h('span', { class: 'text-light-gray' }, '未填写原因')
      },
    },
    {
      title: '封禁时间',
      key: 'createdAt',
      width: 200,
      render(row) {
        if (!row.createdAt)
          return '-'
        return h('div', { class: 'flex-center text-sm text-gray-500' }, [
          h(NIcon, { class: 'mr-1' }, { default: () => h(TimeOutline) }),
          formatDate(row.createdAt),
        ])
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render(row) {
        return h(NTooltip, { trigger: 'hover' }, {
          trigger: () => h(NButton, {
            size: 'small',
            circle: true,
            type: 'error',
            quaternary: true,
            onClick: () => handleRemove(row),
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
          default: () => '移除该 IP',
        })
      },
    },
  ]

  onMounted(() => {
    void loadData()
    void loadTempBlocks()
  })

  return {
    addLoading,
    batchRemoveLoading,
    checkedRowKeys,
    columns,
    filteredList,
    formModel,
    formRef,
    handleAdd,
    handleBatchRemove,
    handleClearAllTempBlocks,
    handleClearTempBlock,
    handleRemove,
    isCompact,
    loadData,
    loading,
    openAddModal,
    pagedList,
    pagination,
    searchText,
    showAddModal,
    tempBlockList,
    tempBlockLoading,
  }
}
