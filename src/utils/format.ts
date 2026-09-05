/**
 * 通用格式化工具（跨业务域共享，勿在业务 util 中重复实现）。
 */

/** 文件大小格式化：B / KB / MB，非法值显示 `-` */
export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0)
    return '-'
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
