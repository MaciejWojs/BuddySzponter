import { refreshTokenCookieSchema } from '../../schemas/authSchemas'
import { authService } from '../../services/AuthService'
import { secureStore } from '../../store/secureStore'
import { decryptData, encryptData } from '../../utils/api/crypt'
import { execute } from '../../utils/execute'
import { API_ROUTES } from '../../apiRoutes'
import { encryptedPayloadSchema } from '../../schemas/encryptedPayload.schema'
import { logout } from './logout'

export async function refresh(): Promise<void> {
  const refreshToken = authService.getRefreshToken()

  if (!refreshToken) {
    console.warn('[AuthService] No refresh token available for refresh operation.')
    return
  }

  const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'
  const validPayload = refreshTokenCookieSchema.safeParse({ refreshToken })

  if (!validPayload.success) {
    console.error('[AuthService] Invalid refresh token format:', validPayload.error)
    return
  }

  const payloadData = validPayload.data

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  let requestBody: string

  if (isEncryptionEnabled) {
    const finalPayload = await encryptData(payloadData)
    requestBody = JSON.stringify(finalPayload)
  } else {
    requestBody = JSON.stringify(payloadData)
  }

  try {
    const response = await execute(() => {
      if (isEncryptionEnabled) {
        requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
      }

      const baseURL = import.meta.env.VITE_API_BASE_URL
      const url = `${baseURL}${API_ROUTES.AUTH.REFRESH}`

      return fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
      })
    })

    if (!response.ok) {
      throw new Error(`Server rejected refresh request with status: ${response.status}`)
    }

    const responseData = await response.json()
    let result
    const validResponse = encryptedPayloadSchema.safeParse(responseData)

    if (validResponse.success) {
      result = await decryptData(validResponse.data)
    } else {
      result = responseData
    }

    authService.setAccessToken(result.accessToken)
  } catch (error) {
    console.error('[AuthService] Error during token refresh:', error)
    logout()
  }
}
