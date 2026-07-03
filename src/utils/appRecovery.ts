const CHUNK_RELOAD_STORAGE_KEY = 'xueliang:chunk-reload-attempted'

function getErrorMessage(error: unknown) {
  if (error instanceof Error)
    return `${error.name}: ${error.message}`
  return String(error ?? '')
}

export function isChunkLoadError(error: unknown) {
  const message = getErrorMessage(error)
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|error loading dynamically imported module/i.test(message)
}

export function reloadOnceForChunkLoadError(error: unknown) {
  if (!isChunkLoadError(error))
    return false

  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY))
      return false
    sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1')
  }
  catch {
    // If storage is unavailable, a single hard reload is still safer than leaving a broken chunk tree.
  }

  window.location.reload()
  return true
}

export function clearChunkLoadReloadFlag() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
  }
  catch {}
}
