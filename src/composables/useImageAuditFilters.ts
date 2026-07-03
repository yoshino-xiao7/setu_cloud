import type { Ref } from 'vue'
import type { ImageAuditScope, ImageAvailabilityStatus } from '@/api/admin'
import { computed, ref } from 'vue'
import {
  IMAGE_AUDIT_DEFAULT_STALE_DAYS,
  IMAGE_AUDIT_DESKTOP_PAGE_SIZE,
  IMAGE_AUDIT_MOBILE_PAGE_SIZE,
  normalizeImageAuditFilterNumber,
} from '@/composables/useImageAuditViewHelpers'

interface ImageAuditPaginationState {
  page: number
}

interface UseImageAuditFiltersOptions {
  isMobile: Ref<boolean>
  pagination: ImageAuditPaginationState
  warn: (content: string) => void
}

export interface ImageAuditListQuery {
  page: number
  pageSize: number
  scope: ImageAuditScope
  staleDays: number
  availabilityStatus?: ImageAvailabilityStatus
  onlyBroken?: true
  pid?: number
  p?: number
}

export function useImageAuditFilters(options: UseImageAuditFiltersOptions) {
  const activePageSize = computed(() => options.isMobile.value ? IMAGE_AUDIT_MOBILE_PAGE_SIZE : IMAGE_AUDIT_DESKTOP_PAGE_SIZE)
  const scope = ref<ImageAuditScope>('UNREVIEWED')
  const pidFilter = ref<number | null>(null)
  const pFilter = ref<number | null>(null)
  const staleDays = ref(IMAGE_AUDIT_DEFAULT_STALE_DAYS)
  const availabilityStatus = ref<ImageAvailabilityStatus | ''>('')
  const onlyBroken = ref(false)

  function validateFilters() {
    const pid = normalizeImageAuditFilterNumber(pidFilter.value)
    const p = normalizeImageAuditFilterNumber(pFilter.value)
    const reviewDays = normalizeImageAuditFilterNumber(staleDays.value) ?? IMAGE_AUDIT_DEFAULT_STALE_DAYS

    if (pid !== undefined && pid < 1) {
      options.warn('PID 必须大于 0')
      return false
    }

    if (p !== undefined && pid === undefined) {
      options.warn('请先输入 PID，再筛选 p 页')
      return false
    }

    if (p !== undefined && p < 0) {
      options.warn('p 页不能小于 0')
      return false
    }

    if (reviewDays < 1 || reviewDays > 365) {
      options.warn('复审周期必须在 1 到 365 天之间')
      return false
    }

    return true
  }

  function buildListQuery(): ImageAuditListQuery | null {
    if (!validateFilters())
      return null

    const pid = normalizeImageAuditFilterNumber(pidFilter.value)
    const p = normalizeImageAuditFilterNumber(pFilter.value)
    const reviewDays = normalizeImageAuditFilterNumber(staleDays.value) ?? IMAGE_AUDIT_DEFAULT_STALE_DAYS

    return {
      page: options.pagination.page,
      pageSize: activePageSize.value,
      scope: scope.value,
      staleDays: reviewDays,
      ...(availabilityStatus.value ? { availabilityStatus: availabilityStatus.value } : {}),
      ...(onlyBroken.value ? { onlyBroken: true } : {}),
      ...(pid !== undefined ? { pid } : {}),
      ...(p !== undefined ? { p } : {}),
    }
  }

  function shouldUseMobileQueue(query: ImageAuditListQuery) {
    return options.isMobile.value
      && query.scope !== 'ALL'
      && !query.availabilityStatus
      && !query.onlyBroken
  }

  function resetFilters() {
    scope.value = 'UNREVIEWED'
    pidFilter.value = null
    pFilter.value = null
    staleDays.value = IMAGE_AUDIT_DEFAULT_STALE_DAYS
    availabilityStatus.value = ''
    onlyBroken.value = false
    options.pagination.page = 1
  }

  return {
    activePageSize,
    availabilityStatus,
    buildListQuery,
    onlyBroken,
    pFilter,
    pidFilter,
    resetFilters,
    scope,
    shouldUseMobileQueue,
    staleDays,
    validateFilters,
  }
}
