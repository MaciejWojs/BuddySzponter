import { API_ROUTES } from '../../apiRoutes'
import { buildRoute } from '../../utils/api/path'
import { decryptData } from '../../utils/api/crypt'
import { execute } from '../../utils/execute'
import { secureStore } from '../../store/secureStore'
import { authService } from '../../services/AuthService'

export async function refresh(): Promise<void> {
  const url = buildRoute(API_ROUTES.AUTH.REFRESH)
  const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'
  const refreshToken = authService.getRefreshToken()

  if (!refreshToken) {
    console.warn('[refresh] No refresh token found. Cannot refresh.')
    throw new Error('No refresh token')
  }

  const response = await execute(() => {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (isEncryptionEnabled) {
      requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
    }

    requestHeaders['Cookie'] = `refreshToken=${refreshToken}`

    return fetch(url, {
      method: 'POST',
      headers: requestHeaders
    })
  })

  if (!response.ok) {
    console.error('[refresh] Token refresh failed with status:', response.status)
    throw new Error('Token refresh failed')
  }

  try {
    const setCookieHeaders = response.headers.getSetCookie()
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      if (!authService.grabRefreshTokenCookie(setCookieHeaders)) {
        console.warn('No refresh token cookie found in response headers.')
      }
    }
  } catch (e) {
    console.warn('Failed to extract refresh token from response headers:', e)
  }

  const result = await response.json()
  const decryptedResult = isEncryptionEnabled ? await decryptData(result) : result

  if (!decryptedResult.accessToken) {
    console.error('[refresh] Invalid token refresh response:', decryptedResult)
    throw new Error('Invalid token refresh response')
  }

  await authService.setAccessToken(decryptedResult.accessToken)
}
