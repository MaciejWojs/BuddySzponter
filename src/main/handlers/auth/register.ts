import { errorResponseSchema, registerPayloadSchema } from '../../schemas/apiResultSchema'
import { API_ROUTES } from '../../apiRoutes'
import { secureStore } from '../../store/secureStore'
import { encryptData, decryptData } from '../../utils/api/crypt'
import { execute } from '../../utils/execute'
import { RegisterRendererResponse } from '../../../shared/schemas/ipc'
import { buildRoute } from '../../utils/api/path'
import { RegisterRequest } from '../../schemas/authSchemas'

export async function register(data: RegisterRequest): Promise<RegisterRendererResponse> {
  try {
    const url = buildRoute(API_ROUTES.AUTH.REGISTER)
    const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    let requestBody: string
    if (isEncryptionEnabled) {
      requestBody = JSON.stringify(await encryptData(data))
      requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
    } else {
      requestBody = JSON.stringify(data)
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

    if (!result.ok) {
      const parsedError = errorResponseSchema.safeParse(decryptedResponse)

      if (parsedError.success) {
        return {
          success: false,
          message: parsedError.data.message,
          cause: parsedError.data.cause
        }
      }

      // Fallback
      return {
        success: false,
        message: decryptedResponse?.message || `HTTP Error: ${result.status} ${result.statusText}`
      }
    }

    const parsedResponse = registerPayloadSchema.parse(decryptedResponse)

    return {
      success: true,
      message: parsedResponse.message || 'Registration successful.',
      data: undefined
    }
  } catch (error) {
    console.error('Registration failed:', error)
    return {
      success: false,
      message: 'Registration failed. Please try again.'
    }
  }
}
