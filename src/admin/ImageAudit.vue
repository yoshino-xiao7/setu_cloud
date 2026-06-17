<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { ImageAuditListDTO, ImageAuditListStats, ImageAuditScope } from '@/api/admin'
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  RefreshOutline,
  SearchOutline, // ✅ Added
  TrashOutline, // ✅ Added
} from '@vicons/ionicons5'
import {

  NButton,
  NDataTable,
  NIcon,
  NImage,
  NInput,
  NInputNumber, // ✅ Added
  NModal,
  NPagination, // For mobile view
  NRadioButton,
  NRadioGroup,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import {

  fetchImageAuditList,
  // deleteAdminImage, // ❌ Removed Direct Delete

  submitImageAuditResult,
} from '@/api/admin'
import { submitDeleteRequest } from '@/api/imageDeleteRequest' // ✅ Added
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { formatDateOnly } from '@/utils/dateFormat'

const message = useMessage()
const dialog = useDialog()
const DESKTOP_PAGE_SIZE = 20
const MOBILE_PAGE_SIZE = 8
const DEFAULT_STALE_DAYS = 30

const auditScopeOptions: Array<{ label: string, value: ImageAuditScope }> = [
  { label: '未审核', value: 'UNREVIEWED' },
  { label: '到期复审', value: 'DUE_REVIEW' },
  { label: '全部图库', value: 'ALL' },
]

// =======================
// 数据和状态
// =======================
const loading = ref(false)
const list = shallowRef<ImageAuditListDTO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: DESKTOP_PAGE_SIZE,
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page
    void fetchData()
  },
  showQuickJumper: true,
})
const pageCount = computed(() => Math.max(1, Math.ceil(pagination.itemCount / pagination.pageSize)))

// 移动端适配
const { isCompact: isMobile } = useBreakpoint()
let listRequestSeq = 0

const activePageSize = computed(() => isMobile.value ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE)

// 筛选状态
const scope = ref<ImageAuditScope>('UNREVIEWED')
const pidFilter = ref<number | null>(null)
const pFilter = ref<number | null>(null)
const staleDays = ref(DEFAULT_STALE_DAYS)
const stats = ref<ImageAuditListStats | null>(null)
const dueBefore = ref<string | null>(null)

// 审核有问题弹窗
const showRejectModal = ref(false)
const rejectReason = ref('')
const currentRejectId = ref<number | null>(null)
const submitting = ref(false)

// 申请删除弹窗
const showDeleteRequestModal = ref(false)
const deleteRequestReason = ref('')
const deleteTarget = ref<{ pid: number, p: number } | null>(null)

// =======================
// 数据加载
// =======================
function normalizeFilterNumber(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return undefined
  return Math.trunc(value)
}

function getScopeStatKey(value: ImageAuditScope): keyof ImageAuditListStats {
  if (value === 'DUE_REVIEW')
    return 'dueReview'
  if (value === 'ALL')
    return 'all'
  return 'unreviewed'
}

function getScopeLabel(value: ImageAuditScope) {
  return auditScopeOptions.find(option => option.value === value)?.label || value
}

function getScopeOptionLabel(value: ImageAuditScope) {
  const label = getScopeLabel(value)
  const count = stats.value?.[getScopeStatKey(value)]
  return typeof count === 'number' ? `${label} (${count})` : label
}

function validateFilters() {
  const pid = normalizeFilterNumber(pidFilter.value)
  const p = normalizeFilterNumber(pFilter.value)
  const reviewDays = normalizeFilterNumber(staleDays.value) ?? DEFAULT_STALE_DAYS

  if (pid !== undefined && pid < 1) {
    message.warning('PID 必须大于 0')
    return false
  }

  if (p !== undefined && pid === undefined) {
    message.warning('请先输入 PID，再筛选 p 页')
    return false
  }

  if (p !== undefined && p < 0) {
    message.warning('p 页不能小于 0')
    return false
  }

  if (reviewDays < 1 || reviewDays > 365) {
    message.warning('复审周期必须在 1 到 365 天之间')
    return false
  }

  return true
}

