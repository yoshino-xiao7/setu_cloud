<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { NeteasePlaybackProbe, NeteaseToken, NeteaseTokenCheckResult } from '@/api/music'
import {
  AddOutline,
  CreateOutline,
  ShieldCheckmarkOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {

  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
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

const message = useMessage()
const { isCompact } = useBreakpoint()
const tokenGuard = useRequestGuard()
const DEFAULT_PROBE_SONG_ID = '32358362'

// =======================
// 数据和状态
// =======================
const loading = ref(false)
const tokens = shallowRef<NeteaseToken[]>([])
const tokenCheckResults = shallowRef<Record<number, NeteaseTokenCheckResult>>({})
const checkingTokenIds = shallowRef(new Set<number>())
const probeSongId = ref(DEFAULT_PROBE_SONG_ID)

// 添加/编辑弹窗
const showModal = ref(false)
const modalTitle = ref('添加 Token')
const editingId = ref<number | null>(null)
const submitting = ref(false)

// 表单数据
const formData = ref({
  cookie: '',
  nickname: '',
  status: 1 as 0 | 1,
})

// =======================
// 辅助函数
// =======================
// 脱敏显示 Cookie
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
  if (checking) {
    next.add(tokenId)
  }
  else {
    next.delete(tokenId)
  }
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

// =======================
// 数据加载
// =======================
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

// =======================
// 添加 Token
// =======================
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

// =======================
// 编辑 Token
// =======================
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

// =======================
// 提交表单
// =======================
async function handleSubmit() {
  if (!formData.value.cookie.trim()) {
    message.warning('请填写 Cookie')
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      // 编辑
      await adminMusicApi.updateToken(editingId.value, formData.value)
      message.success('Token 更新成功')
    }
    else {
      // 添加
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

// =======================
// 删除 Token
// =======================
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

// =======================
// 快速切换状态
// =======================
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

    if (!result) {
      throw new Error('检测响应异常')
    }

    tokenCheckResults.value = {
      ...tokenCheckResults.value,
      [token.id]: result,
    }

    const reason = getCheckReason(result)
    if (result.playbackProbe?.fullPlayable) {
      message.success(reason)
    }
    else if (!result.cookieValid || result.playbackProbe?.playability === 'LOGIN_INVALID') {
      message.error(reason)
    }
    else {
      message.warning(reason)
    }
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

// =======================
// 表格列配置
// =======================
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

// =======================
// 生命周期
// =======================
onMounted(() => {
  fetchTokens()
})
</script>

<template>
  <div class="page-container">
    <!-- 头部 -->
    <div class="header-section">
      <div>
        <h2 class="title">
          网易云音乐 Token 管理
        </h2>
        <p class="subtitle">
          管理网易云音乐 Cookie，用于代理音乐服务
        </p>
      </div>
      <div class="header-actions">
        <NInput
          v-model:value="probeSongId"
          class="probe-input"
          placeholder="VIP 测试歌曲 ID"
        />
        <NButton type="primary" size="large" @click="openAddModal">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          添加 Token
        </NButton>
      </div>
    </div>

    <!-- Token 列表 -->
    <NDataTable
      v-if="!isCompact"
      :columns="columns"
      :data="tokens"
      :loading="loading"
      :bordered="false"
      :scroll-x="1200"
      class="data-table"
    />

    <div v-else class="token-mobile-list">
      <div v-if="loading && tokens.length === 0" class="mobile-loading">
        加载中...
      </div>
      <div v-else-if="tokens.length === 0" class="empty-card">
        暂无 Token
      </div>
      <div v-for="token in tokens" :key="token.id" class="token-card">
        <div class="token-card-header">
          <div>
            <div class="token-name">
              {{ token.nickname || `Token #${token.id}` }}
            </div>
            <div class="token-id">
              #{{ token.id }}
            </div>
          </div>
          <NTag :type="token.status === 1 ? 'success' : 'default'" size="small" round>
            {{ token.status === 1 ? '启用' : '禁用' }}
          </NTag>
        </div>
        <div class="token-cookie">
          {{ maskCookie(token.cookie) }}
        </div>
        <div class="token-meta">
          <span>创建：{{ formatDate(token.createdAt) }}</span>
          <span>更新：{{ formatDate(token.updatedAt) }}</span>
        </div>
        <div class="token-check">
          <NTag :type="getCheckTagType(getTokenCheckResult(token.id))" size="small" round>
            {{ getCheckLabel(getTokenCheckResult(token.id)) }}
          </NTag>
          <span>{{ getCheckReason(getTokenCheckResult(token.id)) }}</span>
        </div>
        <div class="token-actions">
          <NSpace align="center">
            <span class="switch-label">启用</span>
            <NSwitch :value="token.status === 1" @update:value="() => handleToggleStatus(token)" />
          </NSpace>
          <div class="token-buttons">
            <NButton
              size="small"
              secondary
              type="info"
              :loading="isCheckingToken(token.id)"
              @click="handleCheckToken(token)"
            >
              <template #icon>
                <NIcon><ShieldCheckmarkOutline /></NIcon>
              </template>
              检测
            </NButton>
            <NButton size="small" secondary type="primary" @click="openEditModal(token)">
              <template #icon>
                <NIcon><CreateOutline /></NIcon>
              </template>
              编辑
            </NButton>
            <NPopconfirm
              positive-text="确认删除"
              negative-text="取消"
              @positive-click="handleDelete(token.id, token.nickname)"
            >
              <template #trigger>
                <NButton size="small" secondary type="error">
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                  删除
                </NButton>
              </template>
              确定要删除 Token「{{ token.nickname }}」吗？此操作不可恢复！
            </NPopconfirm>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      :style="{ width: '600px', maxWidth: '92vw' }"
      :mask-closable="false"
    >
      <NForm label-placement="top" label-width="80">
        <NFormItem label="Cookie" required>
          <NInput
            v-model:value="formData.cookie"
            type="textarea"
            placeholder="请粘贴完整的网易云 Cookie&#10;示例：MUSIC_U=xxxxx; __csrf=yyyyy"
            :rows="6"
          />
        </NFormItem>

        <NFormItem label="昵称">
          <NInput
            v-model:value="formData.nickname"
            placeholder="如：主账号、备用账号"
          />
        </NFormItem>

        <NFormItem v-if="editingId" label="状态">
          <NSpace align="center">
            <NSwitch v-model:value="formData.status" :checked-value="1" :unchecked-value="0" />
            <span style="color: #666;">{{ formData.status === 1 ? '启用' : '禁用' }}</span>
          </NSpace>
        </NFormItem>

        <!-- 帮助说明 -->
        <NSpace vertical style="margin-top: 16px; padding: 12px; background: #f5f7fa; border-radius: 8px;">
          <div style="font-weight: 600; color: #333;">
            📖 如何获取网易云 Cookie？
          </div>
          <div style="color: #666; font-size: 13px; line-height: 1.6;">
            1. 登录网易云音乐网页版（music.163.com）<br>
            2. 按 F12 打开开发者工具<br>
            3. 切换到"网络"（Network）选项卡<br>
            4. 刷新页面，找到任意请求<br>
            5. 在请求头中找到 Cookie，复制完整内容
          </div>
        </NSpace>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">
            取消
          </NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingId ? '保存' : '确定' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.probe-input {
  width: 220px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.data-table {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.playability-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.playability-reason {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.35;
}

.token-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-loading,
.empty-card,
.token-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mobile-loading,
.empty-card {
  color: #6b7280;
  text-align: center;
}

.token-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-card-header,
.token-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.token-name {
  color: #1f2937;
  font-size: 15px;
  font-weight: 800;
}

.token-id,
.token-meta {
  color: #6b7280;
  font-size: 12px;
}

.token-cookie {
  color: #4b5563;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.token-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.45;
}

.switch-label {
  color: #6b7280;
  font-size: 13px;
}

.token-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 640px) {
  .page-container {
    padding: 16px;
  }

  .header-section {
    align-items: stretch;
  }

  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .probe-input {
    width: 100%;
  }

  .header-section :deep(.n-button) {
    width: 100%;
  }

  .token-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .token-buttons,
  .token-buttons :deep(.n-button) {
    width: 100%;
  }

  .token-buttons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
