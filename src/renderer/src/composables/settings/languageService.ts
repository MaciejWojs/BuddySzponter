// composables/LanguageService.ts
import type { Ref } from 'vue'
import type { AppLanguage, Translation } from '@shared/schemas/langSchemas'

import { i18n, type AppMessages } from '@renderer/i18n'

const toAppMessages = (value: Translation): AppMessages => value as AppMessages

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const mergeMessages = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base }

  for (const key of Object.keys(override)) {
    const baseValue = result[key]
    const overrideValue = override[key]

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = mergeMessages(baseValue, overrideValue)
      continue
    }

    result[key] = overrideValue
  }

  return result
}

export class LanguageService {
  constructor(
    private selectedLanguageRef: Ref<AppLanguage>,
    private isLoadingTranslationsRef: Ref<boolean>,
    private availableLanguagesRef: Ref<AppLanguage[]>,
    private translationsRef: Ref<Translation | null>
  ) {}

  /**
   * Inicjalizuje stan językowy przy starcie aplikacji.
   */
  public async init(): Promise<void> {
    this.isLoadingTranslationsRef.value = true
    try {
      const [savedLang, availableLangsRes, initialTranslations] = await Promise.all([
        window.api.settings.getLanguage(),
        window.api.core.getAvailableLanguages(),
        window.api.settings.getTranslation()
      ])

      this.selectedLanguageRef.value = savedLang
      this.translationsRef.value = initialTranslations

      if (availableLangsRes?.success && Array.isArray(availableLangsRes.data)) {
        this.availableLanguagesRef.value = availableLangsRes.data
      }

      // Keep bundled locale as base and layer API translations on top.
      if (initialTranslations) {
        i18n.global.setLocaleMessage(savedLang, initialTranslations)
        i18n.global.locale.value = savedLang as unknown as 'en'
      }

      i18n.global.locale.value = savedLang as unknown as 'en'
    } catch (error) {
      console.error('[LanguageService] Failed to initialize:', error)
    } finally {
      this.isLoadingTranslationsRef.value = false
    }
  }

  public async changeLanguage(lang: AppLanguage): Promise<void> {
    if (this.selectedLanguageRef.value === lang) return
    this.isLoadingTranslationsRef.value = true

    try {
      const localeResponse = await window.api.core.getLocale(lang)
      if (localeResponse && localeResponse.success === false) return

      await window.api.settings.setLanguage(lang)
      const newTranslations = await window.api.settings.getTranslation()

      this.selectedLanguageRef.value = lang
      this.translationsRef.value = newTranslations

      i18n.global.setLocaleMessage(lang, newTranslations)
      i18n.global.locale.value = lang as unknown as 'en'
    } catch (error) {
      console.error(`[LanguageService] Error changing language:`, error)
    } finally {
      this.isLoadingTranslationsRef.value = false
    }
  }
}
