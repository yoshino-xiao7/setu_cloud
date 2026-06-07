<script setup lang="ts">
import { ref } from 'vue'
import {
  NButton, NIcon, NTag, NEmpty, NSpin, NImage,
  useMessage, useDialog, NInputNumber
} from 'naive-ui'
import {
  ImageOutline, SearchOutline, TrashOutline
} from '@vicons/ionicons5'
import { fetchAdminImageInfo, deleteAdminImage, type AdminImageDetail } from '@/api/admin'

const message = useMessage()
const dialog = useDialog()

// ============ 搜索状态 ============
const pidInput = ref<number | null>(null)
const pInput = ref(0)
const loading = ref(false)
const imageData = ref<AdminImageDetail | null>(null)
const hasSearched = ref(false)
const errorMsg = ref('')

// ============ 搜索图片 ============
const searchImage = async () => {
  if (!pidInput.value) {
    message.warning('请输入 PID')
    return
  }
  
  loading.value = true
  hasSearched.value = true
  errorMsg.value = ''
  imageData.value = null
  
  try {
    const res = await fetchAdminImageInfo(pidInput.value, pInput.value)
    imageData.value = (res as any)?.data || res
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || '查询失败，图片可能不存在'
  } finally {
    loading.value = false
  }
}

// ============ 删除图片 ============
const handleDelete = () => {
  if (!imageData.value) return
  
  dialog.warning({
    title: '确认删除图片',
    content: `确定要永久删除图片 ${imageData.value.pid}_p${imageData.value.p} 吗？\n\n标题：${imageData.value.title || '无'}\n作者：${imageData.value.author || '未知'}\n\n此操作不可撤销！`,
    positiveText: '确认删除',
    negativeText: '取消',
    positiveButtonProps: { type: 'error' },
    onPositiveClick: async () => {
      try {
        await deleteAdminImage(imageData.value!.pid, imageData.value!.p)
        message.success('图片已删除')
        imageData.value = null
        hasSearched.value = false
      } catch (e: any) {
        message.error(e?.response?.data?.message || '删除失败')
      }
    }
  })
}

// ============ 辅助函数 ============
const formatDate = (timestamp: number) => {
  if (!timestamp) return '-'
  const d = new Date(timestamp * 1000)
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
}
</script>

<template>
  <div class="admin-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <n-icon size="28" color="#f586a9"><ImageOutline /></n-icon>
        图片管理
      </h1>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section glass-card">
      <div class="search-form">
        <div class="form-item">
          <label>PID</label>
          <n-input-number
            v-model:value="pidInput"
            placeholder="输入图片 PID"
            :show-button="false"
            style="width: 180px;"
            @keyup.enter="searchImage"
          />
        </div>
        <div class="form-item">
          <label>页码 (p)</label>
          <n-input-number
            v-model:value="pInput"
            :min="0"
            :max="100"
            style="width: 100px;"
            @keyup.enter="searchImage"
          />
        </div>
        <n-button type="primary" :loading="loading" @click="searchImage">
          <template #icon><n-icon><SearchOutline /></n-icon></template>
          搜索
        </n-button>
      </div>
      <div class="search-tips">
        💡 输入 Pixiv 图片 ID 查看详情或删除图片
      </div>
    </div>

    <!-- 结果区域 -->
    <n-spin :show="loading">
      <!-- 图片详情卡片 -->
      <div v-if="imageData" class="result-card glass-card">
        <div class="card-header">
          <h3 class="card-title">{{ imageData.title || `PID: ${imageData.pid}` }}</h3>
          <n-button type="error" @click="handleDelete">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
            删除图片
          </n-button>
        </div>

        <div class="card-body">
          <!-- 预览图 -->
          <div class="preview-section">
            <n-image
              v-if="imageData.urlOriginal"
              :src="imageData.urlOriginal"
              width="280"
              object-fit="contain"
              :img-props="{ referrerpolicy: 'no-referrer' }"
              style="border-radius: 8px; background: #f3f4f6;"
            />
          </div>

          <!-- 详情信息 -->
          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">PID</span>
                <span class="value">{{ imageData.pid }}_p{{ imageData.p }}</span>
              </div>
              <div class="info-item">
                <span class="label">作者</span>
                <span class="value">{{ imageData.author || '-' }} (UID: {{ imageData.uid }})</span>
              </div>
              <div class="info-item">
                <span class="label">尺寸</span>
                <span class="value">{{ imageData.width }} × {{ imageData.height }}</span>
              </div>
              <div class="info-item">
                <span class="label">格式</span>
                <span class="value">{{ imageData.ext?.toUpperCase() }}</span>
              </div>
              <div class="info-item">
                <span class="label">上传日期</span>
                <span class="value">{{ formatDate(imageData.uploadDate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">R18</span>
                <n-tag :type="imageData.r18 ? 'error' : 'default'" size="small">
                  {{ imageData.r18 ? '是' : '否' }}
                </n-tag>
              </div>
              <div class="info-item">
                <span class="label">AI 生成</span>
                <n-tag :type="imageData.aiType === 2 ? 'warning' : 'default'" size="small">
                  {{ imageData.aiType === 2 ? '是' : imageData.aiType === 1 ? '否' : '未知' }}
                </n-tag>
              </div>
            </div>

            <!-- 标签 -->
            <div class="tags-section" v-if="imageData.tags?.length">
              <span class="label">标签</span>
              <div class="tags-list">
                <n-tag v-for="tag in imageData.tags.slice(0, 15)" :key="tag" size="small" round>
                  {{ tag }}
                </n-tag>
                <span v-if="imageData.tags.length > 15" class="more-tags">
                  +{{ imageData.tags.length - 15 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-else-if="hasSearched && errorMsg" class="error-card glass-card">
        <n-empty :description="errorMsg">
          <template #icon>
            <n-icon size="48" color="#ef4444"><ImageOutline /></n-icon>
          </template>
        </n-empty>
      </div>

      <!-- 未搜索状态 -->
      <div v-else-if="!hasSearched" class="empty-state glass-card">
        <n-icon size="64" color="#d1d5db"><ImageOutline /></n-icon>
        <p>输入 PID 搜索图片</p>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.search-section {
  padding: 20px;
  margin-bottom: 24px;
}

.search-form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.search-tips {
  margin-top: 12px;
  font-size: 13px;
  color: #6b7280;
}

.result-card {
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.card-body {
  display: flex;
  gap: 24px;
}

.preview-section {
  flex-shrink: 0;
}

.info-section {
  flex: 1;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #6b7280;
}

.info-item .value {
  font-size: 14px;
  color: #1f2937;
}

.tags-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tags-section .label {
  font-size: 12px;
  color: #6b7280;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.more-tags {
  font-size: 12px;
  color: #6b7280;
  align-self: center;
}

.error-card,
.empty-state {
  padding: 48px 24px;
  text-align: center;
}

.empty-state p {
  margin-top: 12px;
  color: #6b7280;
  font-size: 15px;
}

@media (max-width: 768px) {
  .card-body {
    flex-direction: column;
  }
  
  .preview-section {
    text-align: center;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .search-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .form-item {
    width: 100%;
  }
}
</style>
