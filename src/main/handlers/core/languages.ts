import { app } from 'electron'
import { GetAvailableLanguagesResponse } from '../../../shared/schemas/ipc'
import { LanguagesResponse, LanguagesResponseSchema } from '../../../shared/schemas/langSchemas'
import { API_ROUTES } from '../../apiRoutes'
import { encryptedPayloadSchema } from '../../schemas/encryptedPayload.schema'
import { secureStore } from '../../store/secureStore'
import { decryptData } from '../../utils/api/crypt'
import { execute } from '../../utils/execute'
import { localStore } from '../../store/localStore'
import { buildRoute } from '../../utils/api/path'

export async function getAvailableLanguages(): Promise<GetAvailableLanguagesResponse> {
  try {
    const version = app.getVersion()
    const url = buildRoute(API_ROUTES.CORE.LANGUAGES, { version: version })

    const requestHeaders: Record<string, string> = {
      accept: 'application/json'
    }

    const response = await execute(() => {
      const sessionId = secureStore.getSecure('sessionId')
      if (sessionId) {
        requestHeaders['X-session-id'] = sessionId
      }

      return fetch(url, {
        headers: requestHeaders
      })
    })

    if (response.status === 404) {
      localStore.set('availableLanguages', [])
      return { success: true, data: [] }
    }

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.status}`)
    }

    const rawData = await response.json()

    const isCrypted = encryptedPayloadSchema.safeParse(rawData)

    let languages: LanguagesResponse = []

    if (isCrypted.success) {
      const decryptedData = await decryptData(isCrypted.data)

      const parseDecrypted = LanguagesResponseSchema.safeParse(decryptedData)
      if (!parseDecrypted.success) {
        console.error('Validation error for decrypted data:', parseDecrypted.error)
        return {
          success: false,
          message: 'Invalid languages format from server after decryption.'
        }
      }
      languages = parseDecrypted.data
    } else {
      const parse = LanguagesResponseSchema.safeParse(rawData)
      if (!parse.success) {
        console.error('Validation error:', parse.error)
        return {
          success: false,
          message: 'Invalid languages format from server.'
        }
      }
      languages = parse.data
    }

    localStore.set('availableLanguages', languages)
    return { success: true, data: languages }
  } catch (error) {
    console.error('Error fetching languages:', error)
    return {
      success: false,
      message: `Failed to fetch available languages from server. Please check your connection and try again.`
    }
  }
}
