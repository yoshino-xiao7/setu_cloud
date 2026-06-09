<script setup lang="ts">
import { TrashOutline, WarningOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NIcon,
  NImage,
  NInput,
  NModal,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, ref } from 'vue'
import { submitDeleteRequest } from '@/api/imageDeleteRequest'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'

const props = defineProps<{
  show: boolean
  imageData: {
    pid: number
    p: number
    title?: string
    author?: string
    thumbnailUrl?: string
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()
const reason = ref('')
const submitting = ref(false)

const visible = computed({
  get: () => props.show,
  set: val => emit('update:show', val),
})

function handleClose() {
  visible.value = false
  reason.value = ''
}

async function handleSubmit() {
  if (!props.imageData)
    return

  submitting.value = true
  try {
    await submitDeleteRequest(props.imageData.pid, props.imageData.p, reason.value)
    message.success('提交成功，请等待管理员审核')
    emit('success')
    handleClose()
  }
  catch (e: unknown) {
    if (shouldIgnoreApiError(e))
      return
    const errMsg = getApiErrorMessage(e, '提交失败，请稍后重试')
    message.error(errMsg)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <NModal v-model:show="visible" :mask-closable="false">
    <NCard
      style="width: 480px; max-width: 95vw;"
      :bordered="false"
      class="submit-modal-card"
    >
      <template #header>
        <div class="modal-header">
          <NIcon size="24" color="#f586a9">
            <TrashOutline />
          </NIcon>
          <span>申请删除图片</span>
        </div>
      </template>

      <div class="modal-content">
        <!-- 图片预览 -->
        <div v-if="imageData" class="image-preview">
          <div class="preview-image">
            <NImage
              v-if="imageData.thumbnailUrl"
              :src="imageData.thumbnailUrl"
              object-fit="cover"
              :img-props="{ referrerpolicy: 'no-referrer' }"
              fallback-src="https://via.placeholder.com/120x120?text=No+Image"
            />
            <div v-else class="placeholder">
              <NIcon size="32" color="#ccc">
                <TrashOutline />
              </NIcon>
            </div>
          </div>
          <div class="preview-info">
            <div class="info-row">
              <span class="label">标题：</span>
              <span class="value">{{ imageData.title || '未知标题' }}</span>
            </div>
            <div class="info-row">
              <span class="label">作者：</span>
              <span class="value">{{ imageData.author || '未知作者' }}</span>
            </div>
            <div class="info-row">
              <span class="label">PID：</span>
              <NTag size="small" type="info">
                {{ imageData.pid }}_p{{ imageData.p }}
              </NTag>
            </div>
          </div>
        </div>

        <!-- 删除原因 -->
        <div class="reason-section">
          <div class="section-label">
            删除原因
          </div>
          <NInput
            v-model:value="reason"
            type="textarea"
            placeholder="请描述申请删除的原因，例如：图片质量过低、画面模糊..."
            :rows="3"
            maxlength="500"
            show-count
          />
        </div>

        <!-- 警告提示 -->
        <div class="warning-box">
          <NIcon size="18" color="#faad14">
            <WarningOutline />
          </NIcon>
          <span>提交后需等待管理员审核，您可以在"我的删除申请"中查看进度</span>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="submitting" @click="handleClose">
            取消
          </NButton>
          <NButton
            type="primary"
            color="#f586a9"
            :loading="submitting"
            @click="handleSubmit"
          >
            提交申请
          </NButton>
        </NSpace>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.submit-modal-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.image-preview {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.preview-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e5e7eb;
}

.preview-image :deep(.n-image) {
  width: 100%;
  height: 100%;
}

.preview-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.info-row .label {
  color: #6b7280;
  flex-shrink: 0;
}

.info-row .value {
  color: #1f2937;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reason-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(250, 173, 20, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .image-preview {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .preview-info {
    align-items: center;
  }
}
</style>
