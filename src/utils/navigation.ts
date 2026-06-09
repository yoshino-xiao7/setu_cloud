import type { RouteLocationRaw, Router } from 'vue-router'
import { isNavigationFailure } from 'vue-router'

function notifyNavigationError(error: unknown) {
  console.error('[Navigation Error]', error)
  window.dispatchEvent(new CustomEvent('global-app-error', {
    detail: { message: '页面跳转失败，请稍后重试' },
  }))
}

async function runNavigation(navigate: () => ReturnType<Router['push']>) {
  try {
    const failure = await navigate()
    if (failure && isNavigationFailure(failure))
      return false
    return true
  }
  catch (error) {
    if (isNavigationFailure(error))
      return false

    notifyNavigationError(error)
    return false
  }
}

export function safePush(router: Router, to: RouteLocationRaw) {
  return runNavigation(() => router.push(to))
}

export function safeReplace(router: Router, to: RouteLocationRaw) {
  return runNavigation(() => router.replace(to))
}
