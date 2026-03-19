// src/utils/apiClient.ts
import { secureStore } from '../store/secureStore'
import { encryptPayload } from '../utils/encrypt-payload'
import { decryptPayload } from './decrypt-payload'
import { execute } from './execute'
import { ApiResult, ApiResultSchema, ErrorResponse } from '../schemas/apiResultSchema'

export async function securePost(route: string, data: object): Promise<ApiResult> {
  const key = secureStore.getSecure('aesKey')
  const id = secureStore.getSecure('sessionId')

  if (!key || !id) {
    throw new Error('No session found. Please complete the handshake first.')
  }

  const baseURL = import.meta.env.VITE_API_BASE_URL
  const url = `${baseURL}${route}`
  const aesKeyBuffer = Buffer.from(key, 'base64')

  const encrypted = encryptPayload(data, aesKeyBuffer)

  const response = await execute(async () => {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-session-id': id
      },
      body: JSON.stringify({ payload: encrypted })
    })
  })

  const encryptedJson = await response.json()

  const decrypted = decryptPayload(encryptedJson, key)

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
