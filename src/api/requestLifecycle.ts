type RouteAbortHandler = () => void

let routeAbortHandler: RouteAbortHandler | null = null

export function registerRouteAbortHandler(handler: RouteAbortHandler) {
  routeAbortHandler = handler

  return () => {
    if (routeAbortHandler === handler) {
      routeAbortHandler = null
    }
  }
}

export function abortRouteRequests() {
  routeAbortHandler?.()
}
