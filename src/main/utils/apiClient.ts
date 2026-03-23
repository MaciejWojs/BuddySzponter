// src/utils/apiClient.ts
import { secureStore } from '../store/secureStore'
import { encryptPayload } from '../utils/encrypt-payload'
import { decryptPayload } from './decrypt-payload'
import { execute } from './execute'
import { ApiResult, ApiResultSchema, ErrorResponse } from '../schemas/apiResultSchema'
import { authService } from '../services/AuthService'
import { API_ROUTES } from '../apiRoutes'
import { EncryptedPayload } from '../schemas/encryptedPayload.schema'

export async function securePost(route: string, data: object): Promise<ApiResult> {
  const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'

  const key = secureStore.getSecure('aesKey')
  const id = secureStore.getSecure('sessionId')

  let finalData: EncryptedPayload | object = data
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (isEncryptionEnabled) {
    if (!key || !id) {
      throw new Error('No session found. Please complete the handshake first.')
    }

    headers['X-session-id'] = id

    const aesKeyBuffer = Buffer.from(key, 'base64')
    const encrypted = encryptPayload(data, aesKeyBuffer)
    finalData = { payload: encrypted }
  }

  const baseURL = import.meta.env.VITE_API_BASE_URL
  const url = `${baseURL}${route}`

  const accessToken = authService.getAccessToken()
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await execute(async () => {
    return await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(finalData)
    })
  })

  API_ROUTES.AUTH.LOGIN === route && authService.catchRefreshToken(route, response)

  const responseJson = await response.json()

  const decrypted = isEncryptionEnabled && key ? decryptPayload(responseJson, key) : responseJson

  const finalResult: ApiResult = response.ok
    ? { success: true, code: response.status, data: decrypted }
    : {
        success: false,
        code: response.status,
        error: { message: (decrypted as ErrorResponse).message || 'Unknown error' },
        cause: (decrypted as ErrorResponse).cause
      }

  return ApiResultSchema.parse(finalResult)
}
