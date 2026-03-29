import { API_ROUTES } from '../../apiRoutes'
import { secureStore } from '../../store/secureStore'
import { buildRoute } from '../../utils/api/path'
import { withAuth, mock401Response } from '../../utils/api/withAuth' // Zaktualizowany import!
import { UserResponseSchema } from './../../../shared/schemas/user'
import { execute } from '../../utils/execute'
import { authService } from '../../services/AuthService'
import { GetCurrentUserResponse } from '../../../shared/schemas/ipc'
import { APP_ERRORS } from '../../../shared/constants/errors' // Twój nowy słownik błędów
import { decryptData } from '../../utils/api/crypt'

export async function getCurrentUser(): Promise<GetCurrentUserResponse> {
  try {
    const url = buildRoute(API_ROUTES.AUTH.ME)
    const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'

    const response = await withAuth(() => {
      const accessToken = authService.getAccessToken()

      if (!accessToken) {
        console.warn('[getCurrentUser] Tokens missing. Simulating 401')
        return mock401Response(APP_ERRORS.AUTH.TOKEN_MISSING.message)
      }

      const requestHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`
      }

      return execute(() => {
        if (import.meta.env.VITE_ENCRYPT_DATA === 'true') {
          requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
        }
        return fetch(url, { method: 'GET', headers: requestHeaders })
      })
    })

    const responseJson = await response.json()

    const decryptedResponse = isEncryptionEnabled ? await decryptData(responseJson) : responseJson

    if (!response.ok) {
      console.error('[getCurrentUser] API error response:', decryptedResponse)
      if (response.status === 401) {
        return APP_ERRORS.AUTH.UNAUTHORIZED
      }
      return APP_ERRORS.SYSTEM.UNKNOWN
    }

    const parsedUser = UserResponseSchema.safeParse(decryptedResponse)

    if (!parsedUser.success) {
      console.error('[getCurrentUser] Zod validation failed:', parsedUser.error)
      return APP_ERRORS.USER.INVALID_DATA
    }

    return { success: true, data: parsedUser.data }
  } catch (error) {
    console.error('[getCurrentUser] Critical system error:', error)
    return APP_ERRORS.SYSTEM.UNKNOWN
  }
}
