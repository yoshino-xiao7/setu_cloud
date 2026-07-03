import type { Ref } from 'vue'
import type { GalleryPidMode, GalleryUploadInitItem } from '@/api/galleryUpload'
import type { LocalUploadItem } from '@/types/galleryUploadLocal'
import {
  GALLERY_UPLOAD_MAX_BATCH_SIZE,
  GALLERY_UPLOAD_MAX_FILES,
} from '@/constants/galleryUpload'
import { parseTagsInput } from '@/utils/galleryUploadStatus'

interface GalleryUploadFormState {
  pidMode: GalleryPidMode
  title: string
  author: string
}

interface UseGalleryUploadSubmitValidationOptions {
  form: GalleryUploadFormState
  totalSize: Readonly<Ref<number>>
  uploadItems: Ref<LocalUploadItem[]>
  warning: (content: string) => void
}

export function useGalleryUploadSubmitValidation(options: UseGalleryUploadSubmitValidationOptions) {
  function validateBeforeSubmit() {
    if (options.uploadItems.value.length === 0) {
      options.warning('请选择图片')
      return false
    }

    if (options.uploadItems.value.length > GALLERY_UPLOAD_MAX_FILES) {
      options.warning(`单批次最多 ${GALLERY_UPLOAD_MAX_FILES} 张图片`)
      return false
    }

    if (options.totalSize.value > GALLERY_UPLOAD_MAX_BATCH_SIZE) {
      options.warning('单批次总大小不能超过 100MB')
      return false
    }

    const pageIndexes = new Set<number>()
    for (const item of options.uploadItems.value) {
      const title = item.title.trim() || options.form.title.trim()
      const author = item.author.trim() || options.form.author.trim()
      if (!title || !author) {
        options.warning(`${item.filename} 缺少标题或作者`)
        return false
      }

      if (options.form.pidMode === 'SINGLE_PID_MULTI_PAGE') {
        if (!Number.isInteger(item.pageIndex) || item.pageIndex < 0) {
          options.warning(`${item.filename} 的页码必须是非负整数`)
          return false
        }
        if (pageIndexes.has(item.pageIndex)) {
          options.warning('同一 PID 多页模式下页码不能重复')
          return false
        }
        pageIndexes.add(item.pageIndex)
      }
    }

    return true
  }

  function buildInitItems(): GalleryUploadInitItem[] {
    return options.uploadItems.value.map((item) => {
      const tags = parseTagsInput(item.tagsText)
      return {
        clientItemId: item.clientItemId,
        filename: item.filename,
        contentType: item.contentType,
        sizeBytes: item.sizeBytes,
        pageIndex: options.form.pidMode === 'SINGLE_PID_MULTI_PAGE' ? item.pageIndex : undefined,
        title: item.title.trim() || undefined,
        author: item.author.trim() || undefined,
        r18: undefined,
        aiType: undefined,
        tags: tags.length > 0 ? tags : undefined,
      }
    })
  }

  return {
    buildInitItems,
    validateBeforeSubmit,
  }
}
