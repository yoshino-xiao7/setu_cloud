import { ref } from 'vue'

export function useAsyncState<T>(initialValue: T) {
  const data = ref<T>(initialValue)
  const loading = ref(false)
  const error = ref<unknown>(null)

  const run = async (task: () => Promise<T>) => {
    loading.value = true
    error.value = null
    try {
      data.value = await task()
      return data.value
    } catch (e) {
      error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    run
  }
}
