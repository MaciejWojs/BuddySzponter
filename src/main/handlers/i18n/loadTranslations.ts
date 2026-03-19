import { AppLanguage, Translation } from '../../../shared/schemas/langSchemas'
import { API_ROUTES } from '../../apiRoutes'
import { execute } from '../../utils/execute'
import { secureStore } from '../../store/secureStore'
import { decryptPayload } from '../../utils/decrypt-payload'
import { translationStore } from '../../store/translationStore'

export async function loadTranslations(
  lang: AppLanguage
): Promise<{ success: boolean; data?: Translation; error?: string; status?: number }> {
  try {
    const response = await execute(async () => {
      const key = secureStore.getSecure('aesKey')
      const id = secureStore.getSecure('sessionId')

      if (!key || !id) {
        throw new Error('No session found. Please complete the handshake first.')
      }

      const baseURL = import.meta.env.VITE_API_BASE_URL
      const url = `${baseURL}${API_ROUTES.CORE.LOCALE}?lang=${lang}`

      return await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-session-id': id
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.status}`)
    }

    const encryptedJson = await response.json()
    const currentKey = secureStore.getSecure('aesKey')
    const decryptedData = await decryptPayload(encryptedJson, currentKey!)

    translationStore.set(lang, decryptedData as Translation)

    return { success: true, data: decryptedData as Translation }
  } catch (error) {
    console.warn(`[i18n] Network fetch failed for '${lang}', attempting to use local cache...`)

    const cachedTranslation = translationStore.get(lang)

    if (cachedTranslation) {
      console.log(`[i18n] Successfully loaded '${lang}' from local cache.`)
      return { success: true, data: cachedTranslation }
    } else {
      const data = await import(`../../../shared/locales/en.json`).then((module) => module.default)
      if (lang !== 'en') {
        console.warn(
          `[i18n] No cached translation found for '${lang}', falling back to bundled locale.`
        )
        return {
          success: false,
          error: `Failed to load '${lang}' from server and no cache available, using bundled locale.`,
          data
        }
      }
      console.log(`[i18n] Loaded '${lang}' from bundled locales as fallback.`)
      return { success: true, data }
    }

    console.error('Error loading translations and no cache available:', error)
  }
}
