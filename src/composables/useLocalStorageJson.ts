import { ref, watch, type Ref } from 'vue'

export function readLocalStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}

export function useLocalStorageJson<T>(key: string, fallback: T): Ref<T> {
  const state = ref(readLocalStorageJson(key, fallback)) as Ref<T>

  watch(state, (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage quota or private browsing errors should not break the UI.
    }
  }, { deep: true })

  return state
}
