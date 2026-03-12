import { z } from 'zod'
import { authManager } from '../authManager'
import { API_ROUTES } from '../apiRoutes'
import type { ApiFetchInit, FetchResponse } from '../apiClient'

const tokensSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional()
})

export function handleAuthTokens(data: unknown, url: string): void {
  if (!(url.includes(API_ROUTES.AUTH.LOGIN) || url.includes(API_ROUTES.AUTH.REFRESH))) {
    return
  }

  const parsed = tokensSchema.safeParse(data)

  if (parsed.success && parsed.data) {
    const { accessToken, refreshToken } = parsed.data

    if (accessToken) authManager.setAccessToken(accessToken)
    if (refreshToken) authManager.setRefreshToken(refreshToken)

    if (typeof data === 'object' && data !== null) {
      const respObj = data as Record<string, unknown>
      delete respObj.accessToken
      delete respObj.refreshToken
    }
  }
}

export async function handleTokenRefresh<T = unknown>(
  url: string,
  options: ApiFetchInit,
  apiFetch: <R = unknown>(url: string, options: ApiFetchInit) => Promise<FetchResponse<R>>
): Promise<FetchResponse<T> | null> {
  const refreshToken = authManager.getRefreshToken()
  if (!refreshToken) return null

  try {
    await apiFetch(API_ROUTES.AUTH.REFRESH, {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    })

    options._retry = true
    return await apiFetch<T>(url, options)
  } catch (refreshError) {
    authManager.clearTokens()
    throw refreshError
  }
}
