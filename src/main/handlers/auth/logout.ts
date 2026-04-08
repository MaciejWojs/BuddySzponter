import { refreshTokenCookieSchema } from './../../schemas/authSchemas'
import { LogoutRendererResponse } from '../../../shared/schemas/ipc'
import { API_ROUTES } from '../../apiRoutes'
import { secureStore } from '../../store/secureStore'
import { authStore } from '../../store/localStore'
import { execute } from '../../utils/execute'

export async function logout(): Promise<LogoutRendererResponse> {
  const isRemote = import.meta.env.VITE_WEBRTC_REMOTE === 'true'
  const url = isRemote
    ? `${import.meta.env.VITE_API_BASE_URL}${API_ROUTES.AUTH.LOGOUT}`
    : 'http://localhost/api/v1' + API_ROUTES.AUTH.LOGOUT

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  const refreshToken = secureStore.getSecure('refreshToken')

  if (!refreshToken) {
    return {
      success: false,
      message: 'No refresh token found. User might not be logged in.'
    }
  }

  const parsed = refreshTokenCookieSchema.safeParse({ refreshToken })

  if (!parsed.success) {
    console.error('Refresh token validation failed:', parsed.error)
    secureStore.setSecure('refreshToken', '')
    authStore.set('accessToken', '')
    return {
      success: false,
      message: 'Invalid refresh token format. Local session cleared.'
    }
  }
  const finalData = parsed.data
  const sessionId = secureStore.getSecure('sessionId')
  if (sessionId) {
    requestHeaders['X-session-id'] = sessionId
  }

  requestHeaders['Cookie'] = `refreshToken=${finalData.refreshToken!}; HttpOnly; Path=/; Max-Age=0`

  try {
    const response = await execute(() =>
      fetch(url, {
        method: 'POST',
        headers: requestHeaders
      })
    )

    if (!response.ok) {
      return {
        success: false,
        message: `Logout failed on server. Status: ${response.status}`
      }
    }

    secureStore.setSecure('refreshToken', '')
    authStore.set('accessToken', '')
    return {
      success: true,
      data: undefined,
      message: 'Logged out successfully.'
    }
  } catch (error) {
    console.error('Logout request failed:', error)

    secureStore.setSecure('refreshToken', '')
    authStore.set('accessToken', '')

    return {
      success: false,
      message: 'Network error occurred, but local session was cleared.'
    }
  }
}
