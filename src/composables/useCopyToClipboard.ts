import { useMessage } from 'naive-ui'

/**
 * 剪贴板复制统一封装。
 *
 * 全站所有复制行为都应经过本 composable（此前 7 处各自实现 navigator.clipboard.writeText）。
 * 成功/失败文案可自定义；不传 successMessage 则只复制不弹提示。
 */
export function useCopyToClipboard() {
  const message = useMessage()

  async function copyText(text: string, options?: { successMessage?: string, errorMessage?: string }) {
    try {
      await navigator.clipboard.writeText(text)
      if (options?.successMessage)
        message.success(options.successMessage)
      return true
    }
    catch {
      message.warning(options?.errorMessage ?? '复制失败')
      return false
    }
  }

  return { copyText }
}
