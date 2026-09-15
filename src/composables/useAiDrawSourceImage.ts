import { computed, onUnmounted, ref } from 'vue'

export const AI_DRAW_SOURCE_MAX_BYTES = 8 * 1024 * 1024
export const AI_DRAW_SOURCE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
const AI_DRAW_SOURCE_MAX_EDGE = 1536

export function isAiDrawSourceImageFile(file: File) {
  const type = (file.type || '').toLowerCase()
  if (type === 'image/png' || type === 'image/jpeg' || type === 'image/webp')
    return true
  return /\.(?:png|jpe?g|webp)$/i.test(file.name)
}

export async function prepareAiDrawSourceImage(file: File): Promise<File> {
  if (!isAiDrawSourceImageFile(file))
    throw new Error('请上传 PNG、JPG 或 WEBP 图片')
  if (file.size <= AI_DRAW_SOURCE_MAX_BYTES)
    return file

  const compressed = await compressAiDrawSourceImage(file)
  if (compressed.size > AI_DRAW_SOURCE_MAX_BYTES)
    throw new Error('源图太大，请换成 8MB 以内的图片')
  return compressed
}

async function compressAiDrawSourceImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, AI_DRAW_SOURCE_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('无法压缩源图，请换成更小的图片')
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => {
        if (next)
          resolve(next)
        else
          reject(new Error('无法压缩源图，请换成更小的图片'))
      }, 'image/jpeg', 0.86)
    })
    return new File([blob], replaceSourceImageExtension(file.name, '.jpg'), { type: 'image/jpeg' })
  }
  finally {
    bitmap.close()
  }
}

function replaceSourceImageExtension(name: string, extension: string) {
  return name.replace(/\.[^.]+$/, '') + extension
}

export function useAiDrawSourceImage() {
  const file = ref<File | null>(null)
  const previewUrl = ref('')
  const fileName = ref('')
  const error = ref('')

  function revokePreview() {
    if (previewUrl.value)
      URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }

  function clear() {
    revokePreview()
    file.value = null
    fileName.value = ''
    error.value = ''
  }

  async function selectFile(next: File | null | undefined) {
    clear()
    if (!next)
      return
    try {
      const prepared = await prepareAiDrawSourceImage(next)
      file.value = prepared
      fileName.value = prepared.name
      previewUrl.value = URL.createObjectURL(prepared)
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '源图读取失败'
    }
  }

  onUnmounted(clear)

  return {
    clear,
    error,
    file,
    fileName,
    hasSource: computed(() => !!file.value),
    previewUrl,
    selectFile,
  }
}
