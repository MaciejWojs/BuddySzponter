// composables/LanguageService.ts
import type { Ref } from 'vue'
import type { AppLanguage, Translation } from '@shared/schemas/langSchemas'

import { i18n } from '@renderer/i18n'

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
      const savedLang = await window.api.settings.getLanguage()
      const availableLangsRes = await window.api.core.getAvailableLanguages()
      const initialTranslations = await window.api.settings.getTranslation()

      this.selectedLanguageRef.value = savedLang
      this.translationsRef.value = initialTranslations

      if (availableLangsRes?.success && Array.isArray(availableLangsRes.data)) {
        this.availableLanguagesRef.value = availableLangsRes.data
      }

      if (initialTranslations) {
        type I18nMessageType = Parameters<typeof i18n.global.setLocaleMessage>[1]

        i18n.global.setLocaleMessage(savedLang, initialTranslations as unknown as I18nMessageType)
        ;(i18n.global.locale as { value: string }).value = savedLang
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

      if (newTranslations) {
        type I18nMessageType = Parameters<typeof i18n.global.setLocaleMessage>[1]

        i18n.global.setLocaleMessage(lang, newTranslations as unknown as I18nMessageType)
        ;(i18n.global.locale as { value: string }).value = lang
      }
    } catch (error) {
      console.error(`[LanguageService] Error changing language:`, error)
    } finally {
      this.isLoadingTranslationsRef.value = false
    }
  }
}
