import { GetLocaleResponse } from '../../../shared/schemas/ipc'
import { API_ROUTES } from '../../apiRoutes'
import { coreService } from '../../services/CoreService'
import { SupportedVersion } from '../../../shared/schemas/ipc'
import { execute } from '../../utils/execute'
import { decryptData } from '../../utils/api/crypt'
import { encryptedPayloadSchema } from '../../schemas/encryptedPayload.schema'
import { TranslationSchema } from '../../../shared/schemas/langSchemas'
import { secureStore } from '../../store/secureStore'
import { translationStore } from '../../store/localStore'
import { app } from 'electron'
import { buildRoute } from '../../utils/api/path'

export async function getLocale(lang: string): Promise<GetLocaleResponse> {
  const version = app.getVersion()

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  const availableLanguages = await coreService.getAvailableLanguages()
  const availableVersions = await coreService.getSupportedVersions()

  const isLanguageAvailable = availableLanguages.includes(lang)

  if (!isLanguageAvailable) {
    return {
      success: false,
      message: `Requested language '${lang}' is not available.`
    }
  }

  const isVersionAvailable = availableVersions.some((v: SupportedVersion) => v.version === version)

  if (!isVersionAvailable) {
    return {
      success: false,
      message: `Requested version '${version}' is not available.`
    }
  }

  try {
    const response = await execute(() => {
      const url = buildRoute(API_ROUTES.CORE.LOCALE, { lang: lang, version: version })
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
      return {
        success: false,
        message: `Failed to fetch locale data for language '${lang}' and version '${version}' from server.`,
        cause: [
          {
            field: response.type,
            error: `${response.status} - ${response.statusText}`
          }
        ]
      }
    }

    let rawData = await response.json()

    const isCrypted = encryptedPayloadSchema.safeParse(rawData)

    if (isCrypted.success) {
      rawData = await decryptData(isCrypted.data)
    }

    const localeData = TranslationSchema.safeParse(rawData)

    if (!localeData.success) {
      console.error('Validation error for locale data:', localeData.error)
      return {
        success: false,
        message: `Received invalid locale data format from server for language '${lang}' and version '${version}'.`
      }
    }

    translationStore.set(lang, localeData.data)

    return {
      success: true,
      data: localeData.data
    }
  } catch (error) {
    console.error('Error fetching locale:', error)
    return {
      success: false,
      message: 'Network error occurred while fetching locale data.'
    }
  }
}
