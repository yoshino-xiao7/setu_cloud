import type { MessageApi } from 'naive-ui'
import type { ComputedRef } from 'vue'
import type { SetuImageItem } from '@/api/setu'
import type { PointsCallForm } from '@/composables/usePointsCallDefaults'

import { computed, ref, shallowRef } from 'vue'
import { unwrapApiList } from '@/api/response'
import { fetchSetuImages } from '@/api/setu'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import {
  buildPointsCallSearchParams,
  getPointsCallDeckCards,
} from '@/composables/usePointsCallDefaults'
import { useRequestGuard } from '@/composables/useRequestGuard'

export interface UsePointsCallResultsOptions {
  canCall: ComputedRef<boolean>
  costPerCall: number
  form: PointsCallForm
  isMobile: ComputedRef<boolean>
  message: MessageApi
  parsedTags: ComputedRef<string[]>
  refreshAll: () => Promise<void>
}

export function usePointsCallResults(options: UsePointsCallResultsOptions) {
  const callGuard = useRequestGuard()
  const calling = ref(false)
  const resultLoading = ref(false)
  const results = shallowRef<SetuImageItem[]>([])
  const activeResultIndex = ref(0)

  const activeResult = computed(() => results.value[activeResultIndex.value] ?? null)
  const deckCards = computed(() => getPointsCallDeckCards(
    results.value,
    activeResultIndex.value,
    options.isMobile.value,
  ))

  function setActiveResultIndex(index: number) {
    if (index < 0 || index >= results.value.length)
      return
    activeResultIndex.value = index
  }

  function showPreviousResult() {
    const total = results.value.length
    if (total <= 1)
      return
    activeResultIndex.value = (activeResultIndex.value - 1 + total) % total
  }

  function showNextResult() {
    const total = results.value.length
    if (total <= 1)
      return
    activeResultIndex.value = (activeResultIndex.value + 1) % total
  }

  async function callSetu() {
    if (!options.canCall.value)
      return options.message.warning(`积分不足：至少需要 ${options.costPerCall} 积分`)

    const requestId = callGuard.next()
    calling.value = true
    resultLoading.value = true
    results.value = []
    activeResultIndex.value = 0

    try {
      const res = await fetchSetuImages(buildPointsCallSearchParams(options.form, options.parsedTags.value))
      if (!callGuard.isCurrent(requestId))
        return

      results.value = unwrapApiList<SetuImageItem>(res)
      activeResultIndex.value = 0

      await options.refreshAll()

      if (!results.value.length) {
        options.message.warning('返回为空：当前筛选条件在里没有匹配图片')
      }
      else {
        options.message.success(`成功返回 ${results.value.length} 张`)
      }
    }
    catch (error: unknown) {
      if (!callGuard.isCurrent(requestId) || shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '调用失败')
      await options.refreshAll()
    }
    finally {
      if (callGuard.isCurrent(requestId)) {
        calling.value = false
        resultLoading.value = false
      }
    }
  }

  return {
    activeResult,
    activeResultIndex,
    calling,
    callSetu,
    deckCards,
    resultLoading,
    results,
    setActiveResultIndex,
    showNextResult,
    showPreviousResult,
  }
}