function buildListQuery() {
  if (!validateFilters())
    return null

  const pid = normalizeFilterNumber(pidFilter.value)
  const p = normalizeFilterNumber(pFilter.value)
  const reviewDays = normalizeFilterNumber(staleDays.value) ?? DEFAULT_STALE_DAYS

  return {
    page: pagination.page,
    pageSize: activePageSize.value,
    scope: scope.value,
    staleDays: reviewDays,
    ...(pid !== undefined ? { pid } : {}),
    ...(p !== undefined ? { p } : {}),
  }
}

async function fetchData() {
  const query = buildListQuery()
  if (!query)
    return

  const requestId = ++listRequestSeq
  pagination.pageSize = activePageSize.value
  loading.value = true
  try {
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
  catch (e: unknown) {
    if (requestId === listRequestSeq && !shouldIgnoreApiError(e)) {
      message.error(getApiErrorMessage(e, '加载列表失败'))
    }
  }
  finally {
    if (requestId === listRequestSeq)
      loading.value = false
  }
}

function parseAuditTime(value: string | null | undefined) {
  if (!value)
    return 0
  const timestamp = Date.parse(value.includes(' ') ? value.replace(' ', 'T') : value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getCurrentAuditTime() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function decreaseStat(key: keyof ImageAuditListStats) {
  if (!stats.value)
    return
  stats.value = {
    ...stats.value,
    [key]: Math.max(0, stats.value[key] - 1),
  }
}

function isDueReviewImage(row: ImageAuditListDTO) {
  const dueBeforeTime = parseAuditTime(dueBefore.value)
  const auditTime = parseAuditTime(row.lastAuditTime)
  return dueBeforeTime > 0 && auditTime > 0 && auditTime <= dueBeforeTime
}

function settleReviewedImage(imageId: number, auditStatus: 1 | 2, remark?: string | null) {
  const reviewedImage = list.value.find(item => item.id === imageId)
  if (!reviewedImage)
    return

  if (scope.value === 'ALL') {
    if (!reviewedImage.lastAuditTime)
      decreaseStat('unreviewed')
    if (isDueReviewImage(reviewedImage))
      decreaseStat('dueReview')

    const lastAuditTime = getCurrentAuditTime()
    list.value = list.value.map(item =>
      item.id === imageId
        ? {
            ...item,
            lastAuditStatus: auditStatus,
            lastAuditRemark: remark || null,
            lastAuditTime,
          }
        : item,
    )
    return
  }

  const nextList = list.value.filter(item => item.id !== imageId)
  if (nextList.length === list.value.length)
    return

  list.value = nextList
  pagination.itemCount = Math.max(0, pagination.itemCount - 1)
  decreaseStat(getScopeStatKey(scope.value))

  if (nextList.length === 0 && pagination.itemCount > 0) {
    pagination.page = Math.min(pagination.page, pageCount.value)
    void fetchData()
  }
}

function handleFilterSearch() {
  pagination.page = 1
  void fetchData()
}

function handleScopeChange() {
  pagination.page = 1
  void fetchData()
}

function resetFilters() {
  scope.value = 'UNREVIEWED'
  pidFilter.value = null
  pFilter.value = null
  staleDays.value = DEFAULT_STALE_DAYS
  pagination.page = 1
  void fetchData()
}

// =======================
// 操作逻辑
// =======================

// 审核通过
function handlePass(row: ImageAuditListDTO) {
  dialog.success({
    title: '确认审核通过',
    content: `确认将图片 (PID: ${row.pid}) 标记为“正常”吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await submitImageAuditResult({
          imageId: row.id,
          status: 1,
        })
        message.success('审核完成（正常）')
        settleReviewedImage(row.id, 1)
      }
      catch (e: unknown) {
        if (shouldIgnoreApiError(e))
          return
        message.error(getApiErrorMessage(e, '操作失败'))
      }
    },
  })
}

// 打开审核有问题弹窗
function openRejectModal(row: ImageAuditListDTO) {
  currentRejectId.value = row.id
  rejectReason.value = ''
  showRejectModal.value = true
}

// 提交审核有问题
async function handleSubmitReject() {
  if (!rejectReason.value.trim()) {
    message.warning('请填写问题描述')
    return
  }

  if (!currentRejectId.value)
    return

  const reviewedImageId = currentRejectId.value
  const reviewedRemark = rejectReason.value.trim()
  submitting.value = true
  try {
    const result = await submitImageAuditResult({
      imageId: reviewedImageId,
      status: 2,
      remark: reviewedRemark,
    })

    // 后端返回的 string 提示可能包含 "已自动创建删除申请..."
    message.success(unwrapApiData<string | null>(result, null) || '审核完成（有问题）')

    showRejectModal.value = false
    settleReviewedImage(reviewedImageId, 2, reviewedRemark)
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    message.error(getApiErrorMessage(e, '操作失败'))
  }
  finally {
    submitting.value = false
  }
}

// 打开申请删除弹窗
function handleRequestDelete(pid: number, p: number) {
  deleteTarget.value = { pid, p }
  deleteRequestReason.value = ''
  showDeleteRequestModal.value = true
}

// 提交删除申请
async function handleSubmitDeleteRequest() {
  if (!deleteRequestReason.value.trim()) {
    message.warning('请填写删除原因（以便记录日志）')
    return
  }

  if (!deleteTarget.value)
    return

  submitting.value = true
  try {
    await submitDeleteRequest(deleteTarget.value.pid, deleteTarget.value.p, deleteRequestReason.value)
    message.success('已提交删除申请，请前往“图片删除申请”页面进行最终审核')
    showDeleteRequestModal.value = false
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    message.error(getApiErrorMessage(e, '提交失败'))
  }
  finally {
    submitting.value = false
  }
}

function clearRejectState() {
  rejectReason.value = ''
  currentRejectId.value = null
}

function clearDeleteRequestState() {
  deleteRequestReason.value = ''
  deleteTarget.value = null
}

// =======================
// 表格列配置
// =======================
const columns: DataTableColumns<ImageAuditListDTO> = [
  {
    title: '缩略图',
    key: 'urlOriginal',
    width: 100,
    render(row) {
      return h(NImage, {
        width: 80,
        height: 80,
        src: row.urlOriginal,
        objectFit: 'cover',
        style: { borderRadius: '4px' },
        lazy: true,
        imgProps: {
          referrerpolicy: 'no-referrer',
          loading: 'lazy',
          decoding: 'async',
        },
        previewedImgProps: { style: { maxHeight: '90vh' } },
      })
    },
  },
  {
    title: '图片信息',
    key: 'info',
    width: 250,
    render(row) {
      return h(NSpace, { vertical: true, size: 4 }, {
        default: () => [
          h('div', `PID: ${row.pid}_p${row.p}`),
          h('div', { style: 'font-weight: 500' }, row.title),
          h('div', { style: 'color: #666; font-size: 12px' }, `作者: ${row.author}`),
          h('div', { style: 'color: #999; font-size: 12px' }, `${row.width}x${row.height} • ${row.ext.toUpperCase()}`),
          h(NButton, {
            size: 'tiny',
            text: true,
            type: 'primary',
            tag: 'a',
            href: row.urlOriginal,
            target: '_blank',
            style: 'margin-top: 4px; font-size: 12px;',
          }, { default: () => '查看原图链接' }),
        ],
      })
    },
  },
  {
    title: '类型',
    key: 'tags',
    width: 120,
    render(row) {
      return h(NSpace, { size: 4, vertical: true }, {
        default: () => [
          h(NTag, { type: row.r18 === 1 ? 'error' : 'success', size: 'small', bordered: false }, { default: () => row.r18 === 1 ? 'R18' : '全年龄' }),
          row.aiType === 2 ? h(NTag, { type: 'info', size: 'small', bordered: false }, { default: () => 'AI生成' }) : null,
        ],
      })
    },
  },
  {
    title: '上次审核',
    key: 'lastAudit',
    width: 200,
    render(row) {
      if (!row.lastAuditTime)
        return h('span', { style: 'color: #ccc' }, '未审核')

      return h(NSpace, { vertical: true, size: 2 }, {
        default: () => [
          h(NTag, {
            type: row.lastAuditStatus === 1 ? 'success' : 'warning',
            size: 'small',
            bordered: false,
          }, {
            default: () => row.lastAuditStatus === 1 ? '正常' : '有问题',
          }),
          row.lastAuditRemark ? h('div', { style: 'font-size: 12px; color: #f59e0b; margin-top: 4px' }, `备注: ${row.lastAuditRemark}`) : null,
          h('div', { style: 'font-size: 12px; color: #999; margin-top: 4px' }, formatDateOnly(row.lastAuditTime)),
          h('div', { style: 'font-size: 12px; color: #ccc' }, row.lastAuditAdminEmail || ''),
        ],
      })
    },
  },
  {
    title: '上传时间',
    key: 'uploadDate',
    width: 120,
    render: row => formatDateOnly(row.uploadDate),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 260,
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'tiny',
            type: 'success',
            secondary: true,
            onClick: () => handlePass(row),
          }, { icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }), default: () => '正常' }),
          h(NButton, {
            size: 'tiny',
            type: 'warning',
            secondary: true,
            onClick: () => openRejectModal(row),
          }, { icon: () => h(NIcon, null, { default: () => h(CloseCircleOutline) }), default: () => '问题' }),
          h(NButton, {
            size: 'tiny',
            type: 'error',
            tertiary: true,
            onClick: () => handleRequestDelete(row.pid, row.p),
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }), default: () => '申请删除' }),
        ],
      })
    },
  },
]

onMounted(() => {
  void fetchData()
})

watch(isMobile, () => {
  pagination.page = 1
  void fetchData()
})

watch(showRejectModal, (show) => {
  if (!show)
    clearRejectState()
})

watch(showDeleteRequestModal, (show) => {
  if (!show)
    clearDeleteRequestState()
})

onUnmounted(() => {
  listRequestSeq += 1
  loading.value = false
  submitting.value = false
  list.value = []
  stats.value = null
  dueBefore.value = null
  clearRejectState()
  clearDeleteRequestState()
})
</script>

<template>
  <div class="page-container">
    <!-- 头部 -->
    <div class="header-section">
      <div>
        <h2 class="title">
          图片库管理
        </h2>
        <p class="subtitle">
          管理数据库中的图片，由于 PID 和 p 唯一索引，支持精确搜索和审核
        </p>
      </div>
      <NButton :loading="loading" @click="fetchData">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar glass-card">
      <div class="scope-filter">
        <NRadioGroup v-model:value="scope" name="imageAuditScope" @update:value="handleScopeChange">
          <NRadioButton
            v-for="option in auditScopeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ getScopeOptionLabel(option.value) }}
          </NRadioButton>
        </NRadioGroup>
      </div>

      <div class="search-inputs">
        <div class="pid-filter-group">
          <NInputNumber
            v-model:value="pidFilter"
            class="pid-input"
            placeholder="PID"
            :min="1"
            :precision="0"
            :show-button="false"
            @keyup.enter="handleFilterSearch"
          />
          <span class="p-separator">_p</span>
          <NInputNumber
            v-model:value="pFilter"
            class="p-input"
            placeholder="p"
            :min="0"
            :precision="0"
            :show-button="false"
            @keyup.enter="handleFilterSearch"
          />
        </div>
        <NInputNumber
          v-if="scope === 'DUE_REVIEW'"
          v-model:value="staleDays"
          class="stale-input"
          placeholder="复审天数"
          :min="1"
          :max="365"
          :precision="0"
          :show-button="false"
          @keyup.enter="handleFilterSearch"
        />
        <div class="filter-actions">
          <NButton type="primary" :disabled="loading" @click="handleFilterSearch">
            <template #icon>
              <NIcon><SearchOutline /></NIcon>
            </template>
            查询
          </NButton>
          <NButton :disabled="loading" @click="resetFilters">
            重置
          </NButton>
        </div>
      </div>
      <div class="filter-meta">
        <span>当前 {{ getScopeLabel(scope) }} · 共 {{ pagination.itemCount }} 张</span>
        <span v-if="scope === 'DUE_REVIEW' && dueBefore">复审截止 {{ dueBefore }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <n-spin :show="loading">
      <!-- 列表模式 (桌面端) -->
      <NDataTable
        v-if="!isMobile"
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        remote
        :bordered="false"
        class="data-table"
        :scroll-x="1000"
      />

      <!-- 列表模式 (移动端卡片视图) -->
      <div v-else class="mobile-list-view">
        <div v-if="loading && list.length === 0" class="loading-placeholder">
          <!-- Loading handled by n-spin wrapper, but creates space if needed -->
        </div>
        <div v-else-if="list.length === 0" class="empty-state">
          <NIcon size="48" color="#ccc">
            <SearchOutline />
          </NIcon>
          <p style="color: #999">
            暂无数据
          </p>
        </div>

        <div v-else class="img-cards">
          <div v-for="row in list" :key="row.id" class="img-card glass-card">
            <div class="card-top">
              <NImage
                :src="row.urlOriginal"
                width="100%"
                height="200"
                object-fit="cover"
                :img-props="{ referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' }"
                style="border-radius: 8px 8px 0 0; display: block;"
                lazy
              />
              <div class="card-badges">
                <NTag :type="row.r18 ? 'error' : 'success'" size="small" style="margin-right: 4px">
                  {{ row.r18 ? 'R18' : '全年龄' }}
                </NTag>
                <NTag v-if="row.aiType === 2" type="warning" size="small">
                  AI
                </NTag>
              </div>
            </div>

            <div class="card-content">
              <div class="card-pid">
                PID: {{ row.pid }}_p{{ row.p }}
              </div>
              <div class="card-title text-ellipsis">
                {{ row.title }}
              </div>
              <div class="card-author text-ellipsis">
                作者: {{ row.author }}
              </div>

              <!-- Tags are not available in list dto -->

              <div class="card-audit-status" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #eee;">
                <div v-if="row.lastAuditTime">
                  <NTag :type="row.lastAuditStatus === 1 ? 'success' : 'warning'" size="tiny" bordered>
                    {{ row.lastAuditStatus === 1 ? '上次: 正常' : '上次: 问题' }}
                  </NTag>
                  <span style="font-size: 11px; color: #ccc; margin-left: 6px">{{ formatDateOnly(row.lastAuditTime) }}</span>
                </div>
                <div v-else style="font-size: 12px; color: #ccc">
                  未审核
                </div>
              </div>

              <div class="card-actions">
                <NButton size="small" type="success" secondary style="flex: 1" @click="handlePass(row)">
                  <template #icon>
                    <NIcon><CheckmarkCircleOutline /></NIcon>
                  </template>
                  正常
                </NButton>
                <NButton size="small" type="warning" secondary style="flex: 1" @click="openRejectModal(row)">
                  <template #icon>
                    <NIcon><CloseCircleOutline /></NIcon>
                  </template>
                  问题
                </NButton>
                <NButton size="small" type="error" tertiary style="flex: 1" @click="handleRequestDelete(row.pid, row.p)">
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                  申请删除
                </NButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 移动端分页 -->
        <div v-if="list.length > 0" class="mobile-pagination">
          <NPagination
            v-model:page="pagination.page"
            :page-count="pageCount"
            :on-update:page="pagination.onChange"
            simple
          />
          <!-- Simple pagination for mobile to save space, or can use default but it might be too wide -->
        </div>
      </div>
    </n-spin>

    <!-- 问题反馈弹窗 -->
    <NModal
      v-model:show="showRejectModal"
      preset="dialog"
      title="标记为有问题"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="确认提交"
      negative-text="取消"
      :loading="submitting"
      @positive-click="handleSubmitReject"
      @negative-click="showRejectModal = false"
    >
      <NSpace vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          请填写问题描述，提交后将<b>自动创建删除申请</b>，等待二次确认后删除。
        </p>
        <NInput
          v-model:value="rejectReason"
          type="textarea"
          placeholder="例如：图片无法加载、内容不符、低质量等"
          :rows="3"
        />
      </NSpace>
    </NModal>

    <!-- 申请删除弹窗 -->
    <NModal
      v-model:show="showDeleteRequestModal"
      preset="dialog"
      title="申请删除图片"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="提交申请"
      negative-text="取消"
      :loading="submitting"
      @positive-click="handleSubmitDeleteRequest"
      @negative-click="showDeleteRequestModal = false"
    >
      <NSpace vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          提交后，该图片将进入“图片删除申请”列表，需管理员二次审核通过后才会从数据库永久移除。<br>
          <span style="color: #f59e0b">此操作将创建审计日志。</span>
        </p>
        <NInput
          v-model:value="deleteRequestReason"
          type="textarea"
          placeholder="请输入删除原因（必填）"
          :rows="3"
        />
      </NSpace>
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 6px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.search-bar {
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.scope-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.scope-filter :deep(.n-radio-group) {
  display: flex;
  flex-wrap: wrap;
}

.pid-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pid-input {
  width: 140px;
}

.p-input {
  width: 80px;
}

.p-separator {
  color: #c7ccd5;
}

.stale-input {
  width: 120px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: #6b7280;
}

/* 表格样式微调 */
:deep(.n-data-table .n-data-table-td) {
  vertical-align: middle;
}

/* 移动端卡片样式 */
.mobile-list-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.img-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* Desktop grid fallback for mobile view logic if screen is slightly larger */
  gap: 16px;
}

@media (max-width: 600px) {
  .img-cards {
    grid-template-columns: 1fr;
  }
}

.img-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-top {
  position: relative;
}

.card-top :deep(.n-image) {
  display: block;
  width: 100%;
  height: 200px;
}

.card-top :deep(.n-image img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
}

.card-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-pid {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.card-title {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.card-author {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  height: 22px; /* Fixed height for one line of tags approx */
  overflow: hidden;
}

.card-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
}

.mobile-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-bottom: 40px;
}

@media (max-width: 768px) {
  .page-container {
    padding: 14px;
    max-width: 100%;
  }

  .header-section {
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .header-section .n-button {
    flex-shrink: 0;
  }

  .search-bar {
    padding: 14px;
    margin-bottom: 16px;
  }

  .scope-filter :deep(.n-radio-group) {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .scope-filter :deep(.n-radio-button) {
    text-align: center;
  }

  .search-inputs {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .pid-filter-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 84px);
    width: 100%;
    gap: 8px;
  }

  .pid-input,
  .p-input,
  .stale-input {
    width: 100%;
  }

  .filter-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 8px;
  }

  .filter-actions :deep(.n-button) {
    width: 100%;
  }
}

@media (max-width: 430px) {
  .header-section {
    flex-direction: column;
  }

  .header-section .n-button {
    width: 100%;
  }

  .card-actions {
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .img-card {
    transition: none;
  }
}
</style>
