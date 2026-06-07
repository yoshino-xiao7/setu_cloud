<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import {
  NDataTable,
  NButton,
  NIcon,
  NTag,
  NModal,
  NInput,
  NInputNumber, // ✅ Added
  NSpace,
  useMessage,
  useDialog,
  type DataTableColumns,
  NImage,
  NPagination //For mobile view
} from 'naive-ui'
import {
  CheckmarkCircleOutline,
  CloseCircleOutline,
  RefreshOutline,
  SearchOutline, // ✅ Added
  TrashOutline   // ✅ Added
} from '@vicons/ionicons5'
import {
  fetchImageAuditList,
  submitImageAuditResult,
  fetchAdminImageInfo,
  // deleteAdminImage, // ❌ Removed Direct Delete
  type ImageAuditListDTO,
  type AdminImageDetail
} from '@/api/admin'
import { submitDeleteRequest } from '@/api/imageDeleteRequest' // ✅ Added
import { useBreakpoint } from '@/composables/useBreakpoint'
import { getApiErrorMessage } from '@/composables/useApiError'

const message = useMessage()
const dialog = useDialog()

// =======================
// 数据和状态
// =======================
const loading = ref(false)
const list = shallowRef<ImageAuditListDTO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page
    void fetchData()
  },
  showQuickJumper: true
})
const pageCount = computed(() => Math.max(1, Math.ceil(pagination.itemCount / pagination.pageSize)))

// 移动端适配
const { isCompact: isMobile } = useBreakpoint()
let listRequestSeq = 0
let searchRequestSeq = 0

// 搜索状态
const searchPid = ref<number | null>(null)
const searchP = ref(0)
const searchResult = shallowRef<AdminImageDetail | null>(null)
const isSearching = ref(false)

// 审核有问题弹窗
const showRejectModal = ref(false)
const rejectReason = ref('')
const currentRejectId = ref<number | null>(null)
const submitting = ref(false)

// 申请删除弹窗
const showDeleteRequestModal = ref(false)
const deleteRequestReason = ref('')
const deleteTarget = ref<{pid: number, p: number} | null>(null)

// =======================
// 数据加载
// =======================
const fetchData = async () => {
  // 如果正在搜索，不加载列表
  if (isSearching.value) return

  const requestId = ++listRequestSeq
  loading.value = true
  try {
    const res = await fetchImageAuditList(pagination.page, pagination.pageSize)
    if (requestId !== listRequestSeq || isSearching.value) return
    const data = res.data
    list.value = data.list
    pagination.itemCount = data.total
    pagination.page = data.page
    pagination.pageSize = data.pageSize
  } catch (e: unknown) {
    if (requestId === listRequestSeq) {
      message.error(getApiErrorMessage(e, '加载列表失败'))
    }
  } finally {
    if (requestId === listRequestSeq) loading.value = false
  }
}

// 搜索功能
const handleSearch = async () => {
  if (!searchPid.value) {
    // 如果清空了 PID，恢复列表模式
    if (isSearching.value) {
      searchRequestSeq += 1
      isSearching.value = false
      searchResult.value = null
      void fetchData()
    } else {
      message.warning('请输入 PID')
    }
    return
  }

  const requestId = ++searchRequestSeq
  listRequestSeq += 1
  loading.value = true
  isSearching.value = true
  list.value = [] // 清空列表
  searchResult.value = null

  try {
    const res = await fetchAdminImageInfo(searchPid.value, searchP.value)
    if (requestId !== searchRequestSeq) return
    // 接口直接返回 AdminImageDetail 对象 (根据之前 AdminImageManagement 的经验)
    searchResult.value = res.data
  } catch (e: unknown) {
    if (requestId === searchRequestSeq) {
      message.error(getApiErrorMessage(e, '未找到该图片'))
      searchResult.value = null
    }
  } finally {
    if (requestId === searchRequestSeq) loading.value = false
  }
}

const clearSearch = () => {
  searchRequestSeq += 1
  searchPid.value = null
  searchP.value = 0
  isSearching.value = false
  searchResult.value = null
  void fetchData()
}

// =======================
// 操作逻辑
// =======================

