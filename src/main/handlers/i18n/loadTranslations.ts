import { AppLanguage, Translation, TranslationSchema } from '../../../shared/schemas/langSchemas'
import { API_ROUTES } from '../../apiRoutes'
import { execute } from '../../utils/execute'
import { secureStore } from '../../store/secureStore'
import { decryptPayload } from '../../utils/decrypt-payload'
import { translationStore } from '../../store/translationStore'

export async function loadTranslations(
  lang: AppLanguage
): Promise<{ success: boolean; data?: Translation; error?: string; status?: number }> {
  try {
    const isDataEncrypted = import.meta.env.VITE_ENCRYPT_DATA === 'true'
    const key = secureStore.getSecure('aesKey')
    const id = secureStore.getSecure('sessionId')

    if (isDataEncrypted && (!key || !id)) {
      throw new Error('No session found. Please complete the handshake first.')
    }

    const response = await execute(async () => {
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const url = `${baseURL}${API_ROUTES.CORE.LOCALE}?lang=${lang}`

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(isDataEncrypted && id ? { 'X-session-id': id } : {})
      }

      return await fetch(url, {
        method: 'GET',
        headers: headers
      })
    })

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.status}`)
    }

    const encryptedJson = await response.json()
    const currentKey = secureStore.getSecure('aesKey')
    const decryptedData = decryptPayload(encryptedJson, currentKey!)

    const finalData =
      isDataEncrypted && key && responseJson.iv ? decryptPayload(responseJson, key) : responseJson

    const validatedData = TranslationSchema.parse(finalData)

    translationStore.set(lang, validatedData)

    return { success: true, data: validatedData }
  } catch (error) {
    console.warn(
      `[i18n] Network/Parse failed for '${lang}', attempting to use local cache...`,
      error
    )

    const cachedTranslation = translationStore.get(lang)

    if (cachedTranslation) {
      console.log(`[i18n] Successfully loaded '${lang}' from local cache.`)
      return { success: true, data: cachedTranslation }
    }

    const data = await import(`../../../shared/locales/en.json`).then((module) => module.default)

    const fallbackData = data as Translation

    if (lang !== 'en') {
      console.warn(
        `[i18n] No cached translation found for '${lang}', falling back to bundled 'en' locale.`
      )
      return {
        success: false,
        error: `Failed to load '${lang}' from server and no cache available, using bundled locale.`,
        data: fallbackData
      }
    }

    console.log(`[i18n] Loaded '${lang}' from bundled locales as fallback.`)
    return { success: true, data: fallbackData }
  }
}
