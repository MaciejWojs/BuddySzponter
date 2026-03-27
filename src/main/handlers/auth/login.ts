import { API_ROUTES } from '../../apiRoutes'
import { loginPayloadSchema, errorResponseSchema } from '../../schemas/apiResultSchema'
import { LoginInput, loginInputSchema } from '../../schemas/authSchemas'
import { appSettings } from '../../services/SettingsService'
import { secureStore } from '../../store/secureStore'
import { decryptData, encryptData } from '../../utils/api/crypt'
import { execute } from '../../utils/execute'
import { LoginRendererResponse } from '../../../shared/schemas/ipc'
import { authService } from '../../services/AuthService'

export async function login(data: LoginInput): Promise<LoginRendererResponse> {
  try {
    const fingerprint = appSettings.getHardwareId()
    const deviceName = appSettings.getDeviceName()
    const osName = appSettings.getOsName()

    const validPayload = loginInputSchema.parse({
      ...data,
      fingerprint: fingerprint,
      os: osName,
      name: deviceName
    })

    const url = `${import.meta.env.VITE_API_BASE_URL}${API_ROUTES.AUTH.LOGIN}`
    const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    let requestBody: string

    if (isEncryptionEnabled) {
      const finalPayload = await encryptData(validPayload)
      requestBody = JSON.stringify(finalPayload)
      requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
    } else {
      requestBody = JSON.stringify(validPayload)
    }

    const result = await execute(() =>
      fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
      })
    )

    const responseJson = await result.json()

    const decryptedResponse = isEncryptionEnabled ? await decryptData(responseJson) : responseJson

    if (result.ok) {
      try {
        const setCookieHeaders = result.headers.getSetCookie()

        if (!authService.grabRefreshTokenCookie(setCookieHeaders)) {
          console.warn('No refresh token cookie found in response headers.')
        }
      } catch (e) {
        console.warn('Failed to extract refresh token from response headers:', e)
      }
    }

    if (!result.ok) {
      const parsedError = errorResponseSchema.safeParse(decryptedResponse)

      if (parsedError.success) {
        return {
          success: false,
          message: parsedError.data.message,
          cause: parsedError.data.cause
        }
      }

      return {
        success: false,
        message: `HTTP Error: ${result.status} ${result.statusText}`
      }
    }

    const parsedResponse = loginPayloadSchema.parse(decryptedResponse)

    if (parsedResponse.accessToken) {
      console.log('Received access token, saving to auth store.')
      authService.setAccessToken(parsedResponse.accessToken)
    }

    return {
      success: true,
      data: { accessTokenSaved: !!parsedResponse.accessToken },
      message: parsedResponse.message || 'Login successful.'
    }
  } catch (error) {
    console.error('Login failed (Execution/Network/Parse error):', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        message: 'Nieprawidłowe dane logowania (błąd w aplikacji).'
      }
    }

    return {
      success: false,
      message: 'Login failed. Please check your credentials and try again.'
    }
  }
}
