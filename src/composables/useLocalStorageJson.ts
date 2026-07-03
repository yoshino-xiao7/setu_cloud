export function readLocalStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  }
  catch {
    try {
      localStorage.removeItem(key)
    }
    catch {}
    return fallback
  }
}
