import { ref, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRequestGuard } from './useRequestGuard'

export function useMusicResource<T>(enabled: boolean, fetch: () => Promise<T>) {
  const auth = useAuthStore()
  const guard = useRequestGuard()
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  async function reload() {
    const token = guard.next()
    if (!enabled || !auth.user) {
      data.value = null
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      const result = await fetch()
      if (guard.isCurrent(token))
        data.value = result
    }
    catch (e) {
      if (guard.isCurrent(token))
        error.value = e instanceof Error ? e.message : '加载失败'
    }
    finally {
      if (guard.isCurrent(token))
        loading.value = false
    }
  }
  watch(() => auth.user?.id, () => {
    data.value = null
    void reload()
  }, { immediate: true, flush: 'sync',
  })
  return { data, loading, error, reload }
}
