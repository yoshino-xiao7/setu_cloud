export function readLocalStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}
