import type { GalleryPidMode } from '@/api/galleryUpload'
import { reactive } from 'vue'
import {
  GALLERY_PID_MODE_OPTIONS,
  GALLERY_UPLOAD_STATUS_OPTIONS,
  parseTagsInput,
} from '@/utils/galleryUploadStatus'

export const GALLERY_UPLOAD_AI_TYPE_OPTIONS = [
  { label: '未知', value: 0 },
  { label: '非 AI', value: 1 },
  { label: 'AI 生成', value: 2 },
]

export function useGalleryUploadFormState() {
  const form = reactive({
    pidMode: 'MULTI_PID_P0' as GalleryPidMode,
    title: '',
    author: '',
    r18: false,
    aiType: 0,
    tagsText: '',
  })

  function buildUploadDefaults() {
    return {
      title: form.title.trim() || undefined,
      author: form.author.trim() || undefined,
      r18: form.r18,
      aiType: form.aiType,
      tags: parseTagsInput(form.tagsText),
    }
  }

  return {
    aiTypeOptions: GALLERY_UPLOAD_AI_TYPE_OPTIONS,
    buildUploadDefaults,
    form,
    pidModeOptions: GALLERY_PID_MODE_OPTIONS,
    statusOptions: GALLERY_UPLOAD_STATUS_OPTIONS,
  }
}
