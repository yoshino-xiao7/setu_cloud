import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 格式化日期时间为：YYYY年MM月DD日 HH:mm
 * 支持 ISO 8601 字符串（带 T）、空格分隔字符串、Unix 时间戳（毫秒或秒）
 */
export function formatDate(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-'
  const d = dayjs(input)
  return d.isValid() ? d.format('YYYY年MM月DD日 HH:mm') : '-'
}

/**
 * 仅格式化日期部分：YYYY年MM月DD日
 */
export function formatDateOnly(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-'
  const d = dayjs(input)
  return d.isValid() ? d.format('YYYY年MM月DD日') : '-'
}

/**
 * 仅格式化时间部分：HH:mm:ss
 * 用于系统状态等需要展示当前时间的场景
 */
export function formatTimeOnly(input?: string | number | Date | null): string {
  const d = dayjs(input ?? undefined)
  return d.isValid() ? d.format('HH:mm:ss') : '-'
}

/**
 * 仅格式化时间为 HH:mm（不含秒）
 */
export function formatTimeHM(input?: string | number | Date | null): string {
  const d = dayjs(input ?? undefined)
  return d.isValid() ? d.format('HH:mm') : '-'
}

/**
 * 格式化为今天日期展示：M月D日 dddd
 * 如：6月8日 星期日
 */
export function formatTodayDisplay(): string {
  return dayjs().format('M月D日 dddd')
}

/**
 * 解析日期为 Unix 时间戳（毫秒）
 * 用于日期排序比较
 */
export function parseDate(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0
  const d = dayjs(input)
  return d.isValid() ? d.valueOf() : 0
}

/**
 * 格式化时长（毫秒 → mm:ss）
 * 用于音乐播放列表等展示时长的场景
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * 相对时间展示（如：刚刚、5分钟前、今天 14:30）
 * 用于 MusicHistory 等需要友好相对时间的场景
 */
export function formatRelative(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-'
  const d = dayjs(input)
  if (!d.isValid()) return '-'

  const now = dayjs()
  const diffMinutes = now.diff(d, 'minute')

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`

  const diffHours = now.diff(d, 'hour')
  if (diffHours < 24 && now.isSame(d, 'day')) {
    return `今天 ${d.format('HH:mm')}`
  }

  if (now.subtract(1, 'day').isSame(d, 'day')) {
    return `昨天 ${d.format('HH:mm')}`
  }

  const diffDays = now.diff(d, 'day')
  if (diffDays < 7) return `${diffDays}天前`

  if (now.isSame(d, 'year')) {
    return d.format('MM月DD日 HH:mm')
  }

  return d.format('YYYY年MM月DD日 HH:mm')
}
