import { onUnmounted } from 'vue'

export interface VisibilityPollingOptions {
  intervalMs: number
  immediate?: boolean
  refreshOnVisible?: boolean
  pauseWhenHidden?: boolean
}

export function useVisibilityPolling(task: () => void | Promise<void>, options: VisibilityPollingOptions) {
  let timer: number | undefined
  const pauseWhenHidden = options.pauseWhenHidden ?? true

  function runTask() {
    void task()
  }

  function stop() {
    if (timer === undefined)
      return

    window.clearInterval(timer)
    timer = undefined
  }

  function start() {
    if (timer !== undefined)
      stop()

    if (pauseWhenHidden && document.hidden)
      return

    if (options.immediate)
      runTask()

    timer = window.setInterval(runTask, options.intervalMs)
  }

  function handleVisibilityChange() {
    if (!pauseWhenHidden)
      return

    if (document.hidden) {
      stop()
      return
    }

    if (options.refreshOnVisible ?? true)
      runTask()

    start()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stop()
  })

  return { start, stop }
}
