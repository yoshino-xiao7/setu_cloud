import type { MessageApi } from 'naive-ui'
import type { AiQqSubscription } from '@/api/aiGeneration'
import { onMounted, ref } from 'vue'
import { disableAiQqSubscription, fetchAiQqSubscription, saveAiQqSubscription } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface UseAiDrawQqSubscriptionOptions {
  message: MessageApi
}

export function useAiDrawQqSubscription(options: UseAiDrawQqSubscriptionOptions) {
  const qqNumber = ref('')
  const qqSubscription = ref<AiQqSubscription>({ enabled: false })
  const qqSubscriptionLoading = ref(false)
  const qqSubscriptionSaving = ref(false)

  async function loadQqSubscription() {
    qqSubscriptionLoading.value = true
    try {
      const data = unwrapApiData(await fetchAiQqSubscription(), { enabled: false })
      qqSubscription.value = data || { enabled: false }
      qqNumber.value = data?.qqNumber || ''
    }
    catch (error) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载 QQ 订阅失败')
    }
    finally {
      qqSubscriptionLoading.value = false
    }
  }

  async function saveQqSubscription() {
    const normalized = qqNumber.value.trim()
    if (!/^[1-9]\d{4,19}$/.test(normalized)) {
      options.message.warning('请输入 5 到 20 位 QQ 号')
      return
    }
    qqSubscriptionSaving.value = true
    try {
      qqSubscription.value = unwrapApiData(await saveAiQqSubscription({ qqNumber: normalized }), { enabled: true, qqNumber: normalized })
      qqNumber.value = qqSubscription.value.qqNumber || normalized
      options.message.success('QQ 订阅已保存')
    }
    catch (error) {
      showApiError(options.message, error, '保存 QQ 订阅失败')
    }
    finally {
      qqSubscriptionSaving.value = false
    }
  }

  async function disableQqSubscription() {
    qqSubscriptionSaving.value = true
    try {
      qqSubscription.value = unwrapApiData(await disableAiQqSubscription(), { enabled: false, qqNumber: qqNumber.value })
      options.message.success('已取消 QQ 订阅')
    }
    catch (error) {
      showApiError(options.message, error, '取消 QQ 订阅失败')
    }
    finally {
      qqSubscriptionSaving.value = false
    }
  }

  onMounted(loadQqSubscription)

  return {
    disableQqSubscription,
    loadQqSubscription,
    qqNumber,
    qqSubscription,
    qqSubscriptionLoading,
    qqSubscriptionSaving,
    saveQqSubscription,
  }
}
