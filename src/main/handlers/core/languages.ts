import { GetAvailableLanguagesResponse } from '../../../shared/schemas/ipc'
import { LanguagesResponseSchema } from '../../../shared/schemas/langSchemas'
import { API_ROUTES } from '../../apiRoutes'
import { encryptedPayloadSchema } from '../../schemas/encryptedPayload.schema'
import { secureStore } from '../../store/secureStore'
import { decryptData } from '../../utils/api/crypt'
import { execute } from '../../utils/execute'

export async function getAvailableLanguages(): Promise<GetAvailableLanguagesResponse> {
  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}${API_ROUTES.CORE.LANGUAGES}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    const response = await execute(() => {
      const sessionId = secureStore.getSecure('sessionId')
      if (sessionId) {
        requestHeaders['X-session-id'] = sessionId
      }

      return fetch(url, {
        method: 'GET',
        headers: requestHeaders
      })
    })
    if (!response.ok) {
      throw new Error(`Server returned error: ${response.status}`)
    }

    const rawData = await response.json()

    const isCrypted = encryptedPayloadSchema.safeParse(rawData)

    let languages: string[] = []

    if (isCrypted.success) {
      const decryptedData = await decryptData(isCrypted.data)
      languages = Array.isArray(decryptedData) ? decryptedData : []
    }

    const parse = LanguagesResponseSchema.safeParse(languages)
    if (!parse.success) {
      return {
        success: false,
        message: 'Invalid languages format from server.'
      }
    }
    return { success: true, data: parse.data }
  } catch {
    return {
      success: false,
      message: `Failed to fetch available languages from server. Please check your connection and try again.`
    }
  }
}
