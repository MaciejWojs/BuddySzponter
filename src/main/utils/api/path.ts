export function buildRoute(route: string, params: Record<string, string | number> = {}): string {
  const isRemote = import.meta.env.VITE_WEBRTC_REMOTE === 'true'

  let finalRoute = route
  const remainingParams = { ...params }

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `:${key}`
    if (finalRoute.includes(placeholder)) {
      finalRoute = finalRoute.replace(placeholder, String(value))
      delete remainingParams[key]
    }
  }

  const baseUrl = isRemote
    ? import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1'
    : 'http://localhost/api/v1'

  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanRoute = finalRoute.startsWith('/') ? finalRoute : `/${finalRoute}`

  let fullUrl = `${cleanBaseUrl}${cleanRoute}`

  // 2. Obsługa Query Params (np. ?lang=pl&version=1)
  const queryKeys = Object.keys(remainingParams)
  if (queryKeys.length > 0) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(remainingParams)) {
      searchParams.append(key, String(value))
    }
    fullUrl += `?${searchParams.toString()}`
  }

  return fullUrl
}
