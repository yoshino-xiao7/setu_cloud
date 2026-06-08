import { onBeforeUnmount } from 'vue'

type GuardedResult<T>
  = | { stale: false, value: T }
    | { stale: true, value?: undefined }

export function useRequestGuard() {
  let requestId = 0
  let active = true

  const next = () => {
    requestId += 1
    return requestId
  }

  const isCurrent = (id: number) => active && id === requestId

  const invalidate = () => {
    requestId += 1
  }

  const run = async <T>(task: () => Promise<T>): Promise<GuardedResult<T>> => {
    const id = next()
    const value = await task()
    if (!isCurrent(id))
      return { stale: true }
    return { stale: false, value }
  }

  onBeforeUnmount(() => {
    active = false
    invalidate()
  })

  return {
    next,
    isCurrent,
    invalidate,
    run
  }
}
