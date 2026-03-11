import { authManager } from '../authManager'
import { API_ROUTES } from '../apiRoutes'
import type { ApiFetchInit, FetchResponse } from '../apiClient'

export function handleAuthTokens(data: unknown, url: string): void {
  if (
    typeof data !== 'object' ||
    data === null ||
    !(url.includes(API_ROUTES.AUTH.LOGIN) || url.includes(API_ROUTES.AUTH.REFRESH))
  ) {
    return
  }

  const respObj = data as Record<string, unknown>
  if (typeof respObj.accessToken === 'string') authManager.setAccessToken(respObj.accessToken)
  if (typeof respObj.refreshToken === 'string') authManager.setRefreshToken(respObj.refreshToken)

  delete respObj.accessToken
  delete respObj.refreshToken
}

export async function handleTokenRefresh<T = unknown>(
  url: string,
  options: ApiFetchInit,
  apiFetch: <R = unknown>(url: string, options: ApiFetchInit) => Promise<FetchResponse<R>>
): Promise<FetchResponse<T> | null> {
  const refreshToken = authManager.getRefreshToken()
  if (!refreshToken) return null

  try {
    // Odświeżanie tokena (nie musi zwracać typu T)
    await apiFetch(API_ROUTES.AUTH.REFRESH, {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    })

    // Ponowienie oryginalnego żądania (zwraca typ T)
    options._retry = true
    return await apiFetch<T>(url, options)
  } catch (refreshError) {
    authManager.clearTokens()
    throw refreshError
  }
}