// 审核通过
const handlePass = (row: ImageAuditListDTO) => {
  dialog.success({
    title: '确认审核通过',
    content: `确认将图片 (PID: ${row.pid}) 标记为“正常”吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await submitImageAuditResult({
          imageId: row.id,
          status: 1
        })
        message.success('审核完成（正常）')
        await fetchData() // 刷新列表
      } catch (e: unknown) {
        message.error(getApiErrorMessage(e, '操作失败'))
      }
    }
  })
}

// 打开审核有问题弹窗
const openRejectModal = (row: ImageAuditListDTO) => {
  currentRejectId.value = row.id
  rejectReason.value = ''
  showRejectModal.value = true
}

// 提交审核有问题
const handleSubmitReject = async () => {
  if (!rejectReason.value.trim()) {
    message.warning('请填写问题描述')
    return
  }
  
  if (!currentRejectId.value) return

  submitting.value = true
  try {
    const result = await submitImageAuditResult({
      imageId: currentRejectId.value,
      status: 2,
      remark: rejectReason.value
    })
    
    // 后端返回的 string 提示可能包含 "已自动创建删除申请..."
    message.success(result?.data || '审核完成（有问题）')
    
    showRejectModal.value = false
    await fetchData()
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '操作失败'))
  } finally {
    submitting.value = false
  }
}

// 打开申请删除弹窗
const handleRequestDelete = (pid: number, p: number) => {
  deleteTarget.value = { pid, p }
  deleteRequestReason.value = ''
  showDeleteRequestModal.value = true
}

// 提交删除申请
const handleSubmitDeleteRequest = async () => {
  if (!deleteRequestReason.value.trim()) {
    message.warning('请填写删除原因（以便记录日志）')
    return
  }
  
  if (!deleteTarget.value) return

  submitting.value = true
  try {
    await submitDeleteRequest(deleteTarget.value.pid, deleteTarget.value.p, deleteRequestReason.value)
    message.success('已提交删除申请，请前往“图片删除申请”页面进行最终审核')
    showDeleteRequestModal.value = false
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e, '提交失败'))
  } finally {
    submitting.value = false
  }
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
        previewedImgProps: { style: { maxHeight: '90vh' } }
      })
    }
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
            style: 'margin-top: 4px; font-size: 12px;'
          }, { default: () => '查看原图链接' })
        ]
      })
    }
  },
  {
    title: '类型',
    key: 'tags',
    width: 120,
    render(row) {
      return h(NSpace, { size: 4, vertical: true }, {
        default: () => [
          h(NTag, { type: row.r18 === 1 ? 'error' : 'success', size: 'small', bordered: false }, { default: () => row.r18 === 1 ? 'R18' : '全年龄' }),
          row.aiType === 2 ? h(NTag, { type: 'info', size: 'small', bordered: false }, { default: () => 'AI生成' }) : null
        ]
      })
    }
  },
  {
    title: '上次审核',
    key: 'lastAudit',
    width: 200,
    render(row) {
      if (!row.lastAuditTime) return h('span', { style: 'color: #ccc' }, '未审核')
      
      return h(NSpace, { vertical: true, size: 2 }, {
        default: () => [
          h(NTag, { 
            type: row.lastAuditStatus === 1 ? 'success' : 'warning', 
            size: 'small', 
            bordered: false 
          }, { 
            default: () => row.lastAuditStatus === 1 ? '正常' : '有问题' 
          }),
          row.lastAuditRemark ? h('div', { style: 'font-size: 12px; color: #f59e0b; margin-top: 4px' }, `备注: ${row.lastAuditRemark}`) : null,
          h('div', { style: 'font-size: 12px; color: #999; margin-top: 4px' }, (row.lastAuditTime || '').split(' ')[0]),
          h('div', { style: 'font-size: 12px; color: #ccc' }, row.lastAuditAdminEmail || '')
        ]
      })
    }
  },
  {
    title: '上传时间',
    key: 'uploadDate',
    width: 120,
    render: (row) => {
      const date = new Date(row.uploadDate)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 200, // 增加宽度
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'tiny',
            type: 'success',
            secondary: true,
            onClick: () => handlePass(row)
          }, { icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }), default: () => '正常' }),
          h(NButton, {
            size: 'tiny',
            type: 'warning',
            secondary: true,
            onClick: () => openRejectModal(row)
          }, { icon: () => h(NIcon, null, { default: () => h(CloseCircleOutline) }), default: () => '问题' })
        ]
      })
    }
  }
]

onMounted(() => {
  void fetchData()
})

onUnmounted(() => {
  listRequestSeq += 1
  searchRequestSeq += 1
})

</script>

<template>
  <div class="page-container">
    <!-- 头部 -->
    <div class="header-section">
      <div>
        <h2 class="title">图片库管理</h2>
        <p class="subtitle">管理数据库中的图片，由于 PID 和 p 唯一索引，支持精确搜索和审核</p>
      </div>
      <n-button @click="isSearching ? handleSearch() : fetchData()">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        刷新
      </n-button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar glass-card">
      <div class="search-inputs">
        <n-input-number 
          v-model:value="searchPid" 
          class="pid-input"
          placeholder="PID" 
          :show-button="false" 
          @keyup.enter="handleSearch"
        />
        <span style="color: #ccc">_p</span>
        <n-input-number 
          v-model:value="searchP" 
          class="p-input"
          placeholder="0" 
          :min="0"
          :max="100"
          :show-button="false" 
          @keyup.enter="handleSearch"
        />
        <n-button type="primary" @click="handleSearch" :disabled="loading">
          <template #icon><n-icon><SearchOutline /></n-icon></template>
          搜索
        </n-button>
        <n-button v-if="isSearching" @click="clearSearch">
          返回列表
        </n-button>
      </div>
      <div class="search-tips" v-if="!isSearching">
        💡 输入 PID 搜索特定图片进行管理或删除
      </div>
    </div>

    <!-- 内容区域 -->
    <n-spin :show="loading">
      
      <!-- 1. 搜索结果模式 -->
      <div v-if="searchResult" class="search-result-card glass-card">
        <div class="result-header">
          <h3>搜索结果</h3>
          <n-button type="error" dashed size="small" @click="handleRequestDelete(searchResult.pid, searchResult.p)">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
            申请删除
          </n-button>
        </div>
        <div class="result-body">
          <div class="preview-box">
             <n-image
              v-if="searchResult.urlOriginal"
              :src="searchResult.urlOriginal"
              width="200"
              object-fit="contain"
              :img-props="{ referrerpolicy: 'no-referrer' }"
              style="border-radius: 8px; background: #f3f4f6;"
            />
            <div style="margin-top: 8px; text-align: center;">
              <n-button 
                size="tiny" 
                type="primary" 
                secondary 
                tag="a" 
                :href="searchResult.urlOriginal" 
                target="_blank"
              >
                查看原图
              </n-button>
            </div>
          </div>
          <div class="info-box">
            <div class="info-row"><span>PID:</span> <strong>{{ searchResult.pid }}_p{{ searchResult.p }}</strong></div>
            <div class="info-row"><span>标题:</span> {{ searchResult.title }}</div>
            <div class="info-row"><span>作者:</span> {{ searchResult.author }} (UID: {{ searchResult.uid }})</div>
            <div class="info-row"><span>尺寸:</span> {{ searchResult.width }} x {{ searchResult.height }} ({{ searchResult.ext }})</div>
            <div class="info-row">
              <span>R18:</span> 
              <n-tag :type="searchResult.r18 ? 'error' : 'success'" size="small">{{ searchResult.r18 ? '是' : '否' }}</n-tag>
            </div>
            <div class="info-row">
              <span>AI:</span>
              <n-tag :type="searchResult.aiType === 2 ? 'warning' : 'default'" size="small">{{ searchResult.aiType === 2 ? '是' : '否' }}</n-tag>
            </div>
            <div class="tags-row" v-if="searchResult.tags && searchResult.tags.length">
              <n-tag v-for="tag in searchResult.tags.slice(0, 10)" :key="tag" size="small" round>{{ tag }}</n-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 列表模式 (桌面端) -->
      <n-data-table
        v-else-if="!isMobile"
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        remote
        :bordered="false"
        class="data-table"
        :scroll-x="1000"
      />

      <!-- 3. 列表模式 (移动端卡片视图) -->
      <div v-else class="mobile-list-view">
        <div v-if="loading && list.length === 0" class="loading-placeholder">
           <!-- Loading handled by n-spin wrapper, but creates space if needed -->
        </div>
        <div v-else-if="list.length === 0" class="empty-state">
           <n-icon size="48" color="#ccc"><SearchOutline /></n-icon>
           <p style="color: #999">暂无数据</p>
        </div>
        
        <div v-else class="img-cards">
          <div v-for="row in list" :key="row.id" class="img-card glass-card">
            <div class="card-top">
              <n-image
                :src="row.urlOriginal"
                width="100%"
                height="200"
                object-fit="cover"
                :img-props="{ referrerpolicy: 'no-referrer' }"
                style="border-radius: 8px 8px 0 0; display: block;"
                lazy
              />
              <div class="card-badges">
                <n-tag :type="row.r18 ? 'error' : 'success'" size="small" style="margin-right: 4px">
                  {{ row.r18 ? 'R18' : '全年龄' }}
                </n-tag>
                <n-tag v-if="row.aiType === 2" type="warning" size="small">AI</n-tag>
              </div>
            </div>
            
            <div class="card-content">
              <div class="card-pid">PID: {{ row.pid }}_p{{ row.p }}</div>
              <div class="card-title text-ellipsis">{{ row.title }}</div>
              <div class="card-author text-ellipsis">作者: {{ row.author }}</div>
              
              <!-- Tags are not available in list dto -->

              <div class="card-audit-status" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #eee;">
                 <div v-if="row.lastAuditTime">
                    <n-tag :type="row.lastAuditStatus === 1 ? 'success' : 'warning'" size="tiny" bordered>
                      {{ row.lastAuditStatus === 1 ? '上次: 正常' : '上次: 问题' }}
                    </n-tag>
                    <span style="font-size: 11px; color: #ccc; margin-left: 6px">{{ row.lastAuditTime.split(' ')[0] }}</span>
                 </div>
                 <div v-else style="font-size: 12px; color: #ccc">未审核</div>
              </div>

              <div class="card-actions">
                <n-button size="small" type="success" secondary style="flex: 1" @click="handlePass(row)">
                  <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
                  正常
                </n-button>
                <n-button size="small" type="warning" secondary style="flex: 1" @click="openRejectModal(row)">
                  <template #icon><n-icon><CloseCircleOutline /></n-icon></template>
                  问题
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 移动端分页 -->
        <div class="mobile-pagination" v-if="list.length > 0">
          <n-pagination
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
    <n-modal
      v-model:show="showRejectModal"
      preset="dialog"
      title="标记为有问题"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="确认提交"
      negative-text="取消"
      @positive-click="handleSubmitReject"
      @negative-click="showRejectModal = false"
      :loading="submitting"
    >
      <n-space vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          请填写问题描述，提交后将<b>自动创建删除申请</b>，等待二次确认后删除。
        </p>
        <n-input
          v-model:value="rejectReason"
          type="textarea"
          placeholder="例如：图片无法加载、内容不符、低质量等"
          :rows="3"
        />
      </n-space>
    </n-modal>

    <!-- 申请删除弹窗 -->
    <n-modal
      v-model:show="showDeleteRequestModal"
      preset="dialog"
      title="申请删除图片"
      :style="{ width: 'min(92vw, 520px)' }"
      positive-text="提交申请"
      negative-text="取消"
      @positive-click="handleSubmitDeleteRequest"
      @negative-click="showDeleteRequestModal = false"
      :loading="submitting"
    >
      <n-space vertical style="margin-top: 16px">
        <p style="color: #666; font-size: 14px">
          提交后，该图片将进入“图片删除申请”列表，需管理员二次审核通过后才会从数据库永久移除。<br/>
          <span style="color: #f59e0b">此操作将创建审计日志。</span>
        </p>
        <n-input
          v-model:value="deleteRequestReason"
          type="textarea"
          placeholder="请输入删除原因（必填）"
          :rows="3"
        />
      </n-space>
    </n-modal>
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

.pid-input {
  width: 140px;
}

.p-input {
  width: 64px;
}

.search-tips {
  font-size: 13px;
  color: #6b7280;
}

.search-result-card {
  padding: 24px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.result-body {
  display: flex;
  gap: 32px;
}

.preview-box {
  flex-shrink: 0;
  width: 200px;
}

.info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  font-size: 14px;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-row span:first-child {
  color: #6b7280;
  width: 60px;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
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

  .search-bar,
  .search-result-card {
    padding: 14px;
    margin-bottom: 16px;
  }

  .search-inputs {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(56px, 72px);
    gap: 8px;
  }

  .pid-input,
  .p-input {
    width: 100%;
  }

  .search-inputs > .n-button {
    width: 100%;
  }

  .search-inputs > .n-button:nth-of-type(1) {
    grid-column: 1 / -1;
  }

  .search-inputs > .n-button:nth-of-type(2) {
    grid-column: 1 / -1;
  }

  .result-header,
  .result-body {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .preview-box {
    width: 100%;
  }

  .info-row {
    align-items: flex-start;
  }

  .info-row span:first-child {
    flex-shrink: 0;
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
