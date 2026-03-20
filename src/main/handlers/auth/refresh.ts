/**
 * auth:refresh
 */

import { authService } from '../../services/AuthService'
import { securePost } from '../../utils/apiClient'
import { API_ROUTES } from '../../apiRoutes'

export async function refresh(): Promise<void> {
  const refreshToken = authService.getRefreshToken()
  if (!refreshToken) {
    console.warn('[AuthService] No refresh token available for refresh operation.')
    return
  }

  try {
    const response = await securePost(API_ROUTES.AUTH.REFRESH, { refreshToken })

    if (response.success && response.data) {
      console.log('[AuthService] Session refreshed successfully.')
      const accessToken = response.data.accessToken
      console.log('[AuthService] New access token received:', accessToken)
    }
  } catch (error) {
    console.error('Error during session refresh:', error)
  }
}
