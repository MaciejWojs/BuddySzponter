export function buildRoute(route: string, params: Record<string, string | number> = {}): string {
  let finalRoute = route
  for (const [key, value] of Object.entries(params)) {
    finalRoute = finalRoute.replace(`:${key}`, String(value))
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1'

  const cleanBaseUrl = baseUrl.replace(/\/$/, '')

  const cleanRoute = finalRoute.startsWith('/') ? finalRoute : `/${finalRoute}`

  return `${cleanBaseUrl}${cleanRoute}`
}
