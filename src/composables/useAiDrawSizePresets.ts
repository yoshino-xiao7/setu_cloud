export interface AiDrawSizeForm {
  width: number
  height: number
}

export interface AiDrawSizePreset {
  label: string
  value: string
  width: number
  height: number
}

export const AI_DRAW_SIZE_PRESETS: AiDrawSizePreset[] = [
  { label: '竖屏 832x1216', value: 'portrait', width: 832, height: 1216 },
  { label: '横屏 1216x832', value: 'landscape', width: 1216, height: 832 },
  { label: '大头照 1024x1024', value: 'headshot', width: 1024, height: 1024 },
  { label: '手机壁纸 832x1472', value: 'wallpaper', width: 832, height: 1472 },
]

export const DEFAULT_AI_DRAW_SIZE_PRESET = AI_DRAW_SIZE_PRESETS[0]

export function findAiDrawSizePreset(value: string | number) {
  return AI_DRAW_SIZE_PRESETS.find(item => item.value === String(value)) || DEFAULT_AI_DRAW_SIZE_PRESET
}

export function getAiDrawSizePresetValue(width: number, height: number) {
  return AI_DRAW_SIZE_PRESETS.find(item => item.width === width && item.height === height)?.value
    || DEFAULT_AI_DRAW_SIZE_PRESET.value
}

export function applyAiDrawSizePreset(form: AiDrawSizeForm, value: string | number) {
  const preset = findAiDrawSizePreset(value)
  form.width = preset.width
  form.height = preset.height
  return preset.value
}

export function applyAiDrawJobSize(form: AiDrawSizeForm, width?: number | null, height?: number | null) {
  form.width = width || DEFAULT_AI_DRAW_SIZE_PRESET.width
  form.height = height || DEFAULT_AI_DRAW_SIZE_PRESET.height
  return getAiDrawSizePresetValue(form.width, form.height)
}
