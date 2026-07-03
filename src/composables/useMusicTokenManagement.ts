import type { DataTableColumns } from 'naive-ui'
import type { NeteasePlaybackProbe, NeteaseToken, NeteaseTokenCheckResult } from '@/api/music'
import {
  CreateOutline,
  ShieldCheckmarkOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import { h, onMounted, ref, shallowRef } from 'vue'
import { adminMusicApi } from '@/api/music'
import { unwrapApiData, unwrapApiList } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useRequestGuard } from '@/composables/useRequestGuard'
import { formatDate } from '@/utils/dateFormat'

const DEFAULT_PROBE_SONG_ID = '32358362'

export function useMusicTokenManagement() {
  const message = useMessage()
  const { isCompact } = useBreakpoint()
  const tokenGuard = useRequestGuard()

  const loading = ref(false)
  const tokens = shallowRef<NeteaseToken[]>([])
  const tokenCheckResults = shallowRef<Record<number, NeteaseTokenCheckResult>>({})
  const checkingTokenIds = shallowRef(new Set<number>())
  const probeSongId = ref(DEFAULT_PROBE_SONG_ID)

  const showModal = ref(false)
  const modalTitle = ref('添加 Token')
  const editingId = ref<number | null>(null)
  const submitting = ref(false)

  const formData = ref({
    cookie: '',
    nickname: '',
    status: 1 as 0 | 1,
  })

  function maskCookie(cookie: string) {
    if (!cookie)
      return '-'
    if (cookie.length <= 20)
      return cookie
    return `${cookie.substring(0, 20)}...`
  }

  function getTokenCheckResult(tokenId: number) {
    return tokenCheckResults.value[tokenId]
  }

  function isCheckingToken(tokenId: number) {
    return checkingTokenIds.value.has(tokenId)
  }

  function setCheckingToken(tokenId: number, checking: boolean) {
    const next = new Set(checkingTokenIds.value)
    if (checking)
      next.add(tokenId)
    else
      next.delete(tokenId)
    checkingTokenIds.value = next
  }

  function getProbePlayability(probe?: NeteasePlaybackProbe) {
    return probe?.playability
  }

  function getCheckTagType(result?: NeteaseTokenCheckResult) {
    if (!result)
      return 'default'
    if (!result.cookieValid || getProbePlayability(result.playbackProbe) === 'LOGIN_INVALID')
      return 'error'
    if (result.playbackProbe?.fullPlayable)
      return 'success'
    if (getProbePlayability(result.playbackProbe) === 'TRIAL')
      return 'warning'
    if (getProbePlayability(result.playbackProbe) === 'UNAVAILABLE')
      return 'error'
    if (result.vip)
      return 'info'
    return 'default'
  }

  function getCheckLabel(result?: NeteaseTokenCheckResult) {
    if (!result)
      return '未检测'
    if (!result.cookieValid || getProbePlayability(result.playbackProbe) === 'LOGIN_INVALID')
      return 'Cookie 失效'
    if (result.playbackProbe?.fullPlayable)
      return '完整可播'
    if (getProbePlayability(result.playbackProbe) === 'TRIAL')
      return '仅试听'
    if (getProbePlayability(result.playbackProbe) === 'UNAVAILABLE')
      return '不可播'
    if (result.vip)
      return '疑似 VIP'
    return '非 VIP/未知'
  }

  function getCheckReason(result?: NeteaseTokenCheckResult) {
    if (!result)
      return '点击检测确认 Cookie 与 VIP 歌曲可播性'
    if (!result.cookieValid || getProbePlayability(result.playbackProbe) === 'LOGIN_INVALID')
      return '网易云 Cookie 已失效，请更新'

    const probe = result.playbackProbe
    if (probe?.fullPlayable)
      return probe.reason || '测试歌曲可完整播放'
    if (probe?.playability === 'TRIAL')
      return probe.reason || '测试歌曲仅返回试听链接'
    if (probe?.playability === 'UNAVAILABLE')
      return probe.reason || '测试歌曲暂不可播，建议换一首确认是 VIP 的歌曲复查'
    if (probe?.skipped)
      return '未传测试歌曲，仅检查登录态和账号字段'
    if (result.vip)
      return '账号字段疑似 VIP，建议填写测试歌曲 ID 复查'
    return '账号字段未显示 VIP，或尚未验证播放能力'
  }

  async function fetchTokens() {
    const requestId = tokenGuard.next()
    loading.value = true
    try {
      const res = await adminMusicApi.getTokens()
      if (!tokenGuard.isCurrent(requestId))
        return

      tokens.value = unwrapApiList<NeteaseToken>(res)
    }
    catch (e: unknown) {
      if (!tokenGuard.isCurrent(requestId) || shouldIgnoreApiError(e))
        return
      showApiError(message, e, '加载失败')
    }
    finally {
      if (tokenGuard.isCurrent(requestId))
        loading.value = false
    }
  }

  function openAddModal() {
    modalTitle.value = '添加网易云音乐 Token'
    editingId.value = null
    formData.value = {
      cookie: '',
      nickname: '',
      status: 1,
    }
    showModal.value = true
  }

  function openEditModal(token: NeteaseToken) {
    modalTitle.value = '编辑 Token'
    editingId.value = token.id
    formData.value = {
      cookie: token.cookie,
      nickname: token.nickname,
      status: token.status,
    }
    showModal.value = true
  }

  async function handleSubmit() {
    if (!formData.value.cookie.trim()) {
      message.warning('请填写 Cookie')
      return
    }

    submitting.value = true
    try {
      if (editingId.value) {
        await adminMusicApi.updateToken(editingId.value, formData.value)
        message.success('Token 更新成功')
      }
      else {
        await adminMusicApi.addToken({
          cookie: formData.value.cookie,
          nickname: formData.value.nickname || '未命名账号',
        })
        message.success('Token 添加成功')
      }

      showModal.value = false
      await fetchTokens()
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      showApiError(message, e, '操作失败')
    }
    finally {
      submitting.value = false
    }
  }

  async function handleDelete(id: number, nickname: string) {
    try {
      await adminMusicApi.deleteToken(id)
      message.success(`Token「${nickname}」删除成功`)
      await fetchTokens()
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      showApiError(message, e, '删除失败')
    }
  }

  async function handleToggleStatus(token: NeteaseToken) {
    const newStatus = token.status === 1 ? 0 : 1
    try {
      await adminMusicApi.updateToken(token.id, { status: newStatus })
      message.success('状态已更新')
      await fetchTokens()
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      showApiError(message, e, '状态更新失败')
    }
  }

  async function handleCheckToken(token: NeteaseToken) {
    setCheckingToken(token.id, true)
    try {
      const trimmedProbeSongId = probeSongId.value.trim()
      const res = await adminMusicApi.checkToken(token.id, {
        level: 'exhigh',
        probeSongId: trimmedProbeSongId || DEFAULT_PROBE_SONG_ID,
      })
      const result = unwrapApiData<NeteaseTokenCheckResult | null>(res, null)

      if (!result)
        throw new Error('检测响应异常')

      tokenCheckResults.value = {
        ...tokenCheckResults.value,
        [token.id]: result,
      }

      const reason = getCheckReason(result)
      if (result.playbackProbe?.fullPlayable)
        message.success(reason)
      else if (!result.cookieValid || result.playbackProbe?.playability === 'LOGIN_INVALID')
        message.error(reason)
      else
        message.warning(reason)
    }
    catch (e: unknown) {
      if (shouldIgnoreApiError(e))
        return
      showApiError(message, e, '检测失败')
    }
    finally {
      setCheckingToken(token.id, false)
    }
  }

  const columns: DataTableColumns<NeteaseToken> = [
    { title: 'ID', key: 'id', width: 80 },
    { title: '昵称', key: 'nickname', width: 150 },
    {
      title: 'Cookie',
      key: 'cookie',
      width: 200,
      render: row => maskCookie(row.cookie),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (row) => {
        return h(
          NTag,
          {
            type: row.status === 1 ? 'success' : 'default',
            size: 'small',
            round: true,
          },
          { default: () => (row.status === 1 ? '启用' : '禁用') },
        )
      },
    },
    {
      title: '快速切换',
      key: 'toggle',
      width: 100,
      render: (row) => {
        return h(NSwitch, {
          'value': row.status === 1,
          'onUpdate:value': () => handleToggleStatus(row),
        })
      },
    },
    { title: '创建时间', key: 'createdAt', width: 180, render: row => formatDate(row.createdAt) },
    { title: '更新时间', key: 'updatedAt', width: 180, render: row => formatDate(row.updatedAt) },
    {
      title: '可播性检测',
      key: 'playability',
      width: 220,
      render: (row) => {
        const result = getTokenCheckResult(row.id)
        return h(
          'div',
          { class: 'playability-cell' },
          [
            h(
              NTag,
              {
                type: getCheckTagType(result),
                size: 'small',
                round: true,
              },
              { default: () => getCheckLabel(result) },
            ),
            h('span', { class: 'playability-reason' }, getCheckReason(result)),
          ],
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (row) => {
        return h(
          NSpace,
          { size: 'small' },
          {
            default: () => [
              h(
                NButton,
                {
                  size: 'small',
                  secondary: true,
                  type: 'info',
                  loading: isCheckingToken(row.id),
                  onClick: () => handleCheckToken(row),
                },
                {
                  icon: () => h(NIcon, null, { default: () => h(ShieldCheckmarkOutline) }),
                  default: () => '检测',
                },
              ),
              h(
                NButton,
                {
                  size: 'small',
                  secondary: true,
                  type: 'primary',
                  onClick: () => openEditModal(row),
                },
                {
                  icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
                  default: () => '编辑',
                },
              ),
              h(
                NPopconfirm,
                {
                  positiveText: '确认删除',
                  negativeText: '取消',
                  onPositiveClick: () => handleDelete(row.id, row.nickname),
                },
                {
                  trigger: () =>
                    h(
                      NButton,
                      {
                        size: 'small',
                        secondary: true,
                        type: 'error',
                      },
                      {
                        icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
                        default: () => '删除',
                      },
                    ),
                  default: () => `确定要删除 Token「${row.nickname}」吗？此操作不可恢复！`,
                },
              ),
            ],
          },
        )
      },
    },
  ]

  onMounted(() => {
    void fetchTokens()
  })

  return {
    columns,
    fetchTokens,
    formData,
    getCheckLabel,
    getCheckReason,
    getCheckTagType,
    handleCheckToken,
    handleSubmit,
    handleToggleStatus,
    isCheckingToken,
    isCompact,
    loading,
    maskCookie,
    modalTitle,
    openAddModal,
    openEditModal,
    probeSongId,
    showModal,
    submitting,
    tokens,
  }
}
